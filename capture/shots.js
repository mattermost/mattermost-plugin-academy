// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Declarative shot list.
 *
 * Each shot names a `clip` locator; Playwright screenshots that element's bounding box, which
 * reproduces tight crops without hand-tuned pixel offsets. `setup` drives the UI into the state
 * the shot needs and should end with the relevant thing visible and settled.
 *
 * Structural selectors here are verified against the Mattermost webapp source, with the file
 * that owns each one noted so the next person can re-check after an upstream bump:
 *   #channel_view                                  channel_layout/channel_controller.tsx
 *   #SidebarContainer                              sidebar/sidebar.tsx — the whole LHS
 *   #sidebar-left                                  sidebar/sidebar_list/sidebar_list.tsx
 *   #browseOrAddChannelMenuButton                  sidebar/sidebar_header/sidebar_browse_or_add_channel_menu.tsx
 *   #browseChannelsMenuItem                        same file
 *   #browseChannelsModal .modal-content            browse_channels/browse_channels.tsx
 *   [data-testid='sidebar-unread-filter-button']   sidebar/channel_filter/channel_filter.tsx
 *   .SidebarChannelGroup / .SidebarMenu_menuButton sidebar/sidebar_category/sidebar_category.tsx
 * Prefer role/text locators for anything a user would click, since those survive refactors.
 *
 * Four traps worth knowing before editing this file:
 *
 * 1. `#sidebar-left` is NOT the sidebar. It is the scrollable channel list only — the team
 *    header, the "+" button and the unreads filter all live in `#lhsNavigator`, a sibling.
 *    Shots that need to show those must clip `#SidebarContainer`.
 * 2. `#browseChannelsModal` is NOT the dialog. It is the full-viewport wrapper, so clipping it
 *    yields a screenshot of the whole app. `.modal-content` is the card.
 * 3. Menus are MuiPopover, so an open menu is portalled to <body> and is not inside the
 *    sidebar. Clipping the sidebar would drop it. Pass an array of selectors to clip the
 *    union of their boxes instead — see clipShot in capture.js.
 * 4. A category's "…" menu button is 0x0 until its *header* is hovered, so clicking it
 *    unhovered just burns the timeout.
 */

import {fixtureFiles} from './fixture_files.js';

/**
 * A narrower window, for shots of the centre channel.
 *
 * At 1440px the centre column is 1126px wide, so a composer or a message row has to shrink to
 * 0.75x to fit the guide's 840px image column — the draft text and toolbar become too small to
 * read. At 1180px the column is close to 840 and the shot lands at about true size. 1180 is still
 * the desktop layout, and a very ordinary laptop window.
 */
const NARROW = {width: 1180, height: 900};

/**
 * How much smaller than true size a dialog ships.
 *
 * At true size a 600px dialog fills most of the guide's 840px column and outweighs the step it
 * illustrates; the guides' author reviewed them as "rendering too large". Three quarters keeps the
 * text readable at 2x density while letting the dialog sit beside the copy rather than over it.
 */
const MODAL_SCALE = 0.75;

/**
 * The search box is a fixed 600px at every window size, so it cannot be cropped narrower — only
 * shown smaller. At three-quarters it sits close to the 400px results-pane shots around it.
 */
const SEARCH_BOX_SCALE = 0.75;

/** The one height the Search Filters shots share, in CSS px before scaling. See search-from-autocomplete. */
const SEARCH_FILTER_HEIGHT = 322;

/**
 * A sidebar category by the name in its header, e.g. "Favorites" or "Direct Messages".
 *
 * The header renders the name uppercased, and categories have no ids — so match the header's
 * text, case-insensitively, rather than the whole group's (every group contains channel names).
 */
function sidebarGroup(page, name) {
    return page.locator('.SidebarChannelGroup').filter({
        has: page.locator('.SidebarChannelGroupHeader', {hasText: new RegExp(`^\\s*${name}`, 'i')}),
    }).first();
}

/**
 * Waits for the channel to be interactive rather than sleeping a fixed time.
 *
 * `#channel_view` is not enough on its own. While the webapp boots it paints a hexagon
 * placeholder, and both `#channel_view` and `#SidebarContainer` are already present and
 * "visible" during it — so waiting on those alone photographs the loading screen and the shot
 * still reports success. Wait for content that only exists once the stores have hydrated.
 */
async function settle(page) {
    await page.waitForSelector('#channel_view', {state: 'visible'});

    // A real channel row in the sidebar, and the composer in the centre pane.
    await page.locator('#SidebarContainer .SidebarChannel').first().waitFor({state: 'visible', timeout: 30000});
    await page.locator('#post-create').waitFor({state: 'visible', timeout: 30000});

    // Then wait out the boot overlay. #initialPageLoadingScreen is a full-viewport div that
    // paints the hexagon pattern *over* the already-mounted app, so the sidebar and composer
    // are present and "visible" underneath while every screenshot comes back as a near-blank
    // wash. Nothing in the DOM below it looks wrong — this is the one that has to be waited
    // on. `hidden` also resolves when the element was never there.
    await page.locator('#initialPageLoadingScreen').waitFor({state: 'hidden', timeout: 30000});

    await page.evaluate(() => document.fonts.ready);
}

/**
 * Lets an opened menu or dialog land before the shutter.
 *
 * DETERMINISM_CSS in capture.js kills transitions, so this is only waiting for the popover to
 * be laid out and measured — not for an animation to play out.
 */
async function settleMenu(page) {
    await page.waitForTimeout(150);
}

/**
 * The post the message-menu and reaction shots act on.
 *
 * Deliberately not the thread root: seed.js pins and saves that one so the Saved messages and
 * pinned-post shots have something to show, and a pinned, saved post's menu reads "Unpin from
 * Channel" and "Remove from Saved" — the exact inverse of the steps being illustrated.
 */
const MENU_POST = 'The staging deployment failed — see thread for details.';

/** The post whose body contains `text`. */
function post(page, text) {
    return page.locator('.post').filter({hasText: text}).first();
}

/**
 * Tags an element so `clip` can name it.
 *
 * Posts get ids only at runtime (`#post_<id>`), so a shot that wants to frame one specific
 * message has no selector to declare up front. Adding a class in `setup` gives the declarative
 * `clip` something stable to point at without teaching it about locators.
 */
const CLIP_TARGET = 'academy-capture-target';

async function markForClip(locator) {
    await locator.evaluate((el, cls) => el.classList.add(cls), CLIP_TARGET);
}

/**
 * Opens a post's "More actions" (…) menu.
 *
 * The menu button only renders on hover, so the hover is not optional. Its test id carries the
 * post id, hence the prefix match rather than an exact one.
 */
async function openPostMenu(page, text) {
    const target = post(page, text);
    await target.scrollIntoViewIfNeeded();
    await target.hover();
    const button = target.locator("[data-testid^='PostDotMenu-Button-']").first();
    await button.waitFor({state: 'visible'});
    await button.click();
    await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible'});
    await settleMenu(page);
    return target;
}

/**
 * Opens the search overlay.
 *
 * `#searchBox` is the overlay itself: a Messages/Files radio pair, the input, and the hint list
 * (`#searchHints`) that turns into an autocomplete once a modifier is typed. Results are a
 * different element entirely — `#searchContainer`, in the right-hand pane.
 */
async function openSearch(page) {
    await page.locator('#searchFormContainer').click();
    await page.locator('#searchBox').waitFor({state: 'visible'});
    await page.waitForTimeout(300);
}

/** Opens search, runs `query`, and waits for results to land. */
async function runSearch(page, query) {
    await openSearch(page);
    await page.keyboard.type(query);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.locator('#search-items-container').waitFor({state: 'visible', timeout: 20000});

    // Park the mouse and drop focus. Submitting the search leaves focus on the results pane's
    // expand button, and its tooltip is triggered by focus as much as hover — it then hangs
    // over the top of the shot, usually clipped to just its arrow, which reads as a rendering
    // glitch. Blurring also removes the focus ring the button would otherwise show.
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    });
    await page.waitForTimeout(1200);
}

/**
 * Opens a board and waits for its cards.
 *
 * Boards is a separate product bundle, so it boots independently of the channels app — the
 * page can be "loaded" with an empty board area for a second or more.
 */
async function settleBoard(page) {
    await page.locator('.BoardComponent').waitFor({state: 'visible', timeout: 40000});
    await page.locator('.KanbanCard, .TableRow').first().waitFor({state: 'visible', timeout: 40000});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
}

/** Clicks a control in the board's view header (Properties, Group by, Filter, Sort). */
/**
 * The view header's controls — Properties through New — without the view selector and the empty
 * spacer to their left. `.ViewHeader` itself spans the whole board, so a union of it and a menu is
 * an 1190px strip about 120px tall: the guide shrinks that to 0.7x, and the small menu that is the
 * point of the shot is lost among half-cut cards.
 */
const VIEW_HEADER_CONTROLS = [
    '.ViewHeader > .MenuWrapper',
    '.ViewHeader > .ModalWrapper',
    '.ViewHeader > .board-search-field',
    '.ViewHeader > .ButtonWithMenu',
];

/** The controls and an open dropdown, isolated from the cards the dropdown falls over. */
function viewHeaderMenuClip(menu) {
    return {of: [...VIEW_HEADER_CONTROLS, menu], all: true, isolate: true};
}

async function boardViewHeaderMenu(page, name) {
    await page.locator('.ViewHeader').getByText(name, {exact: false}).first().click();
    await page.waitForTimeout(700);
}


/** Opens the Settings dialog on a given tab. */
async function openSettings(page, tab) {
    await page.getByRole('button', {name: 'Settings'}).first().click();
    await page.locator('#accountSettingsModal').waitFor({state: 'visible'});
    await page.getByRole('tab', {name: tab}).click();
    await page.waitForTimeout(300);
}

/* ---------------- remote (licensed-product) captures ---------------- */

/**
 * Fixed ids on the maintained test server the Playbooks art comes from.
 *
 * Playbooks will not start on an unlicensed server, so its shots cannot use the seeded fixture
 * world like everything else — they navigate this server's existing content instead, which is
 * why they carry `source: 'remote'`. The content there is synthetic and the server is kept
 * around deliberately, so these are re-capturable; see capture/README.md.
 */
const PB = {
    team: 'cyber-defense-hq',
    runId: '6m1cqkri17g7dga5ac6aq4z5ka',
    runChannel: 'inc-1281-credential-comp',
    playbookId: 'ppsf7kwpg7rjukit1s7ngquhue',
};

/** The channel on the test server whose composer the licensed-messaging shots type into. */
// Not Town Square: there, Playbooks opens its onboarding Tasks pane over the composer's Send button.
const REMOTE_COMPOSER = {team: PB.team, channel: 'off-topic'};

/** Opens the remote composer with a message typed into it. */
async function openRemoteComposer(page, {channelURL}) {
    await page.goto(channelURL(REMOTE_COMPOSER.team, REMOTE_COMPOSER.channel));
    await page.locator('#post-create').waitFor({state: 'visible', timeout: 150000});
    await page.locator('#initialPageLoadingScreen').waitFor({state: 'hidden', timeout: 150000});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2000);

    // Any right-hand pane narrows the composer and can cover its controls.
    const close = page.locator('#sidebar-right').getByRole('button', {name: /close/i}).first();
    if (await close.isVisible().catch(() => false)) {
        await close.click();
        await page.waitForTimeout(800);
    }
    await page.locator('#post-create #post_textbox').fill('The status review moves to Thursday this week.');
    await page.waitForTimeout(500);
}

/** Empties the remote composer, which deletes the draft it saved. */
async function clearRemoteComposer(page) {
    // A page that never loaded never had anything typed into it.
    const box = page.locator('#post-create #post_textbox');
    if (!(await box.isVisible().catch(() => false))) {
        return;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('#post-create #post_textbox').fill('', {timeout: 10000});
    await page.waitForFunction(() => document.querySelector('#post-create #post_textbox')?.value === '', null, {timeout: 10000});

    // Drafts save on a debounce; give the deletion time to reach the server before the context
    // is thrown away.
    await page.waitForTimeout(3000);
}

/** The licensed priority menu: Standard, Important, Urgent, and the toggles below them. */
const PRIORITY_MENU = ".MuiPopover-paper:has-text('Message priority'), [class*='PostPriorityPicker']:has-text('Message priority')";

async function openPriorityMenu(page) {
    // The id appears twice in the composer on this server — the button and a wrapper — so take
    // the first rather than assume it is unique.
    await page.locator('#post-create #messagePriority').first().click();
    await page.locator(PRIORITY_MENU).first().getByText('Request acknowledgement').waitFor({state: 'visible', timeout: 20000});
    await settleMenu(page);
}

/** The switch on a row of the priority menu, found by the row's label. */
function priorityToggle(page, label) {
    return page.locator(PRIORITY_MENU).first().locator('li, [role="menuitem"], [role="menuitemcheckbox"]').filter({hasText: label}).first();
}

/**
 * Opens the Agents pane and waits for it.
 *
 * The app-bar icons on the right edge are `div`s, not buttons, so a role-based locator finds
 * nothing — the plugin id is the stable handle.
 */
async function openAgentsPane(page) {
    await page.locator('#app-bar-icon-mattermost-ai').click();
    await page.locator('#sidebar-right').waitFor({state: 'visible', timeout: 40000});
    await page.waitForTimeout(2500);
    await page.mouse.move(0, 0);
}

/** Asks the agent something and waits for the stub's reply to finish rendering. */
async function askAgent(page, question) {
    const box = page.locator('#sidebar-right').getByPlaceholder(/Ask Agents anything/i).first();
    await box.click();
    await box.fill(question);
    await page.keyboard.press('Enter');

    // fixture_ai.js answers deterministically, so waiting on its text is exact rather than a
    // guess at how long a model takes.
    await page.locator('#sidebar-right').getByText(/Maya reported/).first()
        .waitFor({state: 'visible', timeout: 60000});
    await page.waitForTimeout(1500);
    await page.mouse.move(0, 0);
}

/**
 * Types a draft and opens AI Actions > Rewrite in the centre composer.
 *
 * Opening the Agents pane first is framing, not decoration: it narrows the centre channel from
 * 1142px to 726px, and a 1142px-wide composer has to be scaled to about 60% to fit the guide's
 * image column, at which point neither the draft nor the menu labels can be read.
 *
 * "Rewrite" is a submenu parent — clicking it does nothing, hovering opens the presets.
 */
async function openRewriteMenu(page, url) {
    await page.goto(url);
    await settle(page);
    await openAgentsPane(page);

    // Clear first: drafts sync server-side, so this composer can arrive holding text an earlier
    // shot typed into it.
    await page.locator('#post_textbox').fill('');
    await page.locator('#post_textbox').fill(
        'two notes on the new empty state, the picture fights the button and the words repeat the title',
    );
    await page.waitForTimeout(1200);

    await page.locator('#post-create').getByLabel('AI Actions').click();
    await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible', timeout: 20000});
    await page.getByText('Rewrite', {exact: true}).first().hover();
    await page.locator('.MuiPopover-paper').last().getByText('Improve writing', {exact: true})
        .waitFor({state: 'visible', timeout: 20000});
    await settleMenu(page);
}

/** The Agents plugin's own dropdown menus — not MUI, and emotion-hashed. */
const AI_DROPDOWN = "[class*='StyledDropdownMenu']";

/**
 * Hovers the thread root until its toolbar shows the AI Actions button.
 *
 * The button is the plugin's, rendered into the post's hover toolbar only when the licence gate
 * is satisfied — so waiting on it doubles as a check that the gate is open.
 */
async function hoverForAIActions(page) {
    const row = post(page, 'Deployment checklist is ready for review.');
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    const button = row.locator("[data-testid='ai-actions-menu']").first();
    await button.waitFor({state: 'visible', timeout: 15000});
    return {row, button};
}

/** The Agents product page. */
async function gotoAgentsPage(page, siteURL) {
    await page.goto(`${siteURL}/plug/mattermost-ai/agents`);
    await page.getByText('Agents are AI assistants').waitFor({timeout: 60000});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2500);
    await page.mouse.move(0, 0);
}

/**
 * Waits for the Playbooks product area to finish booting.
 *
 * `#playbooks-backstageRoot` appears long before the run loads, so waiting on it plus a fixed
 * sleep is not enough against a cloud server — pass a selector that only exists once the real
 * content has arrived and wait for that instead.
 */
async function settlePlaybooks(page, anchor) {
    await page.locator('#playbooks-backstageRoot').waitFor({state: 'visible', timeout: 60000});
    if (anchor) {
        await page.locator(anchor).first().waitFor({state: 'visible', timeout: 60000});
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2000);
    await page.mouse.move(0, 0);
}

/**
 * Scrolls `selector` to the top of its scroll container.
 *
 * Playwright's scrollIntoViewIfNeeded waits for the element to be fully in view, which a
 * 2700px-tall checklist section never is — it times out rather than scrolling. This only asks
 * the browser to put the element's top edge at the top, which is what a clip anchored on that
 * element needs anyway.
 */
async function scrollToTop(page, selector, block = 'start') {
    await page.locator(selector).first().evaluate((el, where) => el.scrollIntoView({block: where, behavior: 'instant'}), block);
    await page.waitForTimeout(900);
}

/**
 * Marks the nearest ancestor of `selector` whose height falls in `[min, max]`, for clipping.
 *
 * One checklist group is a distinct container roughly 550px tall, but its class name carries a
 * CSS-module hash that changes between builds. Walking up from a stable test id and picking the
 * ancestor by size gets the same element without depending on that hash.
 */
async function markEnclosing(page, selector, min, max) {
    const found = await page.locator(selector).first().evaluate((el, [cls, lo, hi]) => {
        for (let n = el; n; n = n.parentElement) {
            const h = n.getBoundingClientRect().height;
            if (h >= lo && h <= hi) {
                n.classList.add(cls);
                return true;
            }
        }
        return false;
    }, [CLIP_TARGET, min, max]);
    if (!found) {
        throw new Error(`no ancestor of ${selector} between ${min} and ${max}px tall`);
    }
}

export const SHOTS = [
    /* ================= Collaboration Basics ================= */

    {
        id: 'sidebar-favorites',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The Favorites category at the top of the channel sidebar, holding three favorited channels',

        // The Favorites category and nothing else — the author's note on the first version, which
        // framed the team header and Threads above a single favourite. seed.js favourites three
        // channels, one of them private.
        clip: {of: `.${CLIP_TARGET}`, pad: 0},
        async setup(page, {channelURL}) {
            // A channel outside Favorites, so none of the three carries the selected-channel
            // highlight.
            await page.goto(channelURL('town-square'));
            await settle(page);
            await markForClip(sidebarGroup(page, 'Favorites'));
        },
    },
    {
        id: 'browse-channels',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The Browse Channels dialog, with a Join button on a channel you have not joined yet',

        // #browseChannelsModal is the full-viewport wrapper, not the dialog — clipping it
        // yields a 1440x900 screenshot of the whole app. .modal-content is the card itself,
        // title bar included.
        // Ends after Incident Review rather than through Off-Topic.
        clip: {of: '#browseChannelsModal .modal-content', maxHeight: 432},
        scale: MODAL_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // The "+" in the sidebar header. Its accessible name is "Browse or create
            // channels", not "Add channels" — match on the id, which is a source constant.
            await page.locator('#browseOrAddChannelMenuButton').click();
            await page.locator('#browseChannelsMenuItem').click();
            await page.waitForSelector('#browseChannelsModal', {state: 'visible'});

            // The dialog fetches the channel list after it mounts; capturing on mount alone
            // catches the empty state.
            const modal = page.locator('#browseChannelsModal');
            await modal.getByText('Customer Escalations').waitFor({state: 'visible'});

            // Join only renders on the hovered row. seed.js keeps the viewer out of two public
            // channels so there is a row to join; a list of "Joined" has nothing to teach. This
            // one sorts second, so hovering it does not scroll the list and leave a half row
            // at the top.
            await modal.getByText('Customer Escalations').hover();
            await modal.getByRole('button', {name: /^join$/i}).first().waitFor({state: 'visible', timeout: 10000});
            await settleMenu(page);
        },
    },
    {
        id: 'category-menu',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The options menu of a custom Projects category, with Sort and Mute Category',

        // The sidebar from the category's header down to the bottom of its menu, and the menu,
        // isolated: the menu is wider than the sidebar, and a rectangle around both brings in the
        // posts of the channel behind it. The whole sidebar column rather than just the category,
        // which stopped the sidebar dead at the category's last channel while the menu carried on
        // below it — "cut off sidebar", in review.
        clip: {
            of: ['#SidebarContainer', '.MuiPopover-paper'],
            isolate: true,
            topOf: `.${CLIP_TARGET}`,
            bottomOf: '.MuiPopover-paper',
        },
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // A custom category, from seed.js. Favorites' menu lacks Rename and Delete, and the
            // step is about categories you made.
            const projects = sidebarGroup(page, 'Projects');
            await markForClip(projects);

            // Hover the *header*, not the group. The menu button is laid out only while the
            // header is hovered — unhovered it computes to 0x0, which never becomes
            // actionable, so clicking it just burns the timeout.
            await projects.locator('.SidebarChannelGroupHeader').first().hover();
            const menuButton = projects.locator('.SidebarMenu_menuButton').first();
            await menuButton.waitFor({state: 'visible'});
            await menuButton.click();

            await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    {
        id: 'unreads-filter',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The unreads filter turned on, narrowing the sidebar to channels with unread messages',
        // The filter's whole point is which channels are unread.
        keep: ['unreads'],

        // The toggle sits in the header, outside #sidebar-left, so the header comes too — down
        // to the end of the Unreads group, which is where the filter's effect ends.
        clip: {of: '#SidebarContainer', bottomOf: `.${CLIP_TARGET}`},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // Only rendered when the Unreads *category* is off (channel_navigator.tsx gates it
            // on showUnreadsCategory). seed.js pins that preference so this is deterministic.
            const filter = page.locator("[data-testid='sidebar-unread-filter-button']");
            await filter.waitFor({state: 'visible', timeout: 10000});
            await filter.click();
            await settleMenu(page);
            await markForClip(sidebarGroup(page, 'Unreads'));
        },
    },
    {
        id: 'channel-types',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'Public channels with globe icons, a private channel with a lock icon, a group message, and a direct message',

        // The two categories that carry the three kinds of conversation, and nothing above them.
        clip: {of: `.${CLIP_TARGET}`, all: true, pad: 0},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // The private channel is what makes the lock icon appear, and the group message is the
            // fourth kind; fail loudly rather than shipping a shot that quietly proves nothing.
            await page.locator('#SidebarContainer').getByText('Incident Review').waitFor({state: 'visible'});
            await page.locator('#SidebarContainer').getByText('jordan.reyes, maya.kessler').waitFor({state: 'visible'});
            await markForClip(sidebarGroup(page, 'Channels'));
            await markForClip(sidebarGroup(page, 'Direct Messages'));
        },
    },
    {
        id: 'create-category',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The Create New Category dialog with a name field',
        clip: '#editCategoryModal .modal-content',
        scale: MODAL_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#browseOrAddChannelMenuButton').click();
            await page.locator('#createCategoryMenuItem').click();
            await page.locator('#editCategoryModal').waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },

    {
        id: 'drafts-view',
        guide: 'mattermost-basics',
        module: 'composing',
        alt: 'The Drafts view listing an unsent message and the channel it belongs to',

        // Must run before every shot that types into a composer. Drafts sync to the server, so
        // formatting-toolbar's text becomes a draft too, lands at the top of this list, and
        // pushes the seeded one out of frame. seed.js resets drafts at the start of each run.
        viewport: NARROW,

        // The view's header and the one draft. The rest of #app-content is empty.
        clip: {of: '#app-content', maxHeight: 200},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#SidebarContainer').getByText('Drafts', {exact: true}).click();
            await page.getByText('Two notes on the new empty state').first().waitFor({state: 'visible'});
            await page.waitForTimeout(700);
        },
    },

    {
        id: 'formatting-toolbar',
        guide: 'mattermost-basics',
        module: 'composing',
        alt: 'A message with bold, a list, code and italics written in it, and the pointer on the toolbar\'s Bulleted list button',
        viewport: NARROW,

        // The step names the toolbar's tooltips, and the label is what says which button is which.
        keep: ['tooltips'],

        // The composer and the tooltip above it, isolated: the tooltip rises over the message
        // above the composer. `pad: 0` so the clip ends on the centre column's rounded corners,
        // which is what lets the corner mask find them.
        clip: {of: ['#post-create', '.tooltipContainer'], isolate: true, pad: 0},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // Formatting the reader can see in the text: what the toolbar's buttons write. The
            // message box is plain text, so formatting shows as its Markdown — which is exactly
            // what selecting text and pressing a button produces.
            //
            // Clear first: drafts sync server-side, so the composer can arrive holding text an
            // earlier shot typed into this channel.
            await page.locator('#post_textbox').click();
            await page.locator('#post_textbox').fill('');
            await page.locator('#post_textbox').fill(
                'Two things before **Thursday**:\n- freeze the `release` branch\n- run the _full_ smoke suite',
            );
            await page.waitForTimeout(300);
            // Bulleted list, not Bold: a tooltip is drawn above its button, and Bold's lands on
            // the text it is meant to be illustrating. The list button sits clear of the lines.
            await page.locator('#FormattingControl_ul').hover();
            await page.locator('.tooltipContainer').first().waitFor({state: 'visible', timeout: 10000});
            await settleMenu(page);
        },
    },
    {
        id: 'attach-files',
        guide: 'mattermost-basics',
        module: 'composing',
        alt: 'The message box with three files attached and a message ready to send',
        viewport: NARROW,
        clip: '#post-create',
        async setup(page, {channelURL}) {
            // Not release-train: opening a channel marks it read, and release-train carries the
            // unread "New Messages" line an AI shot needs.
            await page.goto(channelURL('announcements'));
            await settle(page);

            await page.locator('#post_textbox').fill('');
            await page.locator('#post_textbox').fill('Rollback materials for tomorrow morning.');

            // The same invented files the file-search shots find, generated rather than checked
            // in. Setting the hidden input is exactly what the Attachment button's picker does.
            const files = await fixtureFiles();
            await page.locator('#fileUploadInput').setInputFiles(
                files.map((f) => ({name: f.name, mimeType: f.type, buffer: f.buffer})),
            );

            // Previews appear before the upload finishes; wait for all three to settle, then for
            // any progress indicator to go.
            await page.locator('#post-create').getByText('error-rates.png').waitFor({state: 'visible', timeout: 30000});
            await page.locator('#post-create .file-preview__progress, #post-create [class*="progress"]').first()
                .waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
            await page.waitForTimeout(1500);
        },
    },
    {
        id: 'emoji-picker',
        guide: 'mattermost-basics',
        module: 'composing',
        alt: 'The emoji picker open from the emoji icon in the message box',
        viewport: NARROW,

        // The picker and the right-hand end of the message box it opened from — enough to see
        // which icon it belongs to. Isolated, because the posts behind the picker are not the
        // step.
        //
        // `#emojiGifPicker`, not `#emojiPicker`: from the message box the picker comes with
        // Emojis and GIFs tabs, and the tabs are the outer element.
        clip: {of: ['#emojiGifPicker', '#post-create'], isolate: true, maxWidth: 470, align: 'right'},
        async setup(page, {channelURL}) {
            // Not attach-files' channel: drafts sync server-side, attachments included, so sharing
            // one inherits its three files. And one with history — in a near-empty channel the
            // intro ("created by <admin>") runs underneath the picker, and the identity guard
            // cannot tell which of its characters the picker covers.
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#post_textbox').fill('');
            await page.locator('#post_textbox').fill('Booked it for noon ');
            await page.locator('#post-create').getByLabel(/emoji/i).first().click();
            await page.locator('#emojiGifPicker').waitFor({state: 'visible'});
            await page.waitForTimeout(600);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'emoji-reaction',
        guide: 'mattermost-basics',
        module: 'composing',
        alt: 'A message with emoji reactions beneath it, one of them your own',
        // The reactions are the subject.
        keep: ['reactions'],

        // The message and its reactions. A message row is the full centre-column width, and the
        // text uses the left third of it.
        clip: {of: `.${CLIP_TARGET}`, maxWidth: 520},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            const target = post(page, 'Staging is serving traffic again.');
            await target.scrollIntoViewIfNeeded();
            await target.locator('.post__body-reactions-acks').waitFor({state: 'visible'});
            await page.mouse.move(0, 0);
            await page.waitForTimeout(400);
            await markForClip(target);
        },
    },
    {
        id: 'thread-reply',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'The pointer on the Reply button in a message\'s hover toolbar',
        viewport: NARROW,
        keep: ['tooltips'],

        // The step is the button that starts a thread, not the thread it opens. The hovered row
        // and the "Reply" tooltip above it, isolated from the message the tooltip rises over.
        clip: {of: [`.${CLIP_TARGET}`, '.tooltipContainer'], isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // A message with no replies yet, from the screen the channel opens on — the first
            // posts sit beside the channel intro, which names the seeding admin.
            const row = post(page, 'Error rate is back to baseline.');
            await row.hover();
            const reply = row.locator("[id^='CENTER_commentIcon_']").first();
            await reply.waitFor({state: 'visible'});
            await reply.hover();
            await page.locator('.tooltipContainer').first().waitFor({state: 'visible', timeout: 10000});
            await settleMenu(page);
            await markForClip(row);
        },
    },
    {
        id: 'thread-follow',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'A message with its replies collapsed beneath it, and the Following button that toggles the thread',

        // The root post, tagged in setup. Clipping the message list instead would put the channel
        // intro ("created by …") in frame, which names the seeding admin.
        clip: {of: `.${CLIP_TARGET}`, maxWidth: 560},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // The collapsed reply footer lives inside the root post, and carries the Following
            // toggle this step is about.
            const root = post(page, 'Deployment checklist is ready for review.');
            await root.scrollIntoViewIfNeeded();
            await root.getByText('Following', {exact: true}).first().waitFor({state: 'visible'});
            await page.mouse.move(0, 0);
            await page.waitForTimeout(500);
            await markForClip(root);
        },
    },
    {
        id: 'threads-view',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'The Threads view listing followed threads, with one that has unread replies',

        // The list, not the empty "all caught up" pane beside it.
        clip: {of: '.ThreadList', maxHeight: 400},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#SidebarContainer').getByText('Threads', {exact: true}).click();
            await page.locator('.ThreadItem').nth(2).waitFor({state: 'visible', timeout: 15000});
            await page.waitForTimeout(800);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'threads-item-menu',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'A thread\'s menu in the Threads view, with options to mark it read, save it, copy a link, or unfollow it',
        clip: {of: ['.ThreadList', '.MuiPopover-paper'], maxHeight: 400, isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#SidebarContainer').getByText('Threads', {exact: true}).click();
            const item = page.locator('.ThreadItem').filter({hasText: 'tacos or ramen'}).first();
            await item.waitFor({state: 'visible', timeout: 15000});
            await item.hover();

            // The item's own menu lives in `.menu-anchor` (threading/global_threads/thread_item).
            // Not "the last button in the row": that is the author's avatar, which opens a
            // profile card — and selects the thread, reading the very replies this step needs
            // unread.
            await item.locator('.menu-anchor button').first().click();
            await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },

    /* ================= Productivity Tips ================= */

    {
        id: 'quick-switcher',
        guide: 'productivity-tips',
        module: 'keyboard-shortcuts',
        alt: 'The quick switcher open, matching channels as you type',
        // Ends after the sixth match rather than through the seventh.
        clip: {of: '#quickSwitchModal .modal-content', maxHeight: 455},
        scale: MODAL_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.keyboard.press('ControlOrMeta+k');
            await page.locator('#quickSwitchModal').waitFor({state: 'visible'});
            await page.keyboard.type('re');
            await page.waitForTimeout(600);
        },
    },
    {
        id: 'notification-settings',
        guide: 'productivity-tips',
        module: 'notifications',
        alt: 'The Notifications tab of Settings, covering desktop, mobile, and email notifications',

        // The tab and its first three sections, ending on a row boundary. The whole dialog is
        // 740px tall, which would shrink it to two thirds size in the guide.
        clip: {of: '#accountSettingsModal .modal-content', maxHeight: 342},
        scale: MODAL_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSettings(page, 'Notifications');
        },
    },
    {
        id: 'notification-keywords',
        guide: 'productivity-tips',
        module: 'notifications',
        alt: 'The keywords section of notification settings, open for editing, with two keywords added',

        // Only the section being edited — the rest of the dialog is the previous step's shot.
        // The section's own element, from its title to Save and Cancel, with a margin of the
        // dialog around it. The first version clipped the options block inside it instead: no
        // title, the buttons sliced in half, and the dialog's dark edge along the bottom —
        // "framing is too tight", in review. No pad: the section sits on the dialog's bottom edge
        // once scrolled, and any margin below it is the dark backdrop.
        clip: {of: '#accountSettingsModal .section-max'},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSettings(page, 'Notifications');

            await page.getByText('Keywords that trigger notifications').first().click();
            const words = page.getByText(/Other non case-sensitive words/i).first();
            await words.waitFor({state: 'visible'});

            // Keywords in the field, so the step's "separate them with commas or Tab" has
            // something to show. Typed, never saved.
            const field = page.locator('#accountSettingsModal .section-max input[type="text"], #accountSettingsModal .section-max [role="combobox"] input').last();
            await field.click();
            // Single words: the field drops spaces, so "release train" becomes "releasetrain".
            await page.keyboard.type('rollback');
            await page.keyboard.press('Tab');
            await page.keyboard.type('postmortem');
            await page.keyboard.press('Tab');
            await page.waitForTimeout(300);

            // The open section runs below the dialog's fold, so the buttons are off screen until
            // it is scrolled to its end.
            await page.locator('#accountSettingsModal .section-max').evaluate((el) => el.scrollIntoView({block: 'end', behavior: 'instant'}));
            await page.mouse.move(0, 0);
            await page.waitForTimeout(400);
        },
    },
    {
        id: 'channel-notification-preferences',
        guide: 'productivity-tips',
        module: 'notifications',
        alt: 'The Notification Preferences dialog for a single channel, with mute and ignore-mentions options',

        // Down to the end of the desktop notification choices — mute, ignore mentions, and what
        // the channel notifies you about, which is what the step lists first.
        clip: {of: '#channelNotificationModal .modal-content, .ChannelNotificationModal .modal-content', maxHeight: 535},
        scale: MODAL_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#channelHeaderDropdownButton').click();
            await page.getByText('Notification Preferences').first().click();
            await page.waitForTimeout(600);
        },
    },
    {
        id: 'status-menu',
        guide: 'productivity-tips',
        module: 'notifications',
        alt: 'The availability menu open, showing Online, Away, Do Not Disturb, and Offline',
        clip: '.MuiPopover-paper',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // The avatar in the global header — user_account_menu.tsx owns this id.
            await page.locator('#userAccountMenuButton').click();
            await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    {
        id: 'message-priority',
        guide: 'productivity-tips',
        module: 'message-priority',
        alt: 'The message priority menu offering Standard, Important, and Urgent',
        clip: '.MuiPopover-paper',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#post-create').getByLabel(/message priority/i).click();
            await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    {
        id: 'recent-mentions',
        guide: 'productivity-tips',
        module: 'finding-messages-again',
        alt: 'The Recent mentions pane collecting messages that mentioned you',
        clip: {of: '#sidebar-right', maxHeight: 235},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.getByRole('button', {name: 'Recent mentions'}).first().click();
            await page.locator('#sidebar-right').waitFor({state: 'visible'});
            await page.waitForTimeout(900);
        },
    },
    {
        id: 'saved-messages',
        guide: 'productivity-tips',
        module: 'finding-messages-again',
        alt: 'The Saved messages pane listing a message saved for later',

        // #sidebar-right is 850px tall and the one saved result ends around 280, so the rest is
        // empty pane that would cost rendered width.
        clip: {of: '#sidebar-right', maxHeight: 260},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.getByRole('button', {name: 'Saved messages'}).first().click();
            await page.locator('#sidebar-right').waitFor({state: 'visible'});
            await page.waitForTimeout(800);
        },
    },
    {
        id: 'message-actions-menu',
        guide: 'productivity-tips',
        module: 'finding-messages-again',
        alt: 'A message actions menu with Pin to Channel highlighted, alongside Remind and Mark as Unread',
        clip: '.MuiPopover-paper',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openPostMenu(page, MENU_POST);

            // Hovering the item this step names is the one emphasis a real screen can carry.
            await page.locator('.MuiPopover-paper').getByText('Pin to Channel', {exact: true}).hover();
            await settleMenu(page);
        },
    },
    {
        id: 'remind-menu',
        guide: 'productivity-tips',
        module: 'finding-messages-again',
        alt: 'The Remind submenu offering preset times and a custom option',

        // Parent menu and submenu are two sibling popovers, so both have to be in the clip, and
        // isolated: the rectangle around them otherwise carries blank channel and the composer.
        clip: {of: '.MuiPopover-paper', all: true, isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openPostMenu(page, MENU_POST);

            // Hover, never click: the submenu opens on hover, and clicking the parent item
            // dismisses the whole menu (0 popovers left).
            await page.getByText('Remind', {exact: true}).first().hover();
            await page.locator('.MuiPopover-paper').nth(1).waitFor({state: 'visible', timeout: 10000});
            await settleMenu(page);
        },
    },

    /* ================= advanced-search ================= */

    {
        id: 'search-results-tabs',
        guide: 'advanced-search',
        module: 'search-basics',
        alt: 'Search results in the right-hand pane, with Messages and Files tabs showing counts',
        clip: {of: '#searchContainer', maxHeight: 470},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, 'rollback');
        },
    },
    {
        id: 'search-team-picker',
        guide: 'advanced-search',
        module: 'search-basics',
        alt: 'The team picker in the search box, offering All Teams or one of your teams',

        // The search box and the picker's menu, which drops below it. seed.js puts the viewer in a
        // second team: the picker is only drawn for someone in more than one.
        // MUI puts the menu's class on its list, so the paper around it is found by what it holds.
        clip: {of: ['#searchBox', '.MuiPaper-root:has(#searchTeamSelectorMenu)'], isolate: true},
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.locator("[data-testid='searchTeamSelector'] button").first().click();
            await page.locator('#searchTeamSelectorMenu').getByText('All Teams').waitFor({state: 'visible'});
            await page.locator('#searchTeamSelectorMenu').getByText('All Teams').hover();
            await settleMenu(page);
        },
    },
    {
        id: 'search-jump',
        guide: 'advanced-search',
        module: 'search-basics',
        alt: 'A search result with the pointer on its Jump link',

        // One result, with the hover state that brings up Jump.
        clip: {of: '#searchContainer', bottomOf: '#searchContainer .search-item__container'},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, 'snapshot');
            const item = page.locator('#searchContainer .search-item__container').first();
            await item.hover();
            await item.locator('.search-item__jump').first().hover();
            await settleMenu(page);
        },
    },
    {
        id: 'search-from-autocomplete',
        guide: 'advanced-search',
        module: 'search-filters',
        alt: 'Typing from: in the search box, narrowing the list of people as you type',

        // The four Search Filters shots share one frame — the box at three-quarter size, cut at
        // the height of this one, which is the shortest with its list complete. Reviewed as
        // "sizing inconsistency between all the images, lean to smaller": they were 600px wide
        // beside 400px results panes, and anywhere from 280 to 530 tall.
        clip: {of: '#searchBox', maxHeight: SEARCH_FILTER_HEIGHT},
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);

            // A bare `from:` lists every member of the team, which includes the admin account
            // that seeded the server — assertNoAdminIdentity rejects that, correctly. A letter
            // narrows it to the fixture users and shows the type-to-filter behaviour besides.
            await page.keyboard.type('from:m');
            await page.waitForTimeout(900);
        },
    },
    {
        id: 'search-in-autocomplete',
        guide: 'advanced-search',
        module: 'search-filters',
        alt: 'Typing in: in the search box, with a list of channels to choose from',

        // The first few public channels, in the shared Search Filters frame. Never down to
        // DIRECT MESSAGES: that section lists the Agents and Boards bots — seed.js hides their
        // DMs from the sidebar, but they are still channels, so in: still offers them.
        clip: {of: '#searchBox', maxHeight: SEARCH_FILTER_HEIGHT},
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.keyboard.type('in:');
            await page.locator('#searchBox').getByText('~announcements').first().waitFor({state: 'visible'});
            await page.waitForTimeout(500);
        },
    },
    {
        id: 'search-modifiers-combined',
        guide: 'advanced-search',
        module: 'search-filters',
        alt: 'A search that stacks a term with from: and in:, with the channel suggestion for in: showing',

        // The query, not the results. A results list looks the same whatever modifiers made
        // it, so photographing one here showed nothing about stacking them. `in:o` rather than a
        // fuller name, so the suggestion list fills the shared Search Filters frame.
        clip: {of: '#searchBox', maxHeight: SEARCH_FILTER_HEIGHT},
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.keyboard.type('rollback from:maya.kessler in:o');
            await page.locator('#searchBox').getByText('~ops-bridge').first().waitFor({state: 'visible'});
            await page.waitForTimeout(500);
        },
    },
    {
        id: 'search-date-picker',
        guide: 'advanced-search',
        module: 'search-filters',
        alt: 'The date picker that appears after typing before: in the search box',

        // The one Search Filters shot taller than the shared frame: a calendar cut short reads as
        // broken, so the month stays whole.
        clip: '#searchBox',
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.keyboard.type('before:');
            await page.waitForTimeout(900);
        },
    },
    {
        id: 'search-exact-phrase',
        guide: 'advanced-search',
        module: 'precision',
        alt: 'A phrase typed into the search box inside quotation marks',

        // The quotation marks are the step, so the shot is the query as typed. The first version
        // showed the results of it instead, where the quotes appear nowhere — "wrong image", in
        // review.
        clip: '#searchBox',
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.keyboard.type('"rollback plan"');
            await page.waitForTimeout(600);
        },
    },
    {
        id: 'search-hashtag',
        guide: 'advanced-search',
        module: 'precision',
        alt: 'Searching a hashtag, returning every message tagged with it',
        clip: {of: '#searchContainer', maxHeight: 430},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, '#incident4417');
        },
    },
    {
        id: 'search-files-tab',
        guide: 'advanced-search',
        module: 'file-search',
        alt: 'The Files tab of search results, listing matching attachments',

        // Two results end around 250; the pane itself is 850 tall.
        clip: {of: '#searchContainer', maxHeight: 265},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, 'rollback');

            await page.locator('#searchContainer').getByRole('tab', {name: /files/i}).click();
            await page.waitForTimeout(1200);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'search-file-extension',
        guide: 'advanced-search',
        module: 'file-search',
        alt: 'Typing ext: in the Files search, with the extension suggested as you type',

        // Typing the modifier, with the autocomplete offering the extension — what the step
        // describes, and what the author asked for in place of the results it produces.
        clip: '#searchBox',
        scale: SEARCH_BOX_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.locator('#searchBox').getByText('Files', {exact: true}).first().click();

            // Selecting the tab takes focus off the input (Chromium 156 onward), so put it back
            // before typing, or the keystrokes go nowhere.
            await page.locator('#searchBox input').first().focus();
            await page.keyboard.type('ext:pd');
            await page.locator('#searchBox').getByText('(.pdf)', {exact: false}).first().waitFor({state: 'visible'});
            await page.waitForTimeout(500);
        },
    },
    {
        id: 'search-file-type-filter',
        guide: 'advanced-search',
        module: 'file-search',
        alt: 'The file type filter open in the Files tab of search results, with Documents selected',

        // The results header and the filter menu, which drops over the results.
        // The menu fits inside the pane's rectangle, so a plain crop of the pane carries it, down
        // to just below the menu.
        clip: {of: '#searchContainer', maxHeight: 455},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, 'rollback');
            await page.locator('#searchContainer').getByRole('tab', {name: /files/i}).click();
            await page.waitForTimeout(1000);

            // Choose Documents, then open the menu again: the step is the category, chosen, with
            // its check mark and the results it leaves.
            await page.locator('#filesFilterButton').click();
            await page.getByRole('menuitem', {name: 'Documents'}).click();
            await page.waitForTimeout(1200);
            await page.locator('#filesFilterButton').click();
            await page.getByRole('menuitem', {name: 'Documents'}).hover();
            await settleMenu(page);
        },
    },
    {
        id: 'search-channel-files',
        guide: 'advanced-search',
        module: 'file-search',
        alt: 'The Files pane for a channel, listing the files recently shared there',

        // The three files end around 300; the pane is 850 tall.
        clip: {of: '#sidebar-right', maxHeight: 310},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await page.locator('#channel-header').getByLabel(/info/i).first().click();
            await page.locator('#sidebar-right').getByText('Files', {exact: true}).last().click();
            await page.locator('#sidebar-right').getByText('rollback-plan.pdf').waitFor({state: 'visible', timeout: 15000});
            await page.waitForTimeout(900);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'search-recent-mentions',
        guide: 'advanced-search',
        module: 'channels-mentions-saved',
        alt: 'The Recent mentions pane collecting messages that mentioned you',
        clip: {of: '#sidebar-right', maxHeight: 235},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.getByRole('button', {name: 'Recent mentions'}).first().click();
            await page.locator('#sidebar-right').waitFor({state: 'visible'});
            await page.waitForTimeout(900);
        },
    },
    {
        id: 'search-saved-messages',
        guide: 'advanced-search',
        module: 'channels-mentions-saved',
        alt: 'The pointer on the Save icon in a message\'s hover toolbar',
        viewport: NARROW,
        keep: ['tooltips'],

        // "Select the Save icon next to any message": the icon, in the toolbar a hovered message
        // shows, with its label. The hovered row and the tooltip, isolated from the message the
        // tooltip rises over.
        clip: {of: [`.${CLIP_TARGET}`, '.tooltipContainer'], isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            const row = post(page, 'Error rate is back to baseline.');
            await row.hover();
            const save = row.locator("[id^='CENTER_flagIcon_']").first();
            await save.waitFor({state: 'visible'});
            await save.hover();
            await page.locator('.tooltipContainer').first().waitFor({state: 'visible', timeout: 10000});
            await settleMenu(page);
            await markForClip(row);
        },
    },

    /* ================= boards ================= */

    {
        id: 'boards-product-menu',
        guide: 'boards',
        module: 'opening-boards',
        alt: 'The product menu open in the top-left corner, with the pointer on Boards',

        // The menu's button and its list of products, cut after the last product: the edition
        // notice below them is not the step.
        clip: {
            // The list, not `#product-switcher-menu`: that is a zero-height wrapper, never visible.
            of: ['#product_switch_menu', '#product-switcher-menu-dropdown'],
            isolate: true,
            bottomOf: '#product-menu-item-mattermost-ai',
        },
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await page.locator('#product_switch_menu').click();
            await page.locator('#product-menu-item-focalboard').waitFor({state: 'visible'});
            await page.locator('#product-menu-item-focalboard').hover();
            await settleMenu(page);
        },
    },
    {
        id: 'boards-sidebar',
        guide: 'boards',
        module: 'opening-boards',
        alt: 'The Boards sidebar, with five boards filed into Planning and Platform categories',

        // From Find boards down to the end of the Platform category. Below it is the default
        // Boards category, empty once everything is filed — nothing the step needs.
        clip: {of: '.Sidebar', bottomOf: ".SidebarBoardItem:has-text('Sprint 42')"},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'boards-find-boards',
        guide: 'boards',
        module: 'opening-boards',
        alt: 'The Find Boards dialog, matching board names as you type',

        // The dialog down to its last match; the rest of it is empty list.
        clip: {of: '.BoardSwitcherDialog .dialog', bottomOf: '.BoardSwitcherDialog .searchResult >> nth=-1', pad: 0},
        scale: MODAL_SCALE,
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await page.locator('.Sidebar').getByText('Find boards').first().click();
            await page.locator('.BoardSwitcherDialog .dialog').waitFor({state: 'visible'});
            await page.keyboard.type('pla');
            await page.locator('.BoardSwitcherDialog').getByText('Q4 Launch Plan').waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    {
        id: 'boards-template-picker',
        guide: 'boards',
        module: 'create-a-board',
        alt: 'The template picker, listing templates beside a preview of the one selected',

        // The list of templates and the start of the preview beside it. The full picker is
        // 1200px wide; the list, "Create an empty board" and enough of the preview to read are
        // the step, and they end well short of that.
        clip: {of: '.BoardTemplateSelector', maxWidth: 760},
        scale: MODAL_SCALE,
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);

            // Opening the picker writes nothing; only "Use this template" creates a board.
            await page.locator('.Sidebar .add-board-icon').first().click();
            await page.getByText('Create new board', {exact: true}).first().click();
            await page.locator('.BoardTemplateSelector .BoardTemplateSelectorItem').first().waitFor({state: 'visible', timeout: 20000});
            await page.waitForTimeout(2500);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'boards-template-from-board',
        guide: 'boards',
        module: 'create-a-board',
        alt: 'A board\'s options menu in the sidebar, with the pointer on New template from board',

        // The Platform category and the menu, isolated from the board the menu falls over. The
        // sidebar runs on behind the menu rather than stopping at the category's last board.
        clip: {
            of: ['.Sidebar', '.Sidebar .Menu .menu-contents'],
            isolate: true,
            topOf: `.${CLIP_TARGET}`,
            bottomOf: '.Sidebar .Menu .menu-contents',
        },
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);

            const item = page.locator('.SidebarBoardItem').filter({hasText: 'Bug Triage'}).first();
            await markForClip(page.locator('.SidebarCategory').filter({hasText: 'Bug Triage'}).first());
            await item.hover();
            await item.locator('.MenuWrapper').last().click();
            await page.getByText('New template from board').first().hover();
            await settleMenu(page);
        },
    },
    {
        id: 'boards-kanban',
        guide: 'boards',
        module: 'cards-and-properties',
        alt: 'A board in the Kanban layout, with cards grouped into Backlog, In progress, and In review columns',

        // The board's first three columns. The whole board is 1190px wide, which the guide would
        // shrink to 0.7x; the title, the view header and three columns carry the step.
        clip: {of: '.BoardComponent', maxHeight: 520, maxWidth: 840},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
        },
    },
    {
        id: 'boards-card-detail',
        guide: 'boards',
        module: 'cards-and-properties',
        alt: 'A card\'s description built from blocks: text, a divider, a heading, and checkboxes',

        // The description and nothing above it. "Write the description" names Text, Divider and
        // Checkbox blocks, and seed.js builds this card's description from all three.
        // `.octo-content` is the blocks themselves, without the Add content row under them.
        clip: {of: '.Dialog .CardDetail.content-blocks .octo-content', pad: 8},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);

            await page.locator('.KanbanCard').filter({hasText: 'Rewrite the deploy pipeline'}).first().click();
            await page.locator('.Dialog').waitFor({state: 'visible', timeout: 20000});
            // Six blocks. A checkbox's label is an editable value, not page text, so wait on the
            // blocks rather than on what they say.
            const blocks = page.locator('.Dialog .CardDetail.content-blocks');
            await blocks.locator('.ContentBlock').nth(5).waitFor({state: 'visible', timeout: 20000});

            // Boards renders the description below the properties and comments, past the fold.
            await blocks.evaluate((el) => el.scrollIntoView({block: 'center', behavior: 'instant'}));
            await page.waitForTimeout(1200);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'boards-card-properties',
        guide: 'boards',
        module: 'cards-and-properties',
        alt: 'A card\'s properties: select, person, date, number, multi-select, URL and checkbox values',

        // The property list. Values sit in the left part of a wide column, so the empty right
        // side is trimmed.
        clip: {of: '.Dialog .CardDetailProperties', maxWidth: 600, pad: 8},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await page.locator('.KanbanCard').filter({hasText: 'Rewrite the deploy pipeline'}).first().click();
            await page.locator('.Dialog .CardDetailProperties').getByText('Design reviewed').waitFor({state: 'visible', timeout: 20000});
            await page.waitForTimeout(1200);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'boards-view-menu',
        guide: 'boards',
        module: 'views',
        alt: 'The view menu in the board header, with Add view open on Board, Table, Gallery and Calendar',

        // The view selector, its menu and the Add view submenu, isolated from the cards both
        // menus fall over.
        clip: {of: ['.ViewHeader .viewSelector', '.ViewHeader .viewSelector .Menu .menu-contents'], all: true, isolate: true},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await page.locator('.ViewHeader .viewSelector .MenuWrapper').first().click();
            await page.getByText('Add view', {exact: false}).first().hover();
            await page.locator('.SubMenu').getByText('Calendar').waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    ...[
        {view: 'table', caption: 'Table', alt: 'The Table layout: a row per card, a column per property', ready: '.TableRow'},
        {view: 'gallery', caption: 'Gallery', alt: 'The Gallery layout: each card shown by the first image attached to it', ready: '.GalleryCard'},
        {view: 'calendar', caption: 'Calendar', alt: 'The Calendar layout: cards placed on their due dates', ready: '.fc-daygrid-event, .fc-event'},
    ].map(({view, caption, alt, ready}) => ({
        id: `boards-view-${view}`,
        guide: 'boards',
        module: 'views',
        alt,
        caption,

        // Three of the four layouts, shown together under "Pick a layout"; the Kanban board is
        // already pictured in "Add a card". From the view header down, cut to the guide's column.
        clip: {of: '.BoardComponent', topOf: '.ViewHeader', maxHeight: view === 'gallery' ? 330 : 420, maxWidth: 840},
        async setup(page, {boardURL}) {
            await page.goto(boardURL(view));
            await page.locator('.BoardComponent').waitFor({state: 'visible', timeout: 40000});
            await page.locator(ready).first().waitFor({state: 'visible', timeout: 40000});
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(1500);
            await page.mouse.move(0, 0);
        },
    })),
    {
        id: 'boards-share-dialog',
        guide: 'boards',
        module: 'sharing-and-linking',
        alt: 'The Share dialog for a board, with team access and role options',

        // `.ShareBoardDialog` and `.Dialog` are both full-viewport wrappers; `.dialog` inside
        // them is the card. Cropped above the "Share internally" section on purpose: that
        // section renders the board's absolute URL, which on a capture server is
        // http://localhost:8065/... — not something to ship in customer-facing art.
        // Ends after the first member row: seed.js makes the other fixture users members too, so
        // the list runs on below it.
        clip: {of: '.Dialog .dialog', maxHeight: 278},
        scale: MODAL_SCALE,
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);

            await page.getByText('Share', {exact: true}).first().click();
            await page.waitForTimeout(1500);
        },
    },

    {
        id: 'boards-card-link',
        guide: 'boards',
        module: 'sharing-and-linking',
        alt: 'A card link posted in a channel, with Boards\' preview of the card beneath it',
        viewport: NARROW,

        // The post and its preview. seed.js posts the link as Markdown, so the message reads as
        // the card's name rather than a localhost URL.
        clip: {of: `.${CLIP_TARGET}`, maxWidth: 560},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('design-review'));
            await settle(page);
            const row = post(page, 'Picking this up next');
            await row.getByText('Platform Roadmap').first().waitFor({state: 'visible', timeout: 20000});
            await row.scrollIntoViewIfNeeded();
            await page.waitForTimeout(800);
            await page.mouse.move(0, 0);
            await markForClip(row);
        },
    },

    /* ================= slash commands ================= */

    {
        id: 'slash-command-picker',
        guide: 'productivity-tips',
        module: 'slash-commands',
        alt: 'Typing a forward slash in the message box, showing the list of available commands',
        viewport: NARROW,

        // `.suggestion-list` is a zero-height wrapper and never becomes "visible";
        // `#suggestionList` is the list that actually has a box. Isolated, because the list
        // floats over the channel's posts and file cards.
        clip: {of: ['#post-create', '#suggestionList'], all: true, isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // Clear first. The formatting shots type into this same channel's composer, and
            // with server-synced drafts on, their text is still sitting there on a later page
            // load — a slash only opens the command list as the first character of a message,
            // so an inherited draft silently breaks this shot depending on run order.
            await page.locator('#post_textbox').click();
            await page.locator('#post_textbox').fill('');
            await page.keyboard.type('/');
            await page.locator('#suggestionList').waitFor({state: 'visible', timeout: 15000});
            await page.waitForTimeout(900);
        },
    },
    {
        id: 'slash-command-filtered',
        guide: 'productivity-tips',
        module: 'slash-commands',
        alt: 'The command list filtered as you type, narrowing to matching commands',
        viewport: NARROW,
        clip: {of: ['#post-create', '#suggestionList'], all: true, isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#post_textbox').click();
            await page.locator('#post_textbox').fill('');
            await page.keyboard.type('/inv');
            await page.locator('#suggestionList').waitFor({state: 'visible', timeout: 15000});
            await page.waitForTimeout(900);
        },
    },

    /* ================= Upgrading Mattermost ================= */

    {
        id: 'about-mattermost',
        guide: 'update-guide',
        module: 'know-your-track',
        alt: 'The About Mattermost dialog, showing the server version and database schema version',

        // Cropped above the "Hostname:" row, which starts 285px down and prints the machine
        // that took the screenshot. The version and schema rows sit above it.
        // assertNoOperatorIdentity fails this shot if that row lands in frame.
        clip: {of: '.modal-content', maxHeight: 283},
        scale: MODAL_SCALE,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#product_switch_menu').click();
            await page.getByText(/About Mattermost/i).first().click();
            await page.locator('.modal-content').first().waitFor({state: 'visible', timeout: 20000});
            await page.waitForTimeout(1200);
            await page.mouse.move(0, 0);
        },
    },

    /* ================= playbooks (remote) ================= */

    {
        id: 'pb-playbooks-list',
        guide: 'playbooks',
        module: 'playbooks-and-runs',
        source: 'remote',
        alt: 'The Playbooks list, showing available playbooks with their run counts',
        viewport: NARROW,

        // The list itself, not the backstage sidebar beside it: with the sidebar the page is
        // 1373px wide and lands at 0.6x.
        //
        // Sorted by Runs, most first — a real sort a reader can apply — because the default
        // order opens on three identical unused playbooks. Ends after the third row.
        clip: {of: "[class*='PlaybookListContainer']", maxHeight: 384},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL('/playbooks'));
            await settlePlaybooks(page, "[data-testid='playbook-title']");

            const header = page.getByText('Runs', {exact: true}).last();
            const first = () => page.locator("[data-testid='playbook-title']").first().innerText();
            for (let i = 0; i < 2 && (await first()).includes('@'); i++) {
                await header.click();
                await page.waitForTimeout(1500);
            }
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-run-overview',
        guide: 'playbooks',
        module: 'playbooks-and-runs',
        source: 'remote',
        alt: 'A run in progress: its name and status above its checklist, with tasks checked off and controls to assign each one, run its command, and set a due date',

        // The first Playbooks image in the guides, so it shows what a run *is*: the run's name and
        // status, and its checklist being worked. The first version stopped where the checklist
        // began — "we should show a checklist in this image", in review. The run header is sticky,
        // so scrolling the checklist up under it puts the two in one frame; the summary and update
        // sections between them scroll away. Not flush under the header: the group's own header
        // is sticky too, and pinned there it collapses to a bare rule.
        clip: {
            of: ["[data-testid='run-header-section']", "[data-testid='checkbox-item-container'] >> nth=3"],
            pad: 0,
        },
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='checkbox-item-container']");
            const header = await page.locator("[data-testid='run-header-section']").boundingBox();
            await page.locator("[data-testid='checklistHeader']").first().evaluate((el, top) => {
                // Find the scrolling column and put the checklist just under the sticky header.
                let scroller = el.parentElement;
                while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
                    scroller = scroller.parentElement;
                }
                const delta = el.getBoundingClientRect().top - top;
                (scroller || document.scrollingElement).scrollBy({top: delta, behavior: 'instant'});
            }, header.y + header.height + 64);
            await page.waitForTimeout(900);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-checklist',
        guide: 'playbooks',
        module: 'working-the-checklist',
        source: 'remote',
        alt: 'A run checklist with tasks checked off, each showing an assignee and a due date',

        // One checklist group, not the whole section — that is ~2700px across five groups.
        clip: `.${CLIP_TARGET}`,
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='checkbox-item-container']");

            await scrollToTop(page, "[data-testid='checklistHeader']");
            await markEnclosing(page, "[data-testid='checklistHeader']", 200, 900);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-post-update-dialog',
        guide: 'playbooks',
        module: 'status-updates',
        source: 'remote',
        alt: 'The status update dialog, pre-filled from the playbook\'s update template',

        // The section on the page itself is a thin "Update overdue / Post update" strip — the
        // dialog behind that button is what the step is actually describing.
        clip: {of: '.modal-content', maxHeight: 470},
        scale: MODAL_SCALE,
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='post-update-button']");

            await page.locator("[data-testid='post-update-button']").click();
            await page.locator('.modal-content').first().waitFor({state: 'visible', timeout: 30000});
            await page.waitForTimeout(2000);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-run-info-pane',
        guide: 'playbooks',
        module: 'joining-a-run',
        source: 'remote',
        alt: 'The run details pane, listing the playbook, owner, participants, followers, and channel',

        // Union of the first and last rows, which covers everything between them.
        clip: {of: ["[data-testid='runinfo-playbook']", "[data-testid='runinfo-channel']"]},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='runinfo-channel']");
        },
    },
    {
        id: 'pb-timeline',
        guide: 'playbooks',
        module: 'retrospectives',
        source: 'remote',
        alt: 'The run timeline, recording status updates, a task assignment, and a slash command in order',

        // Down to the end of the last event; the element runs on past it as empty space.
        clip: {of: "[data-testid='rhs-timeline']", maxHeight: 365},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='rhs-timeline']");
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-retrospective',
        guide: 'playbooks',
        module: 'retrospectives',
        source: 'remote',
        alt: 'A completed retrospective report for a run',
        clip: {of: "[data-testid='run-retrospective-section']", maxHeight: 470},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='retro-report-text']");
            await scrollToTop(page, "[data-testid='run-retrospective-section']");
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-run-channel',
        guide: 'playbooks',
        module: 'playbooks-and-runs',
        source: 'remote',
        alt: 'A run\'s channel with the run details pane open beside the conversation',
        viewport: NARROW,

        // The step is "participants work the checklist in the run details pane beside the
        // conversation", so the pane belongs in frame. At 1180px the channel and the pane
        // together land at about true size.
        clip: {of: ['#channel_view', '#sidebar-right'], maxHeight: 470, pad: 0},
        async setup(page, {channelURL}) {
            await page.goto(channelURL(PB.team, PB.runChannel));
            await page.locator('#post-create').waitFor({state: 'visible', timeout: 60000});
            await page.locator('#initialPageLoadingScreen').waitFor({state: 'hidden', timeout: 60000});

            // The app bar is clickable before Playbooks has registered its pane, and a click
            // then does nothing. Wait for the channel to settle, and retry once if needed.
            await page.waitForTimeout(3000);
            const pane = page.locator('#sidebar-right');
            for (let i = 0; i < 2 && !(await pane.isVisible()); i++) {
                await page.locator('#app-bar-icon-playbooks').click();
                await pane.waitFor({state: 'visible', timeout: 20000}).catch(() => {});
            }
            await pane.getByText('INC-1281', {exact: false}).first().waitFor({state: 'visible', timeout: 60000});
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(2500);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'pb-playbook-editor',
        guide: 'playbooks',
        module: 'building-a-playbook',
        source: 'remote',
        alt: 'The Outline tab of the playbook editor, listing the checklists every run starts from',

        // The editor opens on Usage — run counts and a chart — so the tab has to be switched.
        // Then clip one checklist group out of the Outline, the same way the run's checklist
        // shot does, rather than the page header.
        clip: `.${CLIP_TARGET}`,
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/playbooks/${PB.playbookId}`));
            await settlePlaybooks(page, "[data-testid='playbook-editor-title']");

            await page.getByText('Outline', {exact: true}).first().click();
            await page.waitForTimeout(2500);

            // Outline opens at Summary; the checklists are further down, and they are what a
            // run of this playbook will actually contain.
            await page.locator("[data-testid='checklistHeader']").first().waitFor({state: 'visible', timeout: 30000});

            // Centred rather than pinned to the top: the editor has a sticky page header, and a
            // clip anchored at the very top of the viewport catches a sliver of it.
            await scrollToTop(page, "[data-testid='checklistHeader']", 'center');
            await markEnclosing(page, "[data-testid='checklistHeader']", 200, 900);
            await page.mouse.move(0, 0);
        },
    },

    {
        id: 'pb-finish-run',
        guide: 'playbooks',
        module: 'status-updates',
        source: 'remote',
        alt: 'The end of a run, where finishing it closes out the checklist and notifies followers',
        clip: {of: "[data-testid='run-finish-section']", maxHeight: 300},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='run-finish-section']");
            await scrollToTop(page, "[data-testid='run-finish-section']");
            await page.mouse.move(0, 0);
        },
    },

    /* ================= licensed messaging features (remote) ================= */

    /*
     * Scheduled messages, acknowledgements and persistent notifications are licensed: an
     * unlicensed server leaves them out of its client config, so the menus simply do not have
     * them. These come from the licensed test server instead. Each types into a composer there,
     * which saves a draft on someone else's server — `teardown` empties the composer again, which
     * deletes the draft, whether or not the shot succeeded.
     */
    {
        id: 'scheduled-message-menu',
        guide: 'productivity-tips',
        module: 'scheduled-messages',
        source: 'remote',
        alt: 'The Schedule message menu open beside the Send button, offering a preset time and a custom time',
        viewport: NARROW,

        // The preset's time is the point of the menu. It is the next weekday morning, so this
        // image changes with the day it is captured on.
        showTimes: true,

        // The composer and the menu that rises from its Send button, isolated from the channel
        // the menu rises over.
        clip: {of: ['#post-create', '.MuiPopover-paper'], isolate: true, pad: 0},
        async setup(page, ctx) {
            await openRemoteComposer(page, ctx);
            await page.locator('#post-create #button_send_post_options').click();
            await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible', timeout: 20000});
            await settleMenu(page);
            await page.mouse.move(0, 0);
        },
        teardown: clearRemoteComposer,
    },
    {
        id: 'message-priority-ack',
        guide: 'productivity-tips',
        module: 'message-priority',
        source: 'remote',
        alt: 'The message priority menu with Request acknowledgement turned on',
        clip: {of: PRIORITY_MENU, pad: 0},
        async setup(page, ctx) {
            await openRemoteComposer(page, ctx);
            await openPriorityMenu(page);
            await priorityToggle(page, 'Request acknowledgement').click();
            await settleMenu(page);
            await page.mouse.move(0, 0);
        },
        teardown: clearRemoteComposer,
    },
    {
        id: 'message-priority-persistent',
        guide: 'productivity-tips',
        module: 'message-priority',
        source: 'remote',
        alt: 'The message priority menu with Urgent selected and Send persistent notifications turned on',
        clip: {of: PRIORITY_MENU, pad: 0},
        async setup(page, ctx) {
            await openRemoteComposer(page, ctx);
            await openPriorityMenu(page);

            // Persistent notifications are offered only on an Urgent message.
            await page.locator(PRIORITY_MENU).getByText('Urgent', {exact: true}).click();
            await priorityToggle(page, 'Send persistent notifications').click();
            await settleMenu(page);
            await page.mouse.move(0, 0);
        },
        teardown: clearRemoteComposer,
    },

    /* ================= AI Acceleration with Agents ================= */

    /*
     * Most of this guide is licence-gated in Agents, not missing. The post-level AI Actions
     * (Summarize Thread, Find action items, Find open questions), the channel header's summaries,
     * the New Messages "Ask AI", and creating more than one agent render only when `gi(state)` in
     * the plugin's webapp is true — a licence SKU of Entry, Enterprise or Advanced, *or* the
     * server's `EnableTesting` and `EnableDeveloper` both on. A local dev server uses the second
     * route; see "Licence-gated plugin UI" in README.md. On a server without either, these shots
     * fail on a missing button rather than photographing a screen without it.
     *
     * Still out of reach: Summarize Calls (the Calls plugin, and ffmpeg for transcription) and
     * semantic search (an embeddings provider, and pgvector in the database).
     */

    {
        id: 'ai-agents-pane',
        guide: 'ai-quick-start',
        module: 'ai-chat',
        alt: 'The Agents pane open beside a channel, showing its question box',

        // The pane grows upwards from its input, so its content sits at the bottom of a
        // full-height column: a top-anchored crop of it photographs empty white.
        clip: {of: '#sidebar-right', maxHeight: 420, anchor: 'bottom'},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openAgentsPane(page);
        },
    },
    {
        id: 'ai-agents-reply',
        guide: 'ai-quick-start',
        module: 'ai-chat',
        alt: 'A question asked in the Agents pane and the answer the agent returned',

        // Bottom-anchored for the same reason as the shot above: the conversation grows upwards
        // from the question box, so a top crop of the pane is empty white.
        clip: {of: '#sidebar-right', maxHeight: 500, anchor: 'bottom'},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openAgentsPane(page);
            await askAgent(page, 'Summarize this channel in two sentences.');
        },
    },
    {
        id: 'ai-post-actions',
        guide: 'ai-quick-start',
        module: 'summarize-threads',
        alt: 'The actions toolbar on a hovered message, with the AI Actions button highlighted',
        viewport: NARROW,

        // The hovered message row: its text on the left, the toolbar on the right.
        clip: `.${CLIP_TARGET}`,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            const {row, button} = await hoverForAIActions(page);
            await button.hover();
            await settleMenu(page);
            await markForClip(row);
        },
    },
    {
        id: 'ai-thread-menu',
        guide: 'ai-quick-start',
        module: 'summarize-threads',
        alt: 'The AI Actions menu on a message, offering Summarize Thread, Find action items, and Find open questions',
        viewport: NARROW,

        // The toolbar and the menu below it, isolated from the messages the menu falls over.
        // The menu is the plugin's own component, not MUI, and its class names are
        // emotion-hashed — so match the component-name prefix.
        clip: {of: [`.${CLIP_TARGET}`, AI_DROPDOWN], isolate: true},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            const {row, button} = await hoverForAIActions(page);
            await markForClip(row.locator('.post-menu').first());
            await button.click();
            await page.locator(AI_DROPDOWN).getByText('Summarize Thread').waitFor({state: 'visible'});
            await settleMenu(page);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'ai-thread-summary',
        guide: 'ai-quick-start',
        module: 'summarize-threads',
        alt: 'A thread summary in the Agents pane, with a follow-up question typed into the box below it',

        // From just above the summary to the box: the pane is anchored at its input, and above the
        // summary is empty pane.
        clip: {of: '#sidebar-right', maxHeight: 330, anchor: 'bottom'},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            const {button} = await hoverForAIActions(page);
            await button.click();
            await page.locator(AI_DROPDOWN).getByText('Summarize Thread').click();

            // fixture_ai.js answers every summary with the same text, so the wait is exact.
            await page.locator('#sidebar-right').getByText(/Maya reported/).first()
                .waitFor({state: 'visible', timeout: 60000});

            // The step is asking a follow-up, so one is typed — and left unsent, so the pane
            // shows the question in the box under the summary it is about.
            const box = page.locator('#sidebar-right textarea').last();
            await box.click();
            await box.fill('Which of these still needs an owner?');
            await page.waitForTimeout(1500);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'ai-channel-menu',
        guide: 'ai-quick-start',
        module: 'summarize-channels',
        alt: 'The Ask Agents menu from the channel header, with a question box and options to summarize unreads or the last 7 or 14 days',
        viewport: NARROW,

        // The channel header's left end and the popover below it. Isolated: the popover
        // covers the top of the message list.
        clip: {of: ['#channel-header', '.channel-summarize-popover'], isolate: true, maxWidth: 700},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await page.locator('#channel-header').getByLabel('Ask Agents about this channel').click();
            await page.locator('.channel-summarize-popover').getByText('Summarize last 7 days').waitFor({state: 'visible'});
            await settleMenu(page);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'ai-new-messages',
        guide: 'ai-quick-start',
        module: 'summarize-channels',
        alt: 'The New Messages divider in a channel with unread messages, with its Ask AI menu open',
        viewport: NARROW,
        // The divider, its menu, and the unread messages under it — which are the point: this
        // step is about a channel with unreads. Not isolated: isolating the divider photographed
        // blank white where its line should be, and the messages behind the menu are the
        // subject here rather than noise. `pad: 0` because a union's default pad brought in a
        // clipped line of the message above and the dark gutter either side of the column.
        clip: {of: ['.new-separator', AI_DROPDOWN], pad: 0},
        async setup(page, {channelURL, resetUnread}) {
            // The divider only exists while the channel is unread, and opening it reads it.
            await resetUnread();
            await page.goto(channelURL('release-train'));
            await settle(page);

            const divider = page.locator('.NotificationSeparator').first();
            await divider.waitFor({state: 'visible', timeout: 20000});

            // The channel opens with the line kept low, so the menu has to open upward — onto
            // the channel intro, which names the seeding admin. Centre the line first, which
            // leaves room for the menu to open downward; seed.js puts enough unread history
            // below it for the list to scroll that far. Not `start`: at the very top of the list
            // the line slides under the floating date header and photographs as blank white.
            await divider.evaluate((el) => el.scrollIntoView({block: 'center', behavior: 'instant'}));
            await page.waitForTimeout(900);
            await divider.getByText('Ask AI').click();
            await page.locator(AI_DROPDOWN).first().waitFor({state: 'visible'});
            await settleMenu(page);
            await page.mouse.move(0, 0);
        },
    },
    {
        id: 'ai-rewrite-menu',
        guide: 'ai-quick-start',
        module: 'rewrite-with-ai',
        alt: 'The Rewrite submenu open from the composer, listing Shorten, Elaborate, Improve ' +
            'writing, Fix spelling and grammar, Simplify and Summarize above a box for a custom ' +
            'instruction',

        // Isolated: the menus rise over the channel's messages and file cards.
        clip: {of: ['#post-create', '.MuiPopover-paper'], all: true, isolate: true},
        async setup(page, {channelURL}) {
            await openRewriteMenu(page, channelURL('ops-bridge'));
        },
    },
    {
        id: 'ai-agents-page',
        guide: 'ai-quick-start',
        module: 'custom-agents',
        alt: 'The Agents page, with All agents and Your agents tabs above the list of agents',

        // Not `/<team>/agents`, which silently falls back to a channel. The page has no ids; its
        // one repeated structural class is emotion-hashed, so match on the component-name prefix.
        clip: {of: "[class*='ContentColumn']", all: true, maxHeight: 330, trimTop: 8},
        async setup(page, {siteURL}) {
            await gotoAgentsPage(page, siteURL);
        },
    },
    {
        id: 'ai-create-agent',
        guide: 'ai-quick-start',
        module: 'custom-agents',
        alt: 'The new agent form filled in with a display name, username, avatar, and AI service',

        // The form is about 900x840 — nearly square, which the guide would show at half size.
        // Cropped to the fields the step names first; Custom instructions sits below the cut.
        clip: {of: "[class*='ContentColumn']", maxHeight: 530, trimTop: 8},
        async setup(page, {siteURL}) {
            await gotoAgentsPage(page, siteURL);

            // Enabled only because the licence gate is satisfied — see the note at the top of
            // this section. Filled in but never saved: the fixture world keeps one agent.
            await page.getByRole('button', {name: 'Create agent'}).click();
            await page.getByPlaceholder('Agent username').waitFor({state: 'visible', timeout: 30000});
            await page.getByPlaceholder('e.g. Sales Assistant').fill('Release Notes Helper');
            await page.getByPlaceholder('Agent username').fill('release-notes');
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(1500);
            await page.mouse.move(0, 0);
        },
    },
];
