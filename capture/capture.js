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

// import.meta.dirname needs Node 20.11+; derive it so Node 20.9 and 20.10 still work.
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
     * The Drafts card's "now" / "12 minutes ago", which is neither a <time> nor a named timestamp
     * class above. It depends on how long ago the seed last wrote the draft, so drafts-view read
     * "now" on one run and "12 minutes ago" on the next.
     */
    .PanelHeader__timestamp { visibility: hidden !important; }

    /*
     * Boards' "Check out what's new in this version" banner. Dismissing it writes nothing to
     * user preferences, so there is no server-side way to suppress it, and it is a full-width
     * bar that pushes the whole product down whenever it decides to appear. It is not the
     * subject of any shot. The attribute-substring match is deliberate: the class name carries
     * a CSS-module hash.
     */
    [class*='ersionMessage'] { display: none !important; }
`;

/**
 * Incidental state that competes with the subject of a step, hidden by default.
 *
 * Guide art should show the step and nothing else — the guides' author put it as getting "rid of
 * the visual noise of things that aren't necessary for the step that we're teaching about". A
 * sidebar shot about favourites does not need an unread badge on every channel, and a menu shot
 * does not need the "Pinned • Saved" banner of the message behind it.
 *
 * **Hide state, crop structure.** Every rule here turns the screen into one the reader could
 * actually reach — all channels read, no drafts, nothing pinned, no reactions yet. None removes a
 * control, a section or a pane: structure that is not the subject gets cropped out by `clip`,
 * never hidden, so no image shows a product that does not exist.
 *
 * A shot whose subject *is* one of these states opts out with `keep`, e.g. the unreads filter:
 * `keep: ['unreads']`.
 */
const DECLUTTER = {
    /** Unread counts, and the bold white names of unread channels. Matches the read style. */
    unreads: `
        #SidebarContainer .SidebarChannel .badge,
        #SidebarContainer .SidebarChannel .unreadMentions { display: none !important; }
        #SidebarContainer .SidebarLink.unread-title .SidebarChannelLinkLabel,
        #SidebarContainer .SidebarLink.unread-title .icon {
            color: rgba(var(--sidebar-text-rgb), 0.64) !important;
            font-weight: 400 !important;
        }

        /* The quick switcher paints its own copy of the same state. */
        .suggestion-list_unread-mentions .badge { display: none !important; }
        .suggestion-list__unread { font-weight: normal !important; }
    `,

    /** The pencil beside a channel holding a draft, and the Drafts count. */
    drafts: `
        #SidebarContainer .channel-pencil-icon,
        #SidebarContainer .icon-draft-indicator,
        #SidebarContainer .SidebarDrafts .badge,
        #SidebarContainer .SidebarDrafts .unreadMentions { display: none !important; }
    `,

    /** "Pinned • Saved" above a message, and the tint a pinned or saved message gets. */
    postMarks: `
        .post-pre-header { display: none !important; }
        .post.post--pinned-or-flagged { background-color: transparent !important; }
    `,

    /** Emoji reactions under messages. */
    reactions: `
        .post__body-reactions-acks { display: none !important; }
    `,

    /**
     * Day dividers. Never the subject, and they drift: fixture posts keep the date they were
     * first seeded, so a list captured as "Today" reads "Wednesday" a few days later and every
     * shot containing one changes for no reason.
     */
    dates: `
        .Separator.BasicSeparator { display: none !important; }
    `,

    /**
     * Warnings about the *capturing browser*, not the product. Headless Chromium reports
     * notification permission as not granted to the page even when the context grants it, so
     * Settings > Notifications tags Desktop notifications "Permission required" — true of the
     * harness, false of any reader's browser.
     */
    browserWarnings: `
        .section-min__title .Tag--dangerDim { display: none !important; }
    `,

    /**
     * Prompts aimed at the capturing account rather than the reader — "Update your status"
     * beside your own name on your own messages, which appears only while no custom status is
     * set.
     */
    prompts: `
        .post__header-set-custom-status { display: none !important; }
    `,

    /** Hover labels left behind by whatever the setup last clicked or hovered. */
    tooltips: `
        [role='tooltip'], .tooltip { display: none !important; }
    `,

    /** Focus rings left on whatever the setup last clicked. */
    focus: `
        button:focus, button:focus-visible, a:focus-visible, [role='button']:focus-visible,
        .a11y--active, .a11y--focused { outline: none !important; box-shadow: none !important; }
    `,
};

/**
 * Every other timestamp, which is most of them. The webapp's <Timestamp> renders a <time>
 * element (components/timestamp/semantic_time.tsx), and the ones outside the message list are
 * relative — the Threads list says "5 minutes ago", so threads-view diffed on every run until this
 * was hidden. Named classes alone do not cover it.
 *
 * Separate from DETERMINISM_CSS so a shot whose subject *is* a time can keep it: the Schedule
 * message menu reads "Monday at" with nothing after it otherwise. Such a shot changes with the
 * date it is captured on, which is the price of showing it.
 */
const TIME_CSS = `
    time { visibility: hidden !important; }
`;

/** The full stylesheet for one shot: determinism always, declutter less anything it keeps. */
function stylesFor(shot) {
    const keep = new Set(shot.keep || []);
    const rules = Object.entries(DECLUTTER).filter(([name]) => !keep.has(name)).map(([, css]) => css);

    // Per-shot `hide` is for state only, under the same rule as DECLUTTER. `visibility` rather
    // than `display` so hiding it does not move anything the setup has already positioned.
    const hide = (shot.hide || []).map((selector) => `${selector} { visibility: hidden !important; }`);
    return [DETERMINISM_CSS, ...(shot.showTimes ? [] : [TIME_CSS]), ...rules, ...hide].join('\n');
}

/** Fails fast on a typo'd `keep`, which would otherwise silently keep nothing. */
function validateDeclutter(shots) {
    for (const shot of shots) {
        if (shot.scale !== undefined && !(shot.scale > 0 && shot.scale <= 1)) {
            fail(`${shot.id}: scale ${shot.scale} must be in (0, 1]. Art is never enlarged.`);
        }
        for (const name of shot.keep || []) {
            if (!(name in DECLUTTER)) {
                fail(`${shot.id}: unknown keep category "${name}". Known: ${Object.keys(DECLUTTER).join(', ')}`);
            }
        }
    }
}

/**
 * The stylesheet each page is currently wearing.
 *
 * Held per page so the `load` hook re-applies the *current* shot's rules after every navigation.
 * A hook that captured its CSS once would keep re-applying the first shot's `keep` list to every
 * shot after it.
 */
const pageStyles = new WeakMap();

async function applyStyles(page) {
    const css = pageStyles.get(page) ?? DETERMINISM_CSS;
    await page.evaluate((text) => {
        let el = document.getElementById('academy-capture-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'academy-capture-styles';
            (document.head || document.documentElement).appendChild(el);
        }
        el.textContent = text;
    }, css).catch(() => {
        // No document yet; the load hook applies it once there is one.
    });
}

function installStyles(page) {
    page.on('load', () => applyStyles(page));
    return applyStyles(page);
}

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]?.split(',').filter(Boolean);
const guideFilter = args.find((a) => a.startsWith('--guide='))?.split('=')[1];

// An unrecognised flag used to be ignored, so `--guide=x` before it existed quietly ran every
// shot. Reject anything unknown instead.
const KNOWN_FLAGS = ['--only=', '--guide=', '--keep-png', '--headed', '--remote'];
for (const arg of args) {
    if (!KNOWN_FLAGS.some((flag) => (flag.endsWith('=') ? arg.startsWith(flag) : arg === flag))) {
        console.error(`\n✗ Unknown argument "${arg}". Known: ${KNOWN_FLAGS.map((f) => f.replace(/=$/, '=…')).join(' ')}\n`);
        process.exit(1);
    }
}
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
async function assertNoOperatorIdentity(page, regions, adminUsername, shotId) {
    // `regions` is every rectangle whose pixels actually ship: the clip itself, or for an
    // isolated shot the subject's parts, since everything between them is painted over. Checking
    // the whole clip there would reject text that can never appear in the image.
    const texts = [];
    for (const region of [].concat(regions)) {
        texts.push(await visibleTextIn(page, region));
    }
    const text = texts.join('\n').toLowerCase();
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
const CLIP_DEFAULTS = {maxHeight: null, maxWidth: null, all: false, anchor: 'top', align: 'left', isolate: false, pad: null, topOf: null, bottomOf: null, trimTop: 0};

function normalizeClip(clip) {
    if (typeof clip === 'string') {
        return {...CLIP_DEFAULTS, selectors: [clip]};
    }
    if (Array.isArray(clip)) {
        return {...CLIP_DEFAULTS, selectors: clip};
    }
    const {of, ...options} = clip;
    return {...CLIP_DEFAULTS, ...options, selectors: Array.isArray(of) ? of : [of]};
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
async function resolveClip(page, clip) {
    const {selectors, maxHeight, maxWidth, all, anchor, align, isolate, pad: padOption, topOf, bottomOf, trimTop} = normalizeClip(clip);

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

    // A union needs breathing room, to keep a menu's drop shadow. Not always: a union of two
    // sidebar categories has no shadow to keep, and the pad would bring in a strip of the channel
    // beside the sidebar — hence `pad: 0`.
    const pad = padOption ?? (boxes.length > 1 ? UNION_PAD : 0);

    const left = Math.min(...boxes.map((b) => b.x));
    const top = Math.min(...boxes.map((b) => b.y));
    const right = Math.max(...boxes.map((b) => b.x + b.width));
    const bottom = Math.max(...boxes.map((b) => b.y + b.height));

    // Clamp to the viewport; page.screenshot rejects a clip that runs off the page. The page's
    // own size, not VIEWPORT, because a shot can set its own `viewport`.
    const view = page.viewportSize() || VIEWPORT;
    let x = Math.max(0, left - pad);
    let y = Math.max(0, top - pad);
    let width = Math.min(view.width, right + pad) - x;
    let height = Math.min(view.height, bottom + pad) - y;

    // `topOf` crops at another element's top edge, exactly — "the sidebar, from the Projects
    // category down". With `bottomOf`, a tall element can be framed between two of its parts: a
    // category menu beside the sidebar it opened from, the sidebar continuing behind it instead of
    // stopping short at the category's last channel.
    if (topOf) {
        const edge = await page.locator(topOf).first().boundingBox();
        if (!edge) {
            throw new Error(`topOf ${topOf} has no bounding box`);
        }
        const top = Math.max(y, edge.y);
        height = Math.max(1, height - (top - y));
        y = top;
    }

    // `trimTop` drops a fixed strip off the top, for an element whose box starts above where it
    // paints — the Agents page's column begins under 8px of the app's dark frame.
    if (trimTop) {
        y += trimTop;
        height = Math.max(1, height - trimTop);
    }

    // `bottomOf` crops at another element's bottom edge — "the sidebar, down to the end of
    // Favorites". A measured `maxHeight` does the same until a category gains a row.
    if (bottomOf) {
        const edge = await page.locator(bottomOf).first().boundingBox();
        if (!edge) {
            throw new Error(`bottomOf ${bottomOf} has no bounding box`);
        }
        height = Math.max(1, Math.min(height, edge.y + edge.height + pad - y));
    }

    if (maxHeight !== null && height > maxHeight) {
        // `anchor: 'bottom'` keeps the *bottom* of the element and trims the top. Panes that grow
        // upwards from their input — the Agents pane, the thread viewer — put all their content
        // at the bottom of a full-height column, so a top-anchored crop of one photographs empty
        // space. See the framing note in README.md.
        if (anchor === 'bottom') {
            y += height - maxHeight;
        }
        height = maxHeight;
    }

    // `maxWidth` is the horizontal twin: a full-width message row is 1126px of which the text
    // uses 400, and the guide's 840px column would shrink the whole row to fit.
    if (maxWidth !== null && width > maxWidth) {
        if (align === 'right') {
            x += width - maxWidth;
        }
        width = maxWidth;
    }

    return {rect: {x, y, width, height}, parts: boxes, isolate};
}

/**
 * How far past each isolated part's edge to keep real pixels: none. Menus draw their own 1px
 * border inside their box, and even 2px of margin brought in a line of the dark sidebar beside a
 * category menu and flecks of avatars beside the slash-command list.
 */
const ISOLATE_PAD = 0;

/**
 * Keeps only the pixels inside the subject's own elements, on the page's background colour.
 *
 * `clip` crops to a rectangle, and a rectangle around a menu and the thing it opened from always
 * contains whatever the app drew between them — the posts behind a category menu, the file cards
 * behind the composer's AI menu, a slice of the composer under a submenu. None of it is the step.
 * `isolate: true` crops to the subject's outline instead: every pixel of every element in `clip`
 * is the real screenshot, and everything else is the page background. Nothing *inside* the
 * subject changes, so this is cropping by shape, not editing.
 */
async function isolateParts(png, rect, parts, background, partRadii = []) {
    const scale = SCALE;
    const canvasW = Math.round(rect.width * scale);
    const canvasH = Math.round(rect.height * scale);

    const layers = [];
    for (const [index, part] of parts.entries()) {
        const left = Math.max(0, Math.round((part.x - ISOLATE_PAD - rect.x) * scale));
        const top = Math.max(0, Math.round((part.y - ISOLATE_PAD - rect.y) * scale));
        const right = Math.min(canvasW, Math.round((part.x + part.width + ISOLATE_PAD - rect.x) * scale));
        const bottom = Math.min(canvasH, Math.round((part.y + part.height + ISOLATE_PAD - rect.y) * scale));
        if (right <= left || bottom <= top) {
            continue;
        }
        let tile = await sharp(png)
            .extract({left, top, width: right - left, height: bottom - top})
            .png()
            .toBuffer();

        // Each part's own rounded corners, wherever the clip leaves that corner whole: a search
        // box isolated beside its menu otherwise keeps the dark header in its corners.
        const r = partRadii[index];
        if (r) {
            const whole = {
                top: part.y >= rect.y - 0.5,
                bottom: part.y + part.height <= rect.y + rect.height + 0.5,
                left: part.x >= rect.x - 0.5,
                right: part.x + part.width <= rect.x + rect.width + 0.5,
            };
            tile = await maskCorners(tile, {
                tl: whole.top && whole.left ? r.tl : 0,
                tr: whole.top && whole.right ? r.tr : 0,
                br: whole.bottom && whole.right ? r.br : 0,
                bl: whole.bottom && whole.left ? r.bl : 0,
            });
        }
        layers.push({input: tile, left, top});
    }

    return sharp({create: {width: canvasW, height: canvasH, channels: 4, background}})
        .composite(layers)
        .png()
        .toBuffer();
}

/**
 * Waits until every image inside the shipped region has loaded, and fails the shot if one never
 * does.
 *
 * A remote server can be slow to hand over profile pictures, and the shutter does not wait for
 * them: a run-details shot once came back with broken-image glyphs where every participant's
 * avatar should be, and passed every other check. Failing here sends the shot to its retry
 * instead of into the guide.
 */
async function waitForImagesIn(page, regions, shotId, timeout = 20000) {
    const deadline = Date.now() + timeout;
    for (;;) {
        const broken = await page.evaluate((areas) => {
            const overlaps = (r) => areas.some((a) => r.right > a.x && r.left < a.x + a.width && r.bottom > a.y && r.top < a.y + a.height);
            return [...document.images].filter((img) => {
                const r = img.getBoundingClientRect();
                if (!r.width || !r.height || !overlaps(r) || getComputedStyle(img).visibility === 'hidden') {
                    return false;
                }

                // An SVG with no intrinsic size reports naturalWidth 0 even when it drew fine.
                const svg = /\.svg(\?|$)|^data:image\/svg/.test(img.currentSrc || img.src);
                return !img.complete || (img.naturalWidth === 0 && !svg);
            }).map((img) => (img.currentSrc || img.src).slice(0, 120));
        }, [].concat(regions));
        if (!broken.length) {
            return;
        }
        if (Date.now() > deadline) {
            throw new Error(`${shotId}: ${broken.length} image(s) in frame never loaded, e.g. ${broken[0]}`);
        }
        await page.waitForTimeout(500);
    }
}

/**
 * The rectangles an isolated shot actually keeps: each part, padded as `isolateParts` pads it,
 * and cut to the clip. The identity guard reads exactly these, so it checks what ships.
 */
function shippedRegions(rect, parts) {
    return parts.map((part) => {
        const x = Math.max(rect.x, part.x - ISOLATE_PAD);
        const y = Math.max(rect.y, part.y - ISOLATE_PAD);
        const right = Math.min(rect.x + rect.width, part.x + part.width + ISOLATE_PAD);
        const bottom = Math.min(rect.y + rect.height, part.y + part.height + ISOLATE_PAD);
        return {x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y)};
    }).filter((r) => r.width > 0 && r.height > 0);
}

/**
 * The centre channel's background, which is what an isolated subject sits on.
 *
 * Read from the theme variable, not an element's computed background: the obvious containers
 * are transparent (`rgba(0, 0, 0, 0)`), and parsing that as a colour paints the backdrop black.
 */
async function pageBackground(page) {
    const value = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--center-channel-bg').trim())
        .catch(() => '');
    const hex = value.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
        const n = parseInt(hex[1], 16);
        return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1};
    }
    const rgb = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return rgb ? {r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), alpha: 1} : {r: 255, g: 255, b: 255, alpha: 1};
}

/**
 * The border radius at each corner of `rect`, in CSS px, wherever the clip ends exactly on the
 * rounded corner of something — 0 where the corner is square or the clip cuts through.
 *
 * A dialog, the right-hand pane and the composer's frame all have rounded corners, and what shows
 * through outside the curve is whatever is behind them: the dark modal backdrop, the sidebar, the
 * global header. A clip that ends on the element's own corner therefore ships four dark wedges —
 * "black corners" on every modal, in the guides' author's review. The fix is to know the radius
 * and cut it out, which `maskCorners` does.
 *
 * The radius is often on an ancestor rather than the clipped element (the composer's lower corner
 * belongs to the centre column), so this walks up from whatever is painted just inside each
 * corner and takes any element whose own corner sits on the clip's.
 */
async function cornerRadii(page, rect) {
    return page.evaluate((r) => {
        const TOLERANCE = 1.5;

        // Far enough inside the curve to land on the element, not on what is behind it, for any
        // radius up to about 20px.
        const PROBE = 6;
        const corners = {
            tl: {x: r.x, y: r.y, dx: 1, dy: 1, prop: 'borderTopLeftRadius'},
            tr: {x: r.x + r.width, y: r.y, dx: -1, dy: 1, prop: 'borderTopRightRadius'},
            br: {x: r.x + r.width, y: r.y + r.height, dx: -1, dy: -1, prop: 'borderBottomRightRadius'},
            bl: {x: r.x, y: r.y + r.height, dx: 1, dy: -1, prop: 'borderBottomLeftRadius'},
        };
        const out = {};
        for (const [name, c] of Object.entries(corners)) {
            let radius = 0;
            const seen = new Set();
            for (const hit of document.elementsFromPoint(c.x + (c.dx * PROBE), c.y + (c.dy * PROBE))) {
                for (let el = hit; el && !seen.has(el); el = el.parentElement) {
                    seen.add(el);
                    const box = el.getBoundingClientRect();
                    const ex = c.dx > 0 ? box.left : box.right;
                    const ey = c.dy > 0 ? box.top : box.bottom;
                    if (Math.abs(ex - c.x) > TOLERANCE || Math.abs(ey - c.y) > TOLERANCE) {
                        continue;
                    }
                    const value = getComputedStyle(el)[c.prop];
                    const n = parseFloat(value) || 0;
                    radius = Math.max(radius, value.endsWith('%') ? (n / 100) * Math.min(box.width, box.height) : n);
                }
            }
            out[name] = radius;
        }
        return out;
    }, rect);
}

/**
 * Makes everything outside the rounded corners transparent.
 *
 * Transparent rather than painted, so the corner takes the colour of whatever the guide puts
 * behind the image. The curve is cut a device pixel inside the element's own: the browser
 * anti-aliases the element's edge against the dark backdrop, and cutting exactly on that edge
 * leaves a dark hairline along the curve.
 */
async function maskCorners(png, radii) {
    const r = Object.fromEntries(Object.entries(radii).map(([k, v]) => [k, v > 0 ? (v * SCALE) + 1 : 0]));
    if (!r.tl && !r.tr && !r.br && !r.bl) {
        return png;
    }
    const {width: w, height: h} = await sharp(png).metadata();
    const d = [
        `M${r.tl},0`, `H${w - r.tr}`, `A${r.tr},${r.tr} 0 0 1 ${w},${r.tr}`,
        `V${h - r.br}`, `A${r.br},${r.br} 0 0 1 ${w - r.br},${h}`,
        `H${r.bl}`, `A${r.bl},${r.bl} 0 0 1 0,${h - r.bl}`,
        `V${r.tl}`, `A${r.tl},${r.tl} 0 0 1 ${r.tl},0`, 'Z',
    ].join(' ');
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${d}" fill="#fff"/></svg>`);
    return sharp(png).ensureAlpha().composite([{input: mask, blend: 'dest-in'}]).png().toBuffer();
}

/**
 * Shrinks a finished capture to `scale` of its size, for a shot that reads better smaller than
 * true size — a dialog, chiefly. At true size a 600px dialog fills most of the guide's 840px
 * column and dominates the step; the guides' author asked for modals smaller. The file stays at
 * 2x density, so it is still sharp, and the renderer needs to know nothing about it.
 */
async function scaleDown(png, scale) {
    if (!scale || scale === 1) {
        return png;
    }
    const {width} = await sharp(png).metadata();
    return sharp(png).resize({width: Math.round(width * scale), kernel: 'lanczos3'}).png().toBuffer();
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
    const {viewer, viewerClient, team, board, boardViews, resetUnread} = await seed(mm, console.log);
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
    await installStyles(page);

    const ctx = {
        channelURL: (name) => `${SITE_URL}/${TEAM.name}/channels/${name}`,
        teamURL: `${SITE_URL}/${TEAM.name}`,
        siteURL: SITE_URL,

        // For shots that need the seeded unread state. Capturing reads it — see seed.js.
        resetUnread,

        // Boards routes by id, not by name, so these are only knowable after seeding.
        boardsURL: () => `${SITE_URL}/boards/team/${team.id}`,
        // Always to a named view. Boards reopens whichever view was used last, so a bare board URL
        // after the calendar shot opens the calendar, and every Kanban shot after it times out.
        boardURL: (view = 'board') => {
            if (!board) {
                throw new Error('no board fixture — is the focalboard plugin installed and enabled?');
            }
            if (!boardViews[view]) {
                throw new Error(`the fixture board has no ${view} view`);
            }
            return `${SITE_URL}/boards/team/${team.id}/${board.id}/${boardViews[view]}`;
        },
    };


    const shots = selectShots();
    await assertAgentsGateOpen(mm, shots);

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
            await installStyles(adminPage);
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
    let shots = pool;
    if (guideFilter) {
        shots = shots.filter((s) => s.guide === guideFilter);
    }
    if (only) {
        const missing = only.filter((id) => !shots.some((s) => s.id === id));
        if (missing.length) {
            fail(`No ${remote ? 'remote' : 'local'} shot with id ${missing.map((id) => `"${id}"`).join(', ')}` +
                (guideFilter ? ` in guide "${guideFilter}".` : '.'));
        }
        shots = shots.filter((s) => only.includes(s.id));
    }
    if (!shots.length) {
        fail(`No ${remote ? 'remote' : 'local'} shots` + (guideFilter ? ` for guide "${guideFilter}".` : ' in the list.'));
    }
    validateDeclutter(shots);
    return shots;
}

/**
 * Fails fast when AI shots are selected but Agents' licence-gated UI will not render.
 *
 * Agents draws the post-level AI Actions, the channel header's summaries, the New Messages "Ask
 * AI" and a second "Create agent" only when the licence SKU is Entry, Enterprise or Advanced — or
 * when the server has both `EnableTesting` and `EnableDeveloper` on (its webapp's `gi(state)`).
 * Without either, those shots time out one by one on a button that is simply not drawn, which
 * reads as broken selectors rather than a closed gate.
 */
async function assertAgentsGateOpen(mm, shots) {
    if (!shots.some((s) => s.guide === 'ai-quick-start')) {
        return;
    }
    const config = await mm.req('GET', '/config/client?format=old');
    const license = await mm.req('GET', '/license/client?format=old');
    const sku = license?.SkuShortName || '';
    const licensed = ['entry', 'enterprise', 'advanced'].includes(sku);
    const developer = config.EnableTesting === 'true' && config.EnableDeveloper === 'true';
    if (!licensed && !developer) {
        fail(
            'The AI shots need Agents\' licence-gated UI, which this server will not render.\n' +
            '  On a local dev server, turn on the developer override (setup_agents.mjs does this):\n' +
            '    mmctl --local config set ServiceSettings.EnableTesting true\n' +
            '    mmctl --local config set ServiceSettings.EnableDeveloper true\n' +
            `  EnableTesting=${config.EnableTesting}, EnableDeveloper=${config.EnableDeveloper}, licence SKU=${sku || 'none'}`,
        );
    }
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

/**
 * Undoes what a shot's setup wrote, whether or not the shot succeeded.
 *
 * For remote shots that type into a composer: a draft syncs to the server, and that server is
 * someone else's. A teardown failure is reported but does not fail the shot — the image is fine —
 * because the person running the harness needs to know a draft may have been left behind.
 */
async function runTeardown(shot, page, ctx) {
    if (!shot.teardown || !page) {
        return;
    }
    try {
        await shot.teardown(page, ctx);
    } catch (err) {
        console.log(`  ! ${shot.id.padEnd(20)} teardown failed: ${err.message.split('\n')[0]} — check for a leftover draft`);
    }
}

async function runShots(getPage, ctx, shots, adminUsername) {
    const written = [];
    const failures = [];

    for (const shot of shots) {
      for (let attempt = 1; attempt <= SHOT_ATTEMPTS; attempt++) {
        const lastAttempt = attempt === SHOT_ATTEMPTS;
        let page;
        try {
            page = await getPage(shot);

            // A narrower window for shots of the centre channel. At 1440px the centre column is
            // 1126px wide, and the guide's 840px column shrinks it to 0.75x — too small to read.
            await page.setViewportSize(shot.viewport || VIEWPORT);

            // Before setup, not after: hiding a banner once a menu is open moves the message
            // under the menu, and the popover stays where it was anchored.
            pageStyles.set(page, stylesFor(shot));
            await applyStyles(page);
            await shot.setup(page, ctx);

            // Re-apply after any navigation inside setup.
            await applyStyles(page);

            const {rect, parts, isolate} = await resolveClip(page, shot.clip);
            const shipped = isolate ? shippedRegions(rect, parts) : rect;
            await assertNoOperatorIdentity(page, shipped, adminUsername, shot.id);
            await waitForImagesIn(page, shipped, shot.id);

            const radii = await cornerRadii(page, rect);
            let png = await clipShot(page, rect);
            if (isolate) {
                const partRadii = [];
                for (const part of parts) {
                    partRadii.push(await cornerRadii(page, part));
                }
                png = await isolateParts(png, rect, parts, await pageBackground(page), partRadii);
            }
            png = await maskCorners(png, radii);
            png = await scaleDown(png, shot.scale);
            await assertNotBlank(png, shot.id);
            const webp = await sharp(png).webp({quality: 90}).toBuffer();

            const dir = path.join(ASSET_ROOT, shot.guide);
            await mkdir(dir, {recursive: true});
            const file = `${shot.id}.webp`;
            await writeFile(path.join(dir, file), webp);

            // The same screen in another guide — AI search is a module of both the AI guide and
            // Advanced Search. Assets are per guide, so it ships twice rather than being captured
            // twice and drifting apart.
            for (const other of shot.copyTo || []) {
                await mkdir(path.join(ASSET_ROOT, other), {recursive: true});
                await writeFile(path.join(ASSET_ROOT, other, file), webp);
            }
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
            await runTeardown(shot, page, ctx);
            const note = attempt > 1 ? `  (attempt ${attempt})` : '';
            console.log(`  ✓ ${shot.id.padEnd(20)} ${meta.width}x${meta.height}  ${(webp.length / 1024).toFixed(1)}KB${note}`);
            break;
        } catch (err) {
            await runTeardown(shot, page, ctx);
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
        // Merged, because a local run and a remote run each write only their own shots. Two
        // things that makes necessary: entries for shots that no longer exist are dropped, or a
        // renamed shot lingers here forever; and each entry records the server it came from,
        // because the top-level fields describe only the latest run.
        shots: Object.fromEntries(Object.entries({
            ...previous.shots,
            ...Object.fromEntries(written.map((w) => [w.id, {
                guide: w.guide,
                file: w.file,
                width: w.width,
                height: w.height,
                bytes: w.bytes,
                server: remoteHost || 'local',
                serverVersion: version,
            }])),
        }).filter(([id]) => SHOTS.some((shot) => shot.id === id))),
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

    // The token is a personal access token, often a system admin's: never send it in the clear.
    // A typo'd http:// would otherwise hand it to anyone on the path before the first request
    // even fails.
    let remoteURL;
    try {
        remoteURL = new URL(REMOTE_URL);
    } catch {
        fail(`MM_REMOTE_URL is not a URL: "${REMOTE_URL}"`);
    }
    if (remoteURL.protocol !== 'https:') {
        fail('MM_REMOTE_URL must use https:// to protect the access token.');
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
        await installStyles(page);
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
