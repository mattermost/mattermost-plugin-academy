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
    {
        id: 'sidebar-overview',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The channel sidebar with a Favorites category above the channel list',

        // The sidebar element is 850px tall but its content ends around 550 — everything below
        // is empty. Shipping that emptiness is not free: the guide scales step art to a fixed
        // height, so dead space at the bottom directly costs rendered width. 450 ends cleanly
        // just before the DIRECT MESSAGES category, which this step is not about; going much
        // past it slices that header in half.
        clip: {of: '#SidebarContainer', maxHeight: 450},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
        },
    },
    {
        id: 'browse-channels',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The Browse Channels dialog listing public channels available to join',

        // #browseChannelsModal is the full-viewport wrapper, not the dialog — clipping it
        // yields a 1440x900 screenshot of the whole app. .modal-content is the card itself,
        // title bar included.
        clip: '#browseChannelsModal .modal-content',
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
            await page.locator('#browseChannelsModal').getByText('Ops Bridge').waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    {
        id: 'category-menu',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'A category options menu open on the Favorites category, showing Sort and Mute Category',
        // The popover ends ~380px down, so there is no reason to carry the rest of the sidebar.
        clip: {of: ['#SidebarContainer', '.MuiPopover-paper'], maxHeight: 400},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // Favorites exists because seed.js favorites ops-bridge. The header renders the
            // localized, uppercased name.
            const favorites = page.locator('.SidebarChannelGroup').filter({hasText: 'FAVORITES'}).first();

            // Hover the *header*, not the group. The menu button is laid out only while the
            // header is hovered — unhovered it computes to 0x0, which never becomes
            // actionable, so clicking it just burns the timeout. Hovering the group is not
            // enough: its centre falls on the channel list below the header.
            await favorites.locator('.SidebarChannelGroupHeader').first().hover();

            const menuButton = favorites.locator('.SidebarMenu_menuButton').first();
            await menuButton.waitFor({state: 'visible'});
            await menuButton.click();

            // MuiPopover's backdrop is transparent, so the union clip is not dimmed.
            await page.locator('.MuiPopover-paper').first().waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },
    {
        id: 'unreads-filter',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The unreads filter enabled, narrowing the sidebar to channels with unread messages',

        // Must be the whole sidebar: the toggle this shot is about sits in the header, outside
        // #sidebar-left. Filtering leaves only a few rows, so the crop is shorter than the
        // other sidebar shots — content ends around 255.
        clip: {of: '#SidebarContainer', maxHeight: 275},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // Only rendered when the Unreads *category* is off (channel_navigator.tsx gates it
            // on showUnreadsCategory). seed.js pins that preference so this is deterministic.
            const filter = page.locator("[data-testid='sidebar-unread-filter-button']");
            await filter.waitFor({state: 'visible', timeout: 10000});
            await filter.click();
            await settleMenu(page);
        },
    },

    /* ---------------- channels-and-sidebar (remaining) ---------------- */

    {
        id: 'channel-types',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'A sidebar showing public channels with globe icons, a private channel with a lock icon, and a direct message',

        // Taller than sidebar-overview on purpose: this shot has to reach the DIRECT MESSAGES
        // category, since the step is about telling the three kinds apart.
        clip: {of: '#SidebarContainer', maxHeight: 620},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // The private channel is what makes the lock icon appear; fail loudly rather than
            // shipping a shot that quietly proves nothing.
            await page.locator('#SidebarContainer').getByText('Incident Review').waitFor({state: 'visible'});
        },
    },
    {
        id: 'create-category',
        guide: 'mattermost-basics',
        module: 'channels-and-sidebar',
        alt: 'The Create New Category dialog with a name field',
        clip: '#editCategoryModal .modal-content',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#browseOrAddChannelMenuButton').click();
            await page.locator('#createCategoryMenuItem').click();
            await page.locator('#editCategoryModal').waitFor({state: 'visible'});
            await settleMenu(page);
        },
    },

    /* ---------------- threads ---------------- */

    {
        id: 'thread-reply',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'A channel message with its replies collapsed underneath, showing a reply count',

        // The root post itself, tagged in setup. Clipping the message list instead would put
        // the channel intro ("created by …") in frame, which names the seeding admin.
        clip: `.${CLIP_TARGET}`,
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            // The collapsed reply footer lives inside the root post, so framing the post shows
            // the message and its reply count together — a reply count on its own, with the
            // message scrolled out above it, teaches nothing.
            const root = post(page, 'Deployment checklist is ready for review.');
            await root.scrollIntoViewIfNeeded();
            await root.getByText(/\d+ repl(y|ies)/).first().waitFor({state: 'visible'});
            await page.waitForTimeout(500);
            await markForClip(root);
        },
    },
    {
        id: 'threads-view',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'The Threads view listing followed threads with their most recent replies',
        clip: {of: '.GlobalThreads', maxHeight: 520},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#SidebarContainer').getByText('Threads', {exact: true}).click();
            await page.locator('.GlobalThreads').waitFor({state: 'visible'});
            await page.waitForTimeout(800);
        },
    },
    {
        id: 'thread-follow',
        guide: 'mattermost-basics',
        module: 'threads',
        alt: 'An open thread showing the Following indicator that can be toggled off',
        clip: {of: '.GlobalThreads', maxHeight: 520},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#SidebarContainer').getByText('Threads', {exact: true}).click();
            await page.locator('.GlobalThreads').waitFor({state: 'visible'});
            await page.waitForTimeout(800);

            // Selecting the thread opens the pane whose header carries the Following toggle.
            // Wait for the pane's *posts*, not just the header — the header renders first and
            // the body arrives a beat later, which photographs an empty pane.
            await page.locator('.ThreadItem').first().click();
            await page.getByText('Following', {exact: true}).first().waitFor({state: 'visible'});
            await page.locator('.ThreadViewer .post, .ThreadPane .post').first().waitFor({state: 'visible', timeout: 15000});
            await page.waitForTimeout(700);
        },
    },

    /* ---------------- notifications ---------------- */

    {
        id: 'notification-settings',
        guide: 'mattermost-basics',
        module: 'notifications',
        alt: 'The Notifications tab of Settings, covering desktop, mobile, and email notifications',
        clip: '#accountSettingsModal .modal-content',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSettings(page, 'Notifications');
        },
    },
    {
        id: 'notification-keywords',
        guide: 'mattermost-basics',
        module: 'notifications',
        alt: 'The keywords section of notification settings, expanded for editing',
        clip: '#accountSettingsModal .modal-content',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSettings(page, 'Notifications');

            await page.getByText('Keywords that trigger notifications').first().click();
            await page.waitForTimeout(400);
        },
    },
    {
        id: 'channel-notification-preferences',
        guide: 'mattermost-basics',
        module: 'notifications',
        alt: 'The Notification Preferences dialog for a single channel, with a mute option',
        clip: '#channelNotificationModal .modal-content, .ChannelNotificationModal .modal-content',
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
        guide: 'mattermost-basics',
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

    /* ---------------- composing ---------------- */

    {
        id: 'drafts-view',
        guide: 'mattermost-basics',
        module: 'composing',
        alt: 'The Drafts view listing an unsent message with the channel it belongs to',
        clip: {of: '#app-content', maxHeight: 460},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#SidebarContainer').getByText('Drafts', {exact: true}).click();
            await page.waitForTimeout(900);
        },
    },
    {
        id: 'message-priority',
        guide: 'mattermost-basics',
        module: 'composing',
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

    /* ---------------- formatting ---------------- */

    {
        id: 'formatting-toolbar',
        guide: 'mattermost-basics',
        module: 'formatting',
        alt: 'The message box with its formatting toolbar for bold, italic, lists, and code',
        clip: '#post-create',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#post_textbox').click();
            await page.locator('#post_textbox').fill('Two things before Thursday:');
            await page.waitForTimeout(300);
        },
    },
    {
        id: 'formatting-preview',
        guide: 'mattermost-basics',
        module: 'formatting',
        alt: 'A message with markdown shown in preview mode, rendered as it will appear once sent',
        clip: '#post-create',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.locator('#post_textbox').click();
            await page.locator('#post_textbox').fill('**Rollback plan**\n\n- Freeze deploys\n- Re-run smoke tests\n\n`make rollback`');
            await page.locator('#PreviewInputTextButton').click();
            await page.waitForTimeout(400);
        },
    },

    /* ---------------- finding it again ---------------- */

    {
        id: 'saved-messages',
        guide: 'mattermost-basics',
        module: 'finding-it-again',
        alt: 'The Saved messages pane listing a message saved for later',

        // #sidebar-right is 850px tall and the one saved result ends around 280, so the rest is
        // empty pane that would cost rendered width.
        clip: {of: '#sidebar-right', maxHeight: 300},
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
        guide: 'mattermost-basics',
        module: 'finding-it-again',
        alt: 'A message actions menu open, showing Pin to Channel, Remind, and Mark as Unread',
        clip: '.MuiPopover-paper',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openPostMenu(page, MENU_POST);
        },
    },
    {
        id: 'remind-menu',
        guide: 'mattermost-basics',
        module: 'finding-it-again',
        alt: 'The Remind submenu offering preset times and a custom option',

        // Parent menu and submenu are two sibling popovers, so both have to be in the clip.
        clip: {of: '.MuiPopover-paper', all: true},
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

    /* ---------------- speed ---------------- */

    {
        id: 'quick-switcher',
        guide: 'mattermost-basics',
        module: 'speed',
        alt: 'The quick switcher open, matching channels as you type',
        clip: '#quickSwitchModal .modal-content',
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
        id: 'recent-mentions',
        guide: 'mattermost-basics',
        module: 'speed',
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
        id: 'emoji-reaction',
        guide: 'mattermost-basics',
        module: 'speed',
        alt: 'The emoji picker open on a message, ready to add a reaction',
        clip: '#emojiPicker',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            const target = post(page, MENU_POST);
            await target.scrollIntoViewIfNeeded();
            await target.hover();
            await target.getByLabel(/add reaction/i).first().click();
            await page.locator('#emojiPicker').waitFor({state: 'visible'});
            await page.waitForTimeout(600);
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
        id: 'search-from-autocomplete',
        guide: 'advanced-search',
        module: 'from-and-in',
        alt: 'Typing from: in the search box, narrowing the list of people as you type',
        clip: '#searchBox',
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
        module: 'from-and-in',
        alt: 'Typing in: in the search box, with a list of channels to choose from',
        clip: '#searchBox',
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await openSearch(page);
            await page.keyboard.type('in:');
            await page.waitForTimeout(800);
        },
    },
    {
        id: 'search-modifiers-combined',
        guide: 'advanced-search',
        module: 'from-and-in',
        alt: 'A search combining from: and in: to narrow results to one person in one channel',
        clip: {of: '#searchContainer', maxHeight: 470},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, 'from:maya.kessler in:ops-bridge rollback');
        },
    },
    {
        id: 'search-date-picker',
        guide: 'advanced-search',
        module: 'date-filters',
        alt: 'The date picker that appears after typing before: in the search box',
        clip: '#searchBox',
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
        alt: 'A quoted search phrase, matching only messages containing that exact wording',
        clip: {of: '#searchContainer', maxHeight: 430},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, '"rollback plan"');
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
        alt: 'Filtering a file search to one extension with ext:, leaving a single PDF',

        // The Files tab is the whole point of an ext: filter, and search lands on Messages.
        clip: {of: '#searchContainer', maxHeight: 230},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);
            await runSearch(page, 'ext:pdf rollback');

            await page.locator('#searchContainer').getByRole('tab', {name: /files/i}).click();
            await page.waitForTimeout(1200);
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
        alt: 'The Saved messages pane listing a message set aside for later',
        clip: {of: '#sidebar-right', maxHeight: 300},
        async setup(page, {channelURL}) {
            await page.goto(channelURL('ops-bridge'));
            await settle(page);

            await page.getByRole('button', {name: 'Saved messages'}).first().click();
            await page.locator('#sidebar-right').waitFor({state: 'visible'});
            await page.waitForTimeout(900);
        },
    },

    /* ================= boards ================= */

    {
        id: 'boards-kanban',
        guide: 'boards',
        module: 'cards-and-properties',
        alt: 'A board in the Kanban layout, with cards grouped into Backlog, In progress, In review, and Done columns',
        clip: {of: '.BoardComponent', maxHeight: 520},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
        },
    },
    {
        id: 'boards-sidebar',
        guide: 'boards',
        module: 'opening-boards',
        alt: 'The Boards sidebar listing a board and its two views',
        clip: {of: '.Sidebar', maxHeight: 250},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
        },
    },
    {
        id: 'boards-card-detail',
        guide: 'boards',
        module: 'cards-and-properties',
        alt: 'A card opened to show its description, properties, and comment box',

        // The dialog is ~756 tall but this card's content ends around 460.
        clip: {of: '.Dialog .dialog', maxHeight: 470},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);

            await page.locator('.KanbanCard').filter({hasText: 'Rewrite the deploy pipeline'}).first().click();
            await page.locator('.Dialog').waitFor({state: 'visible', timeout: 20000});
            await page.waitForTimeout(1200);
        },
    },
    {
        id: 'boards-properties-menu',
        guide: 'boards',
        module: 'cards-and-properties',
        alt: 'The Properties menu, choosing which card properties show on the board',
        clip: {of: ['.ViewHeader', '.menu-contents'], all: true},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await boardViewHeaderMenu(page, 'Properties');
        },
    },
    {
        id: 'boards-group-by',
        guide: 'boards',
        module: 'views',
        alt: 'The Group by menu, choosing which property splits cards into columns',
        clip: {of: ['.ViewHeader', '.menu-contents'], all: true},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await boardViewHeaderMenu(page, 'Group by');
        },
    },
    {
        id: 'boards-filter',
        guide: 'boards',
        module: 'views',
        alt: 'The Filter panel, narrowing a board to the cards you want',

        // Filter is its own component rather than a generic menu, unlike the other three
        // view-header controls.
        clip: {of: ['.ViewHeader', '.FilterComponent'], all: true},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await boardViewHeaderMenu(page, 'Filter');
        },
    },
    {
        id: 'boards-sort',
        guide: 'boards',
        module: 'views',
        alt: 'The Sort menu, ordering cards by a property',
        clip: {of: ['.ViewHeader', '.menu-contents'], all: true},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);
            await boardViewHeaderMenu(page, 'Sort');
        },
    },
    {
        id: 'boards-share-dialog',
        guide: 'boards',
        module: 'sharing-and-linking',
        alt: 'The Share dialog for a board, with team access and role options',

        // `.ShareBoardDialog` and `.Dialog` are both full-viewport wrappers; `.dialog` inside
        // them is the card. Cropped above the "Share internally" section on purpose: that
        // section renders the board's absolute URL, which on a capture server is
        // http://localhost:8065/... — not something to ship in customer-facing art.
        clip: {of: '.Dialog .dialog', maxHeight: 300},
        async setup(page, {boardURL}) {
            await page.goto(boardURL());
            await settleBoard(page);

            await page.getByText('Share', {exact: true}).first().click();
            await page.waitForTimeout(1500);
        },
    },

    /* ================= slash commands ================= */

    {
        id: 'slash-command-picker',
        guide: 'slash-command-workflow-automation-quick-start',
        module: 'slash-command-basics',
        alt: 'Typing a forward slash in the message box, showing the list of available commands',
        // `.suggestion-list` is a zero-height wrapper and never becomes "visible";
        // `#suggestionList` is the list that actually has a box.
        clip: {of: ['#post-create', '#suggestionList'], all: true},
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
        guide: 'slash-command-workflow-automation-quick-start',
        module: 'slash-command-basics',
        alt: 'The command list filtered as you type, narrowing to matching commands',
        // `.suggestion-list` is a zero-height wrapper and never becomes "visible";
        // `#suggestionList` is the list that actually has a box.
        clip: {of: ['#post-create', '#suggestionList'], all: true},
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

    /* ================= update guide (System Console) ================= */


    /* ================= zero trust (System Console) ================= */

    {
        id: 'about-mattermost',
        guide: 'update-guide',
        module: 'know-your-track',
        alt: 'The About Mattermost dialog, showing the server version and database schema version',

        // Cropped above the "Hostname:" row, which starts 285px down and prints the machine
        // that took the screenshot. The version and schema rows sit above it.
        // assertNoOperatorIdentity fails this shot if that row lands in frame.
        clip: {of: '.modal-content', maxHeight: 283},
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
        clip: {of: '#playbooks-backstageRoot', maxHeight: 420},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL('/playbooks'));
            await settlePlaybooks(page, "[data-testid='playbook-title']");
        },
    },
    {
        id: 'pb-run-overview',
        guide: 'playbooks',
        module: 'playbooks-and-runs',
        source: 'remote',
        alt: 'A run in progress, with its summary and current status',
        clip: {of: '#playbooks-backstageRoot', maxHeight: 470},
        async setup(page, {playbooksURL}) {
            await page.goto(playbooksURL(`/runs/${PB.runId}`));
            await settlePlaybooks(page, "[data-testid='run-header-section']");
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
        alt: 'The run timeline, recording each event in order as the run progressed',
        clip: {of: "[data-testid='rhs-timeline']", maxHeight: 420},
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
        alt: 'The channel created for a run, where the conversation happens alongside the checklist',
        clip: {of: '#channel_view', maxHeight: 470},
        async setup(page, {channelURL}) {
            await page.goto(channelURL(PB.team, PB.runChannel));
            await page.locator('#post-create').waitFor({state: 'visible', timeout: 60000});
            await page.locator('#initialPageLoadingScreen').waitFor({state: 'hidden', timeout: 60000});
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

    /* ================= AI Quick Start ================= */

    /*
     * Six shots for a twelve-illustration guide, because the rest of the guide describes an
     * Agents UI this version does not have. Verified absent in Agents 2.7.0: there is no AI entry
     * in the post hover toolbar or the post dot menu (Summarize Threads), none in the channel
     * header (Summarize Channels), and the search box offers only Messages/Files and the usual
     * modifiers (AI Search). The fixed "Summarize Thread / Find action items / Find open
     * questions" actions the guide names have been replaced by user-defined **Custom prompts**.
     * Summarize Calls needs the Calls plugin and ffmpeg, neither of which is present.
     *
     * Those steps need their *text* revisited, not just their art, so they are left alone here
     * rather than illustrated with something that does not match what they say.
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
        id: 'ai-rewrite-menu',
        guide: 'ai-quick-start',
        module: 'rewrite-with-ai',
        alt: 'The Rewrite submenu open from the composer, listing Shorten, Elaborate, Improve ' +
            'writing, Fix spelling and grammar, Simplify and Summarize above a box for a custom ' +
            'instruction',
        clip: {of: ['#post-create', '.MuiPopover-paper'], all: true},
        async setup(page, {channelURL}) {
            await openRewriteMenu(page, channelURL('ops-bridge'));
        },
    },
    {
        id: 'ai-rewrite-result',
        guide: 'ai-quick-start',
        module: 'rewrite-with-ai',
        alt: 'The composer holding the rewritten version of the draft, ready to review and send',

        // Not a union with the menu: the Rewrite submenu sits directly over the composer, so a
        // frame that includes it hides the very text this step asks the reader to review.
        clip: '#post-create',
        async setup(page, {channelURL}) {
            await openRewriteMenu(page, channelURL('ops-bridge'));

            await page.locator('.MuiPopover-paper').last().getByText('Improve writing', {exact: true}).click();

            // fixture_ai.js returns this exact sentence, so the wait is on the finished result
            // rather than on a guess at how long a rewrite takes.
            // The composer is a textarea, so the rewritten text is a *value*, not page text —
            // getByText finds only hidden mirrors of it.
            await page.waitForFunction(
                () => document.querySelector('#post_textbox')?.value.includes('illustration competes'),
                null,
                {timeout: 60000},
            );

            // Dismiss the menus without touching Discard, which would revert the rewrite.
            // Escape does not close these — clicking outside them does. The channel header's
            // empty middle is the safest place to land: nothing there is clickable.
            await page.mouse.click(640, 100);
            await page.waitForFunction(
                () => !document.querySelector('.MuiPopover-paper'),
                null,
                {timeout: 20000},
            );
            await page.waitForTimeout(1200);
            await page.mouse.move(0, 0);

            // Escape must not have reverted the rewrite.
            const draft = await page.locator('#post_textbox').inputValue();
            if (!draft.includes('illustration competes')) {
                throw new Error('closing the menu reverted the rewrite');
            }
        },
    },
    {
        id: 'ai-agents-page',
        guide: 'ai-quick-start',
        module: 'custom-agents',
        alt: 'The Agents page, with All agents and Your agents tabs above the list of agents',

        // Not `/<team>/agents`, which silently falls back to a channel. The page has no ids; its
        // one repeated structural class is emotion-hashed, so match on the component-name prefix.
        clip: {of: "[class*='ContentColumn']", all: true, maxHeight: 330},
        async setup(page, {siteURL}) {
            await gotoAgentsPage(page, siteURL);
        },
    },
    {
        id: 'ai-agent-config',
        guide: 'ai-quick-start',
        module: 'custom-agents',

        /*
         * The agent *configuration* form, opened from an existing agent rather than from "Create
         * agent" — which is disabled on this server. Its tooltip explains why: "Multiple
         * self-service agents require a qualifying Mattermost plan." That is a licence cap, not a
         * permission, so it holds for the system admin too, and one agent already exists because
         * setup_agents.mjs created it. The two forms carry the same fields.
         *
         * Admin session: a fixture user gets a read-only copy of this screen.
         */
        as: 'admin',
        alt: 'The agent configuration form, with fields for the display name, agent username, ' +
            'bot avatar, and AI service',

        // The form is 896x835 — very nearly square, which renders about half size. Cropped to
        // the fields the step names first; Custom instructions sits just below the cut.
        clip: {of: "[class*='ContentColumn']", maxHeight: 530},
        async setup(page, {siteURL}) {
            await gotoAgentsPage(page, siteURL);
            await page.getByText('Academy Agent', {exact: true}).click();
            await page.getByText('Display name', {exact: true}).waitFor({state: 'visible', timeout: 30000});
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(2500);
            await page.mouse.move(0, 0);
        },
    },
];
