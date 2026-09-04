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

/** Opens the Settings dialog on a given tab. */
async function openSettings(page, tab) {
    await page.getByRole('button', {name: 'Settings'}).first().click();
    await page.locator('#accountSettingsModal').waitFor({state: 'visible'});
    await page.getByRole('tab', {name: tab}).click();
    await page.waitForTimeout(300);
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
];
