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
import {existsSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {chromium} from 'playwright';
import sharp from 'sharp';

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
`;

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const keepPng = args.includes('--keep-png');
const headed = args.includes('--headed');

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
 * Fails a shot whose clipped region shows the seeding admin's username.
 *
 * The output ships inside an Apache-2.0 plugin, so the operator's account must not appear in it.
 * That is easy to violate by accident and hard to notice: channel intros say "created by
 * <admin>", and join messages say "<admin> added you to the channel". Both sit at the top of a
 * channel's history, exactly where a shot of the message list lands by default.
 */
async function assertNoAdminIdentity(page, rect, username, shotId) {
    const text = await visibleTextIn(page, rect);
    if (text.toLowerCase().includes(username.toLowerCase())) {
        throw new Error(
            `${shotId} would show the seeding admin's username ("${username}") in the captured area. ` +
            'Channel intros and join messages name whoever created the channel. Seed more history ' +
            'so they fall out of frame, or clip a region that excludes them.',
        );
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
        return {selectors: [clip], maxHeight: null, all: false};
    }
    if (Array.isArray(clip)) {
        return {selectors: clip, maxHeight: null, all: false};
    }
    const {of, maxHeight = null, all = false} = clip;
    return {selectors: Array.isArray(of) ? of : [of], maxHeight, all};
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
    const {selectors, maxHeight, all} = normalizeClip(clip);

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

    if (maxHeight !== null) {
        height = Math.min(height, maxHeight);
    }

    return {x, y, width, height};
}

function clipShot(page, rect) {
    return page.screenshot({animations: 'disabled', scale: 'device', clip: rect});
}

async function main() {
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
    const {viewer, viewerClient} = await seed(mm, console.log);
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
    };

    const shots = only ? SHOTS.filter((s) => s.id === only) : SHOTS;
    if (!shots.length) {
        fail(only ? `No shot with id "${only}".` : 'Shot list is empty.');
    }

    console.log(`\nCapturing ${shots.length} shot(s)`);
    const written = [];
    const failures = [];

    for (const shot of shots) {
        try {
            await shot.setup(page, ctx);

            // Re-apply after any navigation inside setup.
            await page.addStyleTag({content: DETERMINISM_CSS}).catch(() => {});

            const rect = await resolveClipRect(page, shot.clip);
            await assertNoAdminIdentity(page, rect, mm.me.username, shot.id);

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
            console.log(`  ✓ ${shot.id.padEnd(20)} ${meta.width}x${meta.height}  ${(webp.length / 1024).toFixed(1)}KB`);
        } catch (err) {
            failures.push({id: shot.id, message: err.message.split('\n')[0]});
            console.log(`  ✗ ${shot.id.padEnd(20)} ${err.message.split('\n')[0]}`);

            // A screenshot of the failure state is far more useful than the stack alone.
            await mkdir(path.join(ROOT, 'capture', 'failures'), {recursive: true}).catch(() => {});
            await page.screenshot({path: path.join(ROOT, 'capture', 'failures', `${shot.id}.png`), fullPage: true}).catch(() => {});
        }
    }

    await browser.close();

    // Provenance: captures are accurate to exactly one server version.
    const lockPath = path.join(ROOT, 'capture', 'shots.lock.json');
    const previous = existsSync(lockPath) ? JSON.parse(await readFile(lockPath, 'utf8')) : {};
    const lock = {
        capturedAt: new Date().toISOString(),
        serverVersion: version,
        activePlugins: plugins,
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

main().catch((err) => fail(err.stack || err.message));
