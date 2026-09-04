// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Capture driver: seed → authenticate the browser → run each shot → clip → convert → write.
 *
 * Run against a LOCAL dev server only. Never point this at a server holding real user content:
 * the output ships inside an Apache-2.0 plugin. See seed.js.
 *
 *   MM_SERVICESETTINGS_SITEURL=http://localhost:8065 \
 *   MM_ADMIN_USERNAME=... MM_ADMIN_PASSWORD=... \
 *   node capture.js [--only=shot-id] [--keep-png] [--headed]
 */

import {mkdir, writeFile, readFile} from 'node:fs/promises';
import os from 'node:os';
import {existsSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {chromium} from 'playwright';
import sharp from 'sharp';

import {startMockLLM} from './fixture_ai.js';
import {MM} from './mm.js';
import {seed, TEAM} from './seed.js';
import {SHOTS} from './shots.js';

// import.meta.dirname needs Node 20.11+; derive it so older Node 18 still works.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ASSET_ROOT = path.join(ROOT, 'public', 'guides', 'assets');

const SITE_URL = process.env.MM_SERVICESETTINGS_SITEURL || 'http://localhost:8065';
const ADMIN_TOKEN = process.env.MM_ADMIN_TOKEN;
const ADMIN_USER = process.env.MM_ADMIN_USERNAME;
const ADMIN_PASS = process.env.MM_ADMIN_PASSWORD;

// One theme for now. Multi-theme capture needs the runtime theme resolver, which lives on the
// scene-media branch — capturing five themes before the renderer can choose between them would
// just add unused binaries.
const THEME = 'denim';

const VIEWPORT = {width: 1440, height: 900};
const SCALE = 2;

// Playwright's bundled Chromium is the default because its version is pinned and reproducible.
// Set PW_CHANNEL=chrome (or msedge) to drive a locally installed browser instead — useful when
// the bundled download is corrupt. Same engine, but the version floats, so it is recorded in
// shots.lock.json.
const CHANNEL = process.env.PW_CHANNEL;

/** Kills anything that would make two runs of the same shot differ. */
const DETERMINISM_CSS = `
    *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
    }
    /* Relative timestamps and presence dots churn between runs. */
    .post__time, .PostTime, .status-wrapper .status { visibility: hidden !important; }

    /*
     * Every other timestamp, which is most of them. The webapp's <Timestamp> renders a <time>
     * element (components/timestamp/semantic_time.tsx), and the ones outside the message list
     * are relative — the Threads list says "5 minutes ago", so threads-view diffed on every
     * run until this was hidden. Named classes alone do not cover it.
     */
    time { visibility: hidden !important; }

    /*
     * Boards' "Check out what's new in this version" banner. Dismissing it writes nothing to
     * user preferences, so there is no server-side way to suppress it, and it is a full-width
     * bar that pushes the whole product down whenever it decides to appear. It is not the
     * subject of any shot. The attribute-substring match is deliberate: the class name carries
     * a CSS-module hash.
     */
    [class*='ersionMessage'] { display: none !important; }
`;

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const keepPng = args.includes('--keep-png');
const headed = args.includes('--headed');

/**
 * Capture from a remote, already-populated server instead of seeding a local one.
 *
 * Some guides cover licensed products — Playbooks will not even start on an unlicensed server —
 * so their art has to come from somewhere that has them. `--remote` points the browser at
 * MM_REMOTE_URL with MM_REMOTE_TOKEN and runs only the shots marked `source: 'remote'`.
 *
 * Seeding is *structurally* impossible in this mode: it lives in the local branch below and is
 * never reached. That matters more than it looks — seed.js creates users, channels and posts,
 * and pointing it at a shared server would write fixture clutter into someone else's workspace.
 */
const remote = args.includes('--remote');
const REMOTE_URL = process.env.MM_REMOTE_URL;
const REMOTE_TOKEN = process.env.MM_REMOTE_TOKEN;

function fail(message) {
    console.error(`\n✗ ${message}\n`);
    process.exit(1);
}

// Padding around a multi-element clip, so the union does not shave the menu's drop shadow.
const UNION_PAD = 8;

/**
 * Minimum per-channel standard deviation for a capture to count as having content.
 *
 * A shot that photographs the webapp's boot placeholder is a flat wash of near-white and
 * reports success like any other, which is how a blank sidebar-overview.webp shipped once.
 * Real UI has text and chrome in it, so its deviation is an order of magnitude above this.
 */
const MIN_STDDEV = 4;

/**
 * The text actually visible inside `rect`, in CSS pixels.
 *
 * Deliberately geometric rather than `innerText`: a scrollable message list holds the whole
 * channel's history in the DOM, so its text includes plenty that is scrolled out of frame and
 * will not appear in the screenshot. Measuring each text node's own rectangle is what makes the
 * difference between "this is in the image" and "this exists on the page somewhere".
 */
async function visibleTextIn(page, rect) {
    return page.evaluate((box) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const out = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.nodeValue?.trim()) {
                continue;
            }
            const range = document.createRange();
            range.selectNodeContents(node);
            const r = range.getBoundingClientRect();
            if (!r.width || !r.height) {
                continue;
            }
            const intersects = r.left < box.x + box.width && r.right > box.x &&
                r.top < box.y + box.height && r.bottom > box.y;
            if (!intersects) {
                continue;
            }

            // Intersecting the rectangle is not the same as being visible in it. A dialog is an
            // overlay: the channel behind it still occupies those coordinates, so without an
            // occlusion test every modal shot trips on the message list underneath. Whatever is
            // painted at the text's midpoint has to be the text itself.
            const cx = Math.min(Math.max(r.left + (r.width / 2), 0), window.innerWidth - 1);
            const cy = Math.min(Math.max(r.top + (r.height / 2), 0), window.innerHeight - 1);
            const topmost = document.elementFromPoint(cx, cy);
            if (topmost && topmost.contains(node)) {
                out.push(node.nodeValue.trim());
            }
        }
        return out.join(' ');
    }, rect);
}

/**
 * Things about the machine running the harness that must never reach a screenshot.
 *
 * The admin username is the obvious one — channel intros say "created by <admin>" and join
 * messages say "<admin> added you to the channel", both at the top of a channel's history where
 * a shot of the message list lands by default.
 *
 * The *hostname* is the less obvious one, and it is why this is a list rather than a single
 * name: About Mattermost prints "Hostname: <your-machine>.local" a few lines under the server
 * version, so a shot aimed at the version number quietly ships the name of the laptop that took
 * it. Both short and fully-qualified forms are checked.
 */
function operatorIdentifiers(adminUsername) {
    const hostname = os.hostname();
    const identifiers = [
        {label: "this machine's hostname", value: hostname},
        {label: "this machine's short hostname", value: hostname.split('.')[0]},
    ];

    // Only for local captures. On a remote server the authenticated account belongs to that
    // server, not to whoever is running the harness, so it is not the operator's identity to
    // protect — and the shared test account is called `admin`, a five-character substring that
    // matches "administrator", "System Console admin", and any playbook named after its owner.
    // Checking it there produces nothing but false positives.
    if (!remote) {
        identifiers.unshift({label: "the seeding admin's username", value: adminUsername});
    }

    return identifiers.filter((i) => i.value && i.value.length > 3);
}

/**
 * Fails a shot whose clipped region shows anything identifying the machine or its operator.
 *
 * The output ships inside an Apache-2.0 plugin, so none of it belongs in the art.
 */
async function assertNoOperatorIdentity(page, rect, adminUsername, shotId) {
    const text = (await visibleTextIn(page, rect)).toLowerCase();
    for (const {label, value} of operatorIdentifiers(adminUsername)) {
        if (text.includes(value.toLowerCase())) {
            throw new Error(
                `${shotId} would show ${label} ("${value}") in the captured area. ` +
                'Clip a region that excludes it, or seed more history so it falls out of frame.',
            );
        }
    }
}

/** Rejects a capture that is a near-uniform wash — almost always the loading screen. */
async function assertNotBlank(png, shotId) {
    const {channels} = await sharp(png).stats();
    const peak = Math.max(...channels.map((c) => c.stdev));
    if (peak < MIN_STDDEV) {
        throw new Error(
            `${shotId} captured a blank image (peak channel stddev ${peak.toFixed(2)} < ${MIN_STDDEV}). ` +
            'The page was almost certainly still on the boot placeholder — settle() needs to wait ' +
            'for something that only exists after the stores hydrate.',
        );
    }
}

/**
 * Resolves the accepted `clip` forms to one shape.
 *
 *   'sel'                               that element's bounding box
 *   ['sel', 'sel']                      the union of their first matches
 *   {of: 'sel' | [...], maxHeight, all} the same, trimmed to `maxHeight` CSS px from the top
 *
 * `all: true` unions *every* match of each selector rather than the first. That is what an open
 * submenu needs: MUI renders the parent menu and the submenu as two sibling popovers, so
 * clipping the first `.MuiPopover-paper` silently drops the submenu — which is usually the whole
 * point of the shot.
 */
function normalizeClip(clip) {
    if (typeof clip === 'string') {
        return {selectors: [clip], maxHeight: null, all: false, anchor: 'top'};
    }
    if (Array.isArray(clip)) {
        return {selectors: clip, maxHeight: null, all: false, anchor: 'top'};
    }
    const {of, maxHeight = null, all = false, anchor = 'top'} = clip;
    return {selectors: Array.isArray(of) ? of : [of], maxHeight, all, anchor};
}

/**
 * Screenshots a shot's `clip`.
 *
 * A single selector clips that element's bounding box, which is the common case and needs no
 * pixel maths. An *array* of selectors clips the union of their boxes instead, which is what
 * open menus require: Mattermost renders them through MuiPopover, so the menu is portalled to
 * <body> and is not a descendant of the sidebar it visually belongs to. Clipping the sidebar
 * alone would silently drop the very thing the shot is about.
 *
 * `maxHeight` exists because the guide caps step art's rendered height (see
 * .academy-step__media in webapp/src/components/app.scss) and scales width to match. A
 * full-height sidebar is mostly empty space below the last channel, and shipping that empty
 * space costs rendered width — the visible content ends up unreadably narrow. Trimming to the
 * content's own extent is what buys the width back.
 */
async function resolveClipRect(page, clip) {
    const {selectors, maxHeight, all, anchor} = normalizeClip(clip);

    const boxes = [];
    for (const selector of selectors) {
        const locator = page.locator(selector);
        await locator.first().waitFor({state: 'visible', timeout: 10000});

        const targets = all ? await locator.all() : [locator.first()];
        for (const target of targets) {
            const box = await target.boundingBox();
            if (box) {
                boxes.push(box);
            } else if (!all) {
                throw new Error(`${selector} is visible but has no bounding box`);
            }
        }
    }

    // A union needs breathing room, to keep a menu's drop shadow.
    const pad = boxes.length > 1 ? UNION_PAD : 0;

    const left = Math.min(...boxes.map((b) => b.x));
    const top = Math.min(...boxes.map((b) => b.y));
    const right = Math.max(...boxes.map((b) => b.x + b.width));
    const bottom = Math.max(...boxes.map((b) => b.y + b.height));

    // Clamp to the viewport; page.screenshot rejects a clip that runs off the page.
    const x = Math.max(0, left - pad);
    const y = Math.max(0, top - pad);
    const width = Math.min(VIEWPORT.width, right + pad) - x;
    let height = Math.min(VIEWPORT.height, bottom + pad) - y;

    if (maxHeight !== null && height > maxHeight) {
        // `anchor: 'bottom'` keeps the *bottom* of the element and trims the top. Panes that grow
        // upwards from their input — the Agents pane, the thread viewer — put all their content
        // at the bottom of a full-height column, so a top-anchored crop of one photographs empty
        // space. See the framing note in README.md.
        if (anchor === 'bottom') {
            return {x, y: y + (height - maxHeight), width, height: maxHeight};
        }
        height = maxHeight;
    }

    return {x, y, width, height};
}

function clipShot(page, rect) {
    return page.screenshot({animations: 'disabled', scale: 'device', clip: rect});
}

async function main() {
    if (remote) {
        return captureRemote();
    }

    if (!ADMIN_TOKEN && !(ADMIN_USER && ADMIN_PASS)) {
        fail(
            'No credentials. Either (preferred) a personal access token:\n' +
            '    export MM_ADMIN_TOKEN=...\n' +
            '  or a username and password:\n' +
            '    export MM_ADMIN_USERNAME=...\n' +
            '    export MM_ADMIN_PASSWORD=...\n' +
            '  The account must be a system admin.',
        );
    }

    // Placeholders and shell-mangled values paste through easily; name the problem rather than
    // failing with a bare 401. `<` in particular is a redirection operator in zsh and bash.
    const placeholder = (v) => typeof v === 'string' && (v.trim() === '' || /^your-|^<|^changeme|^\.\.\.$/i.test(v));
    for (const [name, value] of [['MM_ADMIN_TOKEN', ADMIN_TOKEN], ['MM_ADMIN_USERNAME', ADMIN_USER], ['MM_ADMIN_PASSWORD', ADMIN_PASS]]) {
        if (placeholder(value)) {
            fail(
                `${name} holds a placeholder or empty value ("${value}").\n` +
                '  Do not wrap values in angle brackets — the shell treats < as redirection and\n' +
                '  expands $NAME before the script ever sees it. Assign the bare value.',
            );
        }
    }

    const host = new URL(SITE_URL).hostname;
    if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
        fail(
            `Refusing to capture from ${host}.\n` +
            '  This writes screenshots into a plugin that ships publicly, so it only runs against\n' +
            '  a local server with seeded fixture data. Override deliberately in capture.js if you\n' +
            '  are certain the target holds no real user content.',
        );
    }

    console.log(`\nCapturing from ${SITE_URL}`);

    const mm = new MM(SITE_URL);
    if (ADMIN_TOKEN) {
        await mm.useToken(ADMIN_TOKEN);
        console.log(`  authenticated as @${mm.me.username} (token)`);
    } else {
        await mm.login(ADMIN_USER, ADMIN_PASS);
        console.log(`  authenticated as @${mm.me.username} (password)`);
    }

    if (!mm.me.roles?.includes('system_admin')) {
        fail(`@${mm.me.username} is not a system admin; seeding needs admin rights.`);
    }

    const {version} = await mm.serverVersion();
    const plugins = await mm.activePlugins();

    console.log('\nSeeding fixtures');
    const {viewer, viewerClient, team, board} = await seed(mm, console.log);
    await viewerClient.setTheme(viewer.id, THEME);
    console.log(`  capturing as @${viewer.username} (fixture user, not the admin)`);

    let browser;
    try {
        browser = await chromium.launch({headless: !headed, ...(CHANNEL ? {channel: CHANNEL} : {})});
    } catch (err) {
        const corrupt = /dlopen|no such file|Executable doesn't exist|has been closed/i.test(err.message);
        fail(
            `Could not launch ${CHANNEL || 'the bundled Chromium'}.\n` +
            (corrupt ?
                '  The browser install looks incomplete. Repair it:\n' +
                '    rm -rf ~/Library/Caches/ms-playwright/chromium-*\n' +
                '    npx playwright install --force chromium\n' +
                '  Or drive a locally installed browser instead:\n' +
                '    PW_CHANNEL=chrome make capture\n' :
                '') +
            `\n  Original error: ${err.message.split('\n')[0]}`,
        );
    }
    const browserVersion = browser.version();
    console.log(`  browser ${CHANNEL || 'bundled chromium'} ${browserVersion}`);
    const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        reducedMotion: 'reduce',
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'light',

        // Without this the webapp shows a 40px "We need your permission to show notifications"
        // announcement bar, which pushes the whole app down and makes every sidebar clip 40px
        // shorter. It appears headed but not headless, so leaving it unset means --headed and
        // the default path produce different-sized images from the same shot list.
        permissions: ['notifications'],
    });

    // Authenticate the browser by session cookie — logging in through the UI is slow and flaky.
    // These are the *viewer's* credentials, not the admin's: see CAPTURE_AS in seed.js.
    await context.addCookies([
        {name: 'MMAUTHTOKEN', value: viewerClient.token, domain: host, path: '/', httpOnly: true, sameSite: 'Lax'},
        {name: 'MMUSERID', value: viewer.id, domain: host, path: '/', sameSite: 'Lax'},
    ]);

    // On a fresh browser profile the webapp bounces the first navigation through /landing —
    // the "open this in the Desktop App?" interstitial — and only then returns to the channel.
    // That costs several seconds and makes the first shot race the app's boot. These are the
    // same localStorage keys the interstitial itself writes when you choose "View in Browser"
    // (webapp utils/constants.tsx: LANDING_PAGE_SEEN, LANDING_PREFERENCE).
    await context.addInitScript(([siteURL]) => {
        try {
            window.localStorage.setItem('__landingPageSeen__', 'true');
            window.localStorage.setItem(`__landing-preference__${siteURL}`, 'browser');
        } catch {
            // Private-mode localStorage can throw; the interstitial is only a slowdown.
        }
    }, [SITE_URL]);

    const page = await context.newPage();
    await page.addStyleTag({content: DETERMINISM_CSS}).catch(() => {
        // addStyleTag needs a document; re-applied per navigation below.
    });
    page.on('load', () => page.addStyleTag({content: DETERMINISM_CSS}).catch(() => {}));

    const ctx = {
        channelURL: (name) => `${SITE_URL}/${TEAM.name}/channels/${name}`,
        teamURL: `${SITE_URL}/${TEAM.name}`,
        siteURL: SITE_URL,

        // Boards routes by id, not by name, so these are only knowable after seeding.
        boardsURL: () => `${SITE_URL}/boards/team/${team.id}`,
        boardURL: () => {
            if (!board) {
                throw new Error('no board fixture — is the focalboard plugin installed and enabled?');
            }
            return `${SITE_URL}/boards/team/${team.id}/${board.id}`;
        },
    };


    const shots = selectShots();

    /*
     * The Agents shots need a model to answer them. A live one would answer differently every
     * run, so captures point at a local stub instead — see fixture_ai.js, and setup_agents.mjs
     * for the one-time plugin configuration that aims Agents at it.
     */
    const mock = plugins.includes('mattermost-ai') ? await startMockLLM() : null;
    if (mock) {
        console.log(`  mock LLM on ${mock.url}`);
    }

    /*
     * A second session, for the handful of screens a fixture user cannot reach.
     *
     * Agents 2.7.0 disables "Create agent" for anyone without admin rights, so the create-agent
     * form is unreachable as the viewer — the button renders greyed out and a click never lands.
     * Built lazily: most runs need no admin page, and opening one costs a context and a login.
     *
     * The identity guard is *not* relaxed for these. It still rejects the admin username inside
     * the clip, which is the whole point: an admin-only screen is fine to show, the operator's
     * account name is not.
     */
    let adminContext = null;
    let adminPage = null;
    const getAdminPage = async () => {
        if (!adminPage) {
            adminContext = await browser.newContext({
                viewport: VIEWPORT,
                deviceScaleFactor: SCALE,
                reducedMotion: 'reduce',
                locale: 'en-US',
                timezoneId: 'UTC',
                colorScheme: 'light',
                permissions: ['notifications'],
            });
            await adminContext.addCookies([
                {name: 'MMAUTHTOKEN', value: mm.token, domain: host, path: '/', httpOnly: true, sameSite: 'Lax'},
                {name: 'MMUSERID', value: mm.me.id, domain: host, path: '/', sameSite: 'Lax'},
            ]);
            await adminContext.addInitScript(([siteURL]) => {
                try {
                    window.localStorage.setItem('__landingPageSeen__', 'true');
                    window.localStorage.setItem(`__landing-preference__${siteURL}`, 'browser');
                } catch {
                    // Only a slowdown.
                }
            }, [SITE_URL]);
            adminPage = await adminContext.newPage();
            adminPage.on('load', () => adminPage.addStyleTag({content: DETERMINISM_CSS}).catch(() => {}));
        }
        return adminPage;
    };

    console.log(`\nCapturing ${shots.length} shot(s)`);
    const {written, failures} = await runShots(
        (shot) => (shot.as === 'admin' ? getAdminPage() : page),
        ctx,
        shots,
        mm.me.username,
    );
    await browser.close();
    await mock?.close();
    await writeLock({written, version, plugins, browserVersion});
    report({written, failures, version, plugins});
}

/**
 * Picks the shots for this run.
 *
 * Remote and local shots are mutually exclusive: a shot written against a seeded fixture world
 * cannot find its channels on someone else's server, and a shot written against that server's
 * content has nothing to match locally. `source: 'remote'` is the switch.
 */
function selectShots() {
    const pool = SHOTS.filter((s) => Boolean(s.source === 'remote') === remote);
    const shots = only ? pool.filter((s) => s.id === only) : pool;
    if (!shots.length) {
        fail(only ?
            `No ${remote ? 'remote' : 'local'} shot with id "${only}".` :
            `No ${remote ? 'remote' : 'local'} shots in the list.`);
    }
    return shots;
}

/**
 * How many times to attempt a shot before recording it as failed.
 *
 * Remote captures cross the network to a cloud server that is sometimes slow to hand over a
 * heavy run page, and a shot that timed out on one pass routinely succeeds on the next. This is
 * only about reaching the page — it cannot mask a wrong selector or wrong content, because a
 * genuinely broken shot fails every attempt.
 */
const SHOT_ATTEMPTS = 2;

async function runShots(getPage, ctx, shots, adminUsername) {
    const written = [];
    const failures = [];

    for (const shot of shots) {
      for (let attempt = 1; attempt <= SHOT_ATTEMPTS; attempt++) {
        const lastAttempt = attempt === SHOT_ATTEMPTS;
        let page;
        try {
            page = await getPage(shot);
            await shot.setup(page, ctx);

            // Re-apply after any navigation inside setup.
            await page.addStyleTag({content: DETERMINISM_CSS}).catch(() => {});

            const rect = await resolveClipRect(page, shot.clip);
            await assertNoOperatorIdentity(page, rect, adminUsername, shot.id);

            const png = await clipShot(page, rect);
            await assertNotBlank(png, shot.id);
            const webp = await sharp(png).webp({quality: 90}).toBuffer();

            const dir = path.join(ASSET_ROOT, shot.guide);
            await mkdir(dir, {recursive: true});
            const file = `${shot.id}.webp`;
            await writeFile(path.join(dir, file), webp);
            // Outside the asset tree on purpose. These are a debugging aid, and writing them
            // next to the WebP files puts uncompressed duplicates of every shot into the
            // directory that ships inside the plugin, where they are easy to commit by accident.
            if (keepPng) {
                const pngDir = path.join(ROOT, 'capture', 'png');
                await mkdir(pngDir, {recursive: true});
                await writeFile(path.join(pngDir, `${shot.id}.png`), png);
            }

            const meta = await sharp(webp).metadata();
            written.push({...shot, file, bytes: webp.length, width: meta.width, height: meta.height});
            const note = attempt > 1 ? `  (attempt ${attempt})` : '';
            console.log(`  ✓ ${shot.id.padEnd(20)} ${meta.width}x${meta.height}  ${(webp.length / 1024).toFixed(1)}KB${note}`);
            break;
        } catch (err) {
            const message = err.message.split('\n')[0];
            if (!lastAttempt) {
                console.log(`  … ${shot.id.padEnd(20)} ${message} — retrying`);
                continue;
            }

            failures.push({id: shot.id, message});
            console.log(`  ✗ ${shot.id.padEnd(20)} ${message}`);

            // A screenshot of the failure state is far more useful than the stack alone.
            await mkdir(path.join(ROOT, 'capture', 'failures'), {recursive: true}).catch(() => {});
            await page?.screenshot({path: path.join(ROOT, 'capture', 'failures', `${shot.id}.png`), fullPage: true}).catch(() => {});
        }
      }
    }

    return {written, failures};
}

async function writeLock({written, version, plugins, browserVersion, remoteHost = null}) {
    // Provenance: captures are accurate to exactly one server version.
    const lockPath = path.join(ROOT, 'capture', 'shots.lock.json');
    const previous = existsSync(lockPath) ? JSON.parse(await readFile(lockPath, 'utf8')) : {};
    const lock = {
        capturedAt: new Date().toISOString(),
        serverVersion: version,
        activePlugins: plugins,
        ...(remoteHost ? {remoteHost} : {}),
        browser: `${CHANNEL || 'chromium'} ${browserVersion}`,
        theme: THEME,
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        shots: {
            ...previous.shots,
            ...Object.fromEntries(written.map((w) => [w.id, {
                guide: w.guide,
                file: w.file,
                width: w.width,
                height: w.height,
                bytes: w.bytes,
            }])),
        },
    };
    await writeFile(lockPath, `${JSON.stringify(lock, null, 4)}\n`);
}

function report({written, failures, version, plugins}) {
    const totalKB = written.reduce((a, w) => a + w.bytes, 0) / 1024;
    console.log(`\n${written.length} written, ${failures.length} failed — ${totalKB.toFixed(0)}KB total`);
    console.log(`server ${version}, active plugins: ${plugins.join(', ') || 'none'}`);

    if (written.length) {
        console.log('\nContent snippets for the guide file:\n');
        for (const w of written) {
            console.log(`                    media: {`);
            console.log(`                        type: 'image',`);
            console.log(`                        file: '${w.file}',`);
            console.log(`                        alt: '${w.alt.replace(/'/g, "\\'")}',`);
            console.log(`                    },`);
        }
    }

    if (failures.length) {
        console.log('\nFailure screenshots in capture/failures/. Selectors most likely moved.');
        process.exit(1);
    }
}

/**
 * Captures from a remote, already-populated server.
 *
 * No seeding, by construction — this function never calls seed(), so there is no path by which
 * fixture users, channels or posts can be written into a server we do not own. The shots it
 * runs navigate that server's existing content by name, which is why they carry
 * `source: 'remote'` and are skipped by a normal run.
 *
 * The lock file records the remote host alongside the version, so it is always visible which
 * shots came from where.
 */
async function captureRemote() {
    if (!REMOTE_URL || !REMOTE_TOKEN) {
        fail(
            'Remote capture needs a target and a token:\n' +
            '    export MM_REMOTE_URL=https://your-server.example.com\n' +
            '    export MM_REMOTE_TOKEN=...      # Profile → Security → Personal Access Tokens\n' +
            '  Used for guides covering licensed products, which cannot run on a local\n' +
            '  unlicensed server. Nothing is seeded; the server is only read.',
        );
    }

    const mm = new MM(REMOTE_URL);
    await mm.useToken(REMOTE_TOKEN);
    const {version} = await mm.serverVersion();
    const plugins = await mm.activePlugins();

    const host = new URL(REMOTE_URL).hostname;
    console.log(`\nRemote capture from ${host}`);
    console.log(`  authenticated as @${mm.me.username}`);
    console.log(`  server ${version}`);
    console.log('  seeding skipped — this server is read only');

    let browser;
    try {
        browser = await chromium.launch({headless: !headed, ...(CHANNEL ? {channel: CHANNEL} : {})});
    } catch (err) {
        fail(`Could not launch ${CHANNEL || 'the bundled Chromium'}.\n\n  ${err.message.split('\n')[0]}`);
    }
    const browserVersion = browser.version();

    /**
     * A fresh context and page for every shot.
     *
     * Reusing one page across a long remote run degrades: the first five or six shots land and
     * everything after them times out waiting for content that loaded fine earlier. Each shot
     * navigates a heavy single-page app, and whatever accumulates across those loads — memory,
     * service workers, websocket retries — eventually stops the app booting inside a minute.
     * Discarding the context between shots costs a couple of seconds each and removes the
     * whole class of problem. It also means no shot can inherit an open dialog or a scroll
     * position from the one before it.
     */
    let current = null;
    const getPage = async () => {
        if (current) {
            await current.context().close().catch(() => {});
            current = null;
        }

        const context = await browser.newContext({
            viewport: VIEWPORT,
            deviceScaleFactor: SCALE,
            reducedMotion: 'reduce',
            locale: 'en-US',
            timezoneId: 'UTC',
            colorScheme: 'light',
            permissions: ['notifications'],
        });
        await context.addCookies([
            {name: 'MMAUTHTOKEN', value: mm.token, domain: host, path: '/', httpOnly: true, secure: true, sameSite: 'Lax'},
            {name: 'MMUSERID', value: mm.me.id, domain: host, path: '/', secure: true, sameSite: 'Lax'},
        ]);
        await context.addInitScript(([siteURL]) => {
            try {
                window.localStorage.setItem('__landingPageSeen__', 'true');
                window.localStorage.setItem(`__landing-preference__${siteURL}`, 'browser');
            } catch {
                // Only a slowdown if it throws.
            }
        }, [REMOTE_URL]);

        const page = await context.newPage();
        await page.addStyleTag({content: DETERMINISM_CSS}).catch(() => {});
        page.on('load', () => page.addStyleTag({content: DETERMINISM_CSS}).catch(() => {}));
        current = page;
        return page;
    };

    const ctx = {
        siteURL: REMOTE_URL,
        teamURL: (team) => `${REMOTE_URL}/${team}`,
        channelURL: (team, name) => `${REMOTE_URL}/${team}/channels/${name}`,
        playbooksURL: (path = '') => `${REMOTE_URL}/playbooks${path}`,
    };

    const shots = selectShots();
    console.log(`\nCapturing ${shots.length} shot(s)`);

    // The identity guard still runs. The admin account here is generic, but the check also
    // covers this machine's hostname, which has no business in a screenshot either way.
    const {written, failures} = await runShots(getPage, ctx, shots, mm.me.username);
    await browser.close();
    await writeLock({written, version, plugins, browserVersion, remoteHost: host});
    report({written, failures, version, plugins});
}

main().catch((err) => fail(err.stack || err.message));
