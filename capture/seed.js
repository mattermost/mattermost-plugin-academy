// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Deterministic fixture data for guide captures.
 *
 * Every name, channel, and message here is invented. That is deliberate: these screenshots ship
 * inside an Apache-2.0 plugin that goes to customers, so no real user, channel, or message
 * content may end up in them.
 */

import {boardsPreferences, seedBoards} from './fixture_boards.js';
import {FILE_POST, fixtureFiles} from './fixture_files.js';
import {MM} from './mm.js';

export const TEAM = {name: 'academy-demo', displayName: 'Northwind'};

/**
 * A second team the viewer belongs to. Search only offers its team picker ("Set how many teams to
 * search") to someone in more than one team, so with a single team that step has nothing to show.
 *
 * The team bar labels a team with the first two letters of its name, so this must not start with
 * "No" — two identical "NO" tiles read as a rendering fault.
 */
export const SECOND_TEAM = {name: 'academy-field-ops', displayName: 'Field Operations'};

export const USERS = [
    {
        username: 'alex.lindman',
        password: 'AcademyDemo1!',
        email: 'alex.lindman@example.com',
        firstName: 'Alex',
        lastName: 'Lindman',
        position: 'Platform Engineer',
    },
    {
        username: 'maya.kessler',
        password: 'AcademyDemo1!',
        email: 'maya.kessler@example.com',
        firstName: 'Maya',
        lastName: 'Kessler',
        position: 'SRE',
    },
    {
        username: 'jordan.reyes',
        password: 'AcademyDemo1!',
        email: 'jordan.reyes@example.com',
        firstName: 'Jordan',
        lastName: 'Reyes',
        position: 'Release Manager',
    },
];

/**
 * The account the browser is logged in as.
 *
 * Deliberately a fixture user rather than the admin doing the seeding. Shots of posts, the
 * composer, message menus and channel intros all render the viewing account's username and
 * avatar, and "created by <your-admin-username>" appears in every channel intro — so capturing
 * as the admin would bake whoever ran the harness into art that ships publicly.
 */
export const CAPTURE_AS = 'alex.lindman';

export const CHANNELS = [
    {name: 'ops-bridge', displayName: 'Ops Bridge', purpose: 'Live coordination during incidents', favorite: true},
    {name: 'announcements', displayName: 'Announcements', purpose: 'Company-wide notices'},
    {name: 'design-review', displayName: 'Design Review', purpose: 'Weekly design critique'},
    {name: 'release-train', displayName: 'Release Train', purpose: 'Ship coordination'},
    {name: 'watercooler', displayName: 'Watercooler', purpose: 'Non-work chatter'},

    // Private, so the sidebar shows a lock icon next to a globe one — the channel-types shot
    // is about telling those apart.
    {name: 'incident-review', displayName: 'Incident Review', purpose: 'Post-incident writeups', type: 'P'},

    // Public channels the viewer has *not* joined. "Browse and join channels" teaches selecting
    // Join, and a Browse Channels list where every row says "Joined" has no Join to show.
    {name: 'platform-guild', displayName: 'Platform Guild', purpose: 'Cross-team platform discussion', viewerJoins: false},
    {name: 'customer-escalations', displayName: 'Customer Escalations', purpose: 'Escalated support cases', viewerJoins: false},

    // Favorites with one channel in it is not a category anyone recognises. One of these is
    // private, so Favorites shows that a favourite keeps its type. Neither name contains "re",
    // which keeps them out of the quick-switcher shot's matches.
    {name: 'on-call', displayName: 'On-Call', purpose: 'Pager rotation and handoffs', favorite: true},
    {name: 'q4-planning', displayName: 'Q4 Planning', purpose: 'Roadmap for the quarter', type: 'P', favorite: true},
];

/**
 * A custom sidebar category. "Sort and mute custom categories" is about a category *you* made,
 * whose menu offers Rename and Delete that Favorites and Channels do not.
 */
export const CATEGORY = {displayName: 'Projects', channels: ['design-review', 'release-train']};

/**
 * Channel conversations. `thread` entries become replies to the message above them.
 *
 * Nothing here is authored by CAPTURE_AS. Hover toolbars, message menus and thread affordances
 * all differ on your own posts, and the guide is teaching what you do to *other people's*
 * messages — so the viewing account stays a reader.
 */
export const CONVERSATIONS = {
    'ops-bridge': [
        {as: 'maya.kessler', message: 'The staging deployment failed — see thread for details.'},
        {
            as: 'jordan.reyes',
            message: 'Deployment checklist is ready for review.',
            // Long enough to fill the thread pane. The pane anchors posts to its bottom, so a
            // three-reply thread photographs as a mostly-empty rectangle with a sliver of
            // content along the bottom edge.
            thread: [
                {as: 'maya.kessler', message: 'Rollback plan is drafted. We need a decision before EOD.'},
                {as: 'jordan.reyes', message: 'Agreed — let us hold the release until the smoke tests are green.'},
                {as: 'maya.kessler', message: 'Step three needs the database snapshot taken first, or the restore has nothing to read.'},
                {as: 'jordan.reyes', message: 'Added it as a prerequisite. Snapshot takes about four minutes.'},
                {as: 'maya.kessler', message: 'Who is running it if this happens overnight?'},
                {as: 'jordan.reyes', message: 'On-call runs it, and the doc now links the exact commands.'},
                {as: 'maya.kessler', message: 'That works. I will review the checklist once more this afternoon.'},
            ],
        },

        // Mentions the viewing account, so Recent Mentions has something in it.
        {as: 'maya.kessler', message: '@alex.lindman can you confirm the rollback window?', mention: true},

        // Filler, so the channel has enough history to push the channel intro off screen. The
        // intro reads "Public channel created by <whoever created it>", which is the admin
        // running the harness, and it is a rendered component rather than a post — it cannot be
        // deleted the way the join messages can, so the only way out of frame is scrolling.
        // There has to be more than a viewport's worth here or the list never scrolls at all.
        {as: 'jordan.reyes', message: 'Smoke tests are queued behind the current build.'},
        {as: 'maya.kessler', message: 'Metrics look flat since the restart, nothing new in the logs.'},
        {as: 'jordan.reyes', message: 'I will post an update here once the queue drains.'},
        {as: 'maya.kessler', message: 'Thanks — I am watching the error rate in the meantime.'},
        {as: 'jordan.reyes', message: 'Build 4417 picked up the config change.'},
        {as: 'maya.kessler', message: 'Confirmed on my side. Cache warmed in about ninety seconds.'},
        {as: 'jordan.reyes', message: 'Queue is down to eleven jobs.'},
        {as: 'maya.kessler', message: 'The two slow migrations finished, so it should clear faster now.'},
        // Reactions for "React instead of replying". One is the viewer's own, which the product
        // highlights — that is the state the step leaves you in.
        {
            as: 'jordan.reyes',
            message: 'Staging is serving traffic again.',
            reactions: [['maya.kessler', '+1'], [CAPTURE_AS, '+1'], ['maya.kessler', 'tada']],
        },
        {as: 'maya.kessler', message: 'Error rate is back to baseline.'},
        // Carries the pinned/saved/reaction fixtures. Deliberately not the thread root: a
        // pinned, saved post renders with a yellow highlight and "Pinned • Saved" labels, which
        // is noise in the thread-reply shot and teaches the inverse in the message-menu shots.
        {as: 'jordan.reyes', message: 'I will leave the freeze in place until the morning check.', pin: true, save: true},
        {as: 'maya.kessler', message: 'Sounds right. I have added a note to the incident doc.'},
    ],
    // Carries the "New Messages" line: the viewer is marked unread from `unreadFrom` on every
    // run, because opening the channel in any earlier run marks it read and the line would
    // otherwise appear only the first time.
    'release-train': [
        {as: 'jordan.reyes', message: 'PR is merged and staging is green.'},
        {as: 'maya.kessler', message: 'Release 7.4 is cut. Notes go out Thursday.', unreadFrom: true},
        {as: 'jordan.reyes', message: 'Two fixes are still in QA: the export timeout and the avatar cache.'},
        {as: 'maya.kessler', message: 'Both should land before the cut-off.'},
        // Enough unread history below the line that the channel opens scrolled to it. With four
        // posts it sat low in the viewport, its Ask AI menu opened *upward*, and the menu landed
        // on the channel intro — which names the seeding admin.
        {as: 'jordan.reyes', message: 'The export timeout fix is merged.'},
        {as: 'maya.kessler', message: 'QA signed off on the avatar cache change.'},
        {as: 'jordan.reyes', message: 'Tagging 7.4.0-rc1 now.'},
        {as: 'maya.kessler', message: 'The release notes draft is in the doc.'},
        {as: 'jordan.reyes', message: 'Staging is on rc1.'},
        {as: 'maya.kessler', message: 'Smoke tests passed on rc1.'},
        {as: 'jordan.reyes', message: 'Promoting to production at 2pm.'},
    ],
    // Two more followed threads, so the Threads view is a list rather than one row, and one of
    // them unread so "Clear the backlog" has a backlog.
    'design-review': [
        {
            as: 'jordan.reyes',
            message: 'New empty-state mocks are up in the design file.',
            thread: [
                {as: 'maya.kessler', message: 'The illustration is competing with the primary button.'},
                {as: 'jordan.reyes', message: 'Agreed. I will try a smaller version.'},
            ],
        },
    ],
    watercooler: [
        {
            as: 'maya.kessler',
            message: 'Lunch for Friday\'s offsite: tacos or ramen?',
            threadUnread: true,
            thread: [
                {as: 'jordan.reyes', message: 'Ramen, if the place near the office is open.'},
                {as: 'maya.kessler', message: 'Booked it for noon.'},
            ],
        },
    ],
    announcements: [
        {as: 'jordan.reyes', message: 'Reminder: sprint retro is at 3pm today.'},
    ],
    'incident-review': [
        // The hashtag is a fixture in its own right — the advanced-search guide has a step on
        // searching them, and a hashtag search needs a hashtag to find.
        {as: 'maya.kessler', message: 'Writeup for the 14 August incident is ready for comment. #incident4417'},
        // Unread on every run, with the DM, the group message and the card link: the unreads
        // filter shot is a list of exactly these. Left to chance, the list depended on which
        // channels earlier runs had happened to open.
        {as: 'jordan.reyes', message: 'Linked it from the release notes. #incident4417', unreadFrom: true},
    ],
};

/** A direct message, so the sidebar's DIRECT MESSAGES category is not just the bots. */
export const DIRECT_MESSAGE = {
    with: 'maya.kessler',
    messages: ['Do you have five minutes to look at the rollback plan?'],
};

/**
 * A group message. "Understand channel types" names four kinds of conversation, and a sidebar
 * with only a one-to-one DM under DIRECT MESSAGES shows three of them.
 */
export const GROUP_MESSAGE = {
    with: ['jordan.reyes', 'maya.kessler'],
    from: 'jordan.reyes',
    messages: ['Can we move the release review to Thursday?'],
};

/** The post that carries a card link, for "Share a link to a board or a card". */
export const CARD_LINK_POST = {
    channel: 'design-review',
    as: 'jordan.reyes',
    message: (url) => `Picking this up next: [Rewrite the deploy pipeline](${url})`,
};

/** An unsent draft, so the Drafts view has content. */
export const DRAFT = {
    channel: 'design-review',
    message: 'Two notes on the new empty state before Thursday:',
};

/**
 * Seeds the server and returns ids the shots need.
 *
 * Safe to run repeatedly — every helper checks before creating.
 */
/**
 * Clears the viewer's direct channels with bots, and takes them out of the sidebar.
 *
 * Two problems, one cause. Installing a plugin that owns a bot auto-creates a direct channel with
 * it, which then appears under DIRECT MESSAGES in every sidebar shot — so whether the harness had
 * Agents installed decided what the Mattermost Basics art looked like. Worse, the Agents pane
 * *stores its conversations in that DM*, as ordinary searchable posts, so each capture run left
 * another copy of the agent's answer behind: by the third run the advanced-search shots were
 * mostly agent replies, and the Threads view had grown a thread nobody wrote.
 *
 * Neither is created by this seed, so neither can be fixed by not creating it — it has to be
 * undone. `direct_channel_show: false` is what the webapp writes when you close a DM; it removes
 * the channel from the sidebar without deleting it.
 */
async function resetBotDirectChannels(mm, viewerClient, viewerId) {
    const bots = await mm.req('GET', '/bots?per_page=200').catch(() => []);
    if (!bots.length) {
        return {hidden: 0, posts: 0};
    }

    let posts = 0;
    for (const bot of bots) {
        const dm = await mm.ensureDirectChannel(viewerId, bot.user_id).catch(() => null);
        if (!dm) {
            continue;
        }
        const page = await mm.req('GET', `/channels/${dm.id}/posts?per_page=200`);
        for (const post of Object.values(page.posts || {})) {
            const res = await mm.deletePost(post.id);
            if (!res?.error) {
                posts++;
            }
        }
    }

    await viewerClient.setPreferences(viewerId, bots.map((bot) => ({
        user_id: viewerId,
        category: 'direct_channel_show',
        name: bot.user_id,
        value: 'false',
    })));
    return {hidden: bots.length, posts};
}

/**
 * Leaves exactly `desired` reactions from fixture users on a post, as `[username, emoji]` pairs.
 *
 * Reconciled rather than applied, for the same reason as pins and saves: a reaction moved to a
 * different message in CONVERSATIONS would otherwise stay on the old one. Reactions are
 * self-only on the server, so each goes through its owner's client.
 */
async function reconcileReactions(mm, clients, users, postId, desired) {
    const want = new Set(desired.map(([who, emoji]) => `${users[who].id}:${emoji}`));
    const fixtureIds = new Set(Object.values(users).map((u) => u.id));
    const byId = Object.fromEntries(Object.entries(users).map(([name, u]) => [u.id, name]));

    const have = await mm.reactionsFor(postId);
    for (const r of have) {
        const key = `${r.user_id}:${r.emoji_name}`;
        if (fixtureIds.has(r.user_id) && !want.has(key)) {
            await clients[byId[r.user_id]].removeReaction(r.user_id, postId, r.emoji_name);
        }
    }
    const present = new Set(have.map((r) => `${r.user_id}:${r.emoji_name}`));
    for (const [who, emoji] of desired) {
        if (!present.has(`${users[who].id}:${emoji}`)) {
            await clients[who].ensureReaction(users[who].id, postId, emoji);
        }
    }
}

export async function seed(mm, log = console.log) {
    const team = await mm.ensureTeam(TEAM);
    const secondTeam = await mm.ensureTeam(SECOND_TEAM);
    log(`  teams ${team.display_name} (${team.id}), ${secondTeam.display_name}`);

    const users = {};
    const clients = {};
    for (const spec of USERS) {
        const user = await mm.ensureUser(spec);
        users[spec.username] = user;
        await mm.addToTeam(team.id, user.id);
        await mm.addToTeam(secondTeam.id, user.id);

        // One authenticated client per fixture user, reused for every post below.
        const client = new MM(mm.siteURL);
        await client.login(spec.username, spec.password);
        clients[spec.username] = client;
    }
    log(`  users ${Object.keys(users).join(', ')}`);

    const viewer = users[CAPTURE_AS];
    if (!viewer) {
        throw new Error(`CAPTURE_AS is "${CAPTURE_AS}", which is not in USERS`);
    }

    const channels = {};
    for (const spec of CHANNELS) {
        const channel = await mm.ensureChannel(team.id, spec);
        channels[spec.name] = channel;
        for (const [username, user] of Object.entries(users)) {
            if (username === CAPTURE_AS && spec.viewerJoins === false) {
                // Reconciled: a run that joined it by hand would otherwise leave it joined.
                await mm.removeFromChannel(channel.id, user.id);
                continue;
            }
            await mm.addToChannel(channel.id, user.id);
        }
        if (spec.favorite) {
            await clients[CAPTURE_AS].favoriteChannel(viewer.id, channel.id);
        }
    }
    log(`  channels ${Object.keys(channels).join(', ')}`);

    let posted = 0;
    let threadRoot = null;
    const threads = [];
    const unread = {channels: [], threads: []};
    for (const [channelName, messages] of Object.entries(CONVERSATIONS)) {
        const channel = channels[channelName];
        for (const entry of messages) {
            const author = clients[entry.as];
            const root = await author.ensurePostBy(author, mm, channel.id, entry.message);
            posted++;

            if (entry.thread?.length) {
                // The first thread is the one the thread shots open; the rest fill the list.
                threadRoot ??= {id: root.id, channelId: channel.id};
                threads.push({root, entry});
            }
            if (entry.unreadFrom) {
                unread.channels.push(root.id);
            }
            // Reconciled rather than only applied. Pins, saves and reactions all persist on the
            // server, so moving a fixture from one message to another in this file would
            // otherwise leave the old message decorated forever — and a stray "Pinned • Saved"
            // banner is exactly the kind of thing that quietly ends up in a shipped screenshot.
            if (entry.pin) {
                await mm.pinPost(root.id);
            } else {
                await mm.unpinPost(root.id);
            }

            // Reactions and preferences are self-only: the server rejects an admin writing
            // either on another account's behalf, so these go through the owner's client.
            const viewerClient = clients[CAPTURE_AS];
            if (entry.save) {
                await viewerClient.savePost(viewer.id, root.id);
            } else {
                await viewerClient.unsavePost(viewer.id, root.id);
            }

            await reconcileReactions(mm, clients, users, root.id, entry.reactions || []);

            let lastReply = null;
            for (const reply of entry.thread || []) {
                const replier = clients[reply.as];
                lastReply = await replier.ensurePostBy(replier, mm, channel.id, reply.message, {rootId: root.id});
                posted++;
            }
            if (entry.threadUnread && lastReply) {
                unread.threads.push({rootId: root.id, postId: lastReply.id});
            }
        }
    }
    log(`  posts ensured (${posted} checked)`);

    // The viewer neither started nor replied to the seeded threads, so follow them explicitly or
    // the Threads view is empty.
    for (const {root} of threads) {
        await clients[CAPTURE_AS].followThread(viewer.id, team.id, root.id);
    }
    log(`  viewer follows ${threads.length} thread(s)`);

    // Attachments for the file-search shots, posted by a fixture user like everything else.
    const filePost = await clients['maya.kessler'].ensurePostWithFiles(
        channels[FILE_POST.channel].id,
        FILE_POST.message,
        await fixtureFiles(),
    );
    log(`  file attachments ensured (${filePost.file_ids?.length ?? 0} files)`);

    const dm = await mm.ensureDirectChannel(viewer.id, users[DIRECT_MESSAGE.with].id);
    for (const message of DIRECT_MESSAGE.messages) {
        const dmPost = await clients[DIRECT_MESSAGE.with].ensurePost(dm.id, message);
        unread.channels.push(dmPost.id);
    }
    channels.__dm = dm;
    log(`  direct message with ${DIRECT_MESSAGE.with}`);

    // Created by the viewer, who has to be one of its members.
    const gm = await clients[CAPTURE_AS].ensureGroupChannel([viewer.id, ...GROUP_MESSAGE.with.map((u) => users[u].id)]);
    for (const message of GROUP_MESSAGE.messages) {
        const gmPost = await clients[GROUP_MESSAGE.from].ensurePost(gm.id, message);
        unread.channels.push(gmPost.id);
    }
    await clients[CAPTURE_AS].setPreferences(viewer.id, [{user_id: viewer.id, category: 'group_channel_show', name: gm.id, value: 'true'}]);
    channels.__gm = gm;
    log(`  group message with ${GROUP_MESSAGE.with.join(', ')}`);

    // Clear the viewer's drafts before writing the fixture one. The formatting shots type into
    // the composer, and with server-synced drafts on, whatever they typed survives the run —
    // so without this the Drafts view photographs the *previous* run's leftovers.
    const stale = await clients[CAPTURE_AS].listDrafts(viewer.id, team.id);
    for (const draft of stale) {
        await clients[CAPTURE_AS].deleteDraft(viewer.id, draft.channel_id);
    }

    // Drafts belong to the account that owns them, so this goes through the viewer's client.
    await clients[CAPTURE_AS].ensureDraft(channels[DRAFT.channel].id, DRAFT.message);
    log(`  drafts reset (${stale.length} cleared), fixture draft in ${DRAFT.channel}`);

    let systemRemoved = 0;
    for (const channel of Object.values(channels)) {
        systemRemoved += await mm.deleteSystemPosts(channel.id);
    }

    // The second team exists only to be listed. Its default channels open with join messages,
    // which the team bar shows as an unread dot beside the team on every shot that includes it.
    const secondTeamChannels = await mm.req('GET', `/users/${viewer.id}/teams/${secondTeam.id}/channels`);
    for (const channel of secondTeamChannels) {
        systemRemoved += await mm.deleteSystemPosts(channel.id);
    }
    log(`  system join messages removed (${systemRemoved})`);

    // Read the channels that have no fixture conversation, and the second team: their only
    // "unread" content was the join messages just deleted. Channels that do hold conversation
    // keep their state — the unreads-filter shot is a list of them.
    const quiet = CHANNELS.filter((c) => !CONVERSATIONS[c.name] && c.viewerJoins !== false).map((c) => channels[c.name]);
    for (const channel of [...quiet, ...secondTeamChannels]) {
        await clients[CAPTURE_AS].markChannelRead(viewer.id, channel.id);
    }

    await clients[CAPTURE_AS].setSidebarPreferences(viewer.id);

    await clients[CAPTURE_AS].ensureCategory(
        viewer.id, team.id, CATEGORY.displayName, CATEGORY.channels.map((name) => channels[name].id),
    );
    log(`  sidebar category "${CATEGORY.displayName}" holds ${CATEGORY.channels.join(', ')}`);

    // Unread state is re-applied every run, because capturing *reads* it: opening a channel or a
    // thread marks it read on the server, so the next run would find nothing unread. Returned as
    // a function too, for the shots that need it: within one run an earlier shot — or a failed
    // first attempt of the same one — can read it just as well.
    const resetUnread = async () => {
        for (const postId of unread.channels) {
            await clients[CAPTURE_AS].setPostUnread(viewer.id, postId);
        }
        for (const {rootId, postId} of unread.threads) {
            await clients[CAPTURE_AS].setThreadUnread(viewer.id, team.id, rootId, postId);
        }
    };
    await resetUnread();
    log(`  unread markers set (${unread.channels.length} channel, ${unread.threads.length} thread)`);

    // Every fixture user, not just the viewer. Presence drifts on its own — a user the seed just
    // posted as reads "online", and the same account reads away an hour later — and the sidebar
    // paints a dot for each of them, so leaving the others unpinned makes any shot containing the
    // DM list differ between runs. That went unnoticed until a re-capture rewrote seven committed
    // images for no reason anyone had asked for.
    for (const username of Object.keys(clients)) {
        await clients[username].setStatus(users[username].id, 'online');
    }

    // Hide bot DMs. Installing Agents auto-creates a direct channel with its bot, which then
    // shows up under DIRECT MESSAGES in every single sidebar shot — so whether the harness had
    // that plugin installed decided what the Mattermost Basics art looked like. Nothing in any
    // guide points at a bot DM, so the fixture sidebar should not have one.
    const bots = await resetBotDirectChannels(mm, clients[CAPTURE_AS], viewer.id);
    log(
        `  availability pinned for ${Object.keys(clients).length} users, ` +
        `${bots.hidden} bot DM(s) hidden (${bots.posts} post(s) cleared)`,
    );

    // Boards has its own onboarding — a "Welcome To Boards" screen with a tour — gated on
    // preferences in a `focalboard` category rather than the ones suppressOnboarding covers.
    await clients[CAPTURE_AS].setPreferences(viewer.id, boardsPreferences(viewer.id));
    log('  Boards welcome screen suppressed');

    // Only when the plugin is actually installed; the guide is gated on it anyway.
    let board = null;
    let boardViews = {};
    if ((await mm.activePlugins()).includes('focalboard')) {
        const people = Object.fromEntries(Object.entries(users).map(([name, u]) => [name, u.id]));
        const boards = await seedBoards(mm.siteURL, clients[CAPTURE_AS].token, team.id, viewer.id, log, people);
        board = boards.board;
        boardViews = boards.views;

        // "Pasting a card link into a channel renders a preview of the card." Boards attaches
        // that preview server-side when a post carries a card URL, so the post has to be real.
        // A Markdown link, so the message shows the card's name rather than a localhost URL.
        const url = `${mm.siteURL}/boards/team/${team.id}/${board.id}/${boards.card.viewId}/${boards.card.id}`;
        const linkPost = await clients[CARD_LINK_POST.as].ensurePostBy(
            clients[CARD_LINK_POST.as], mm, channels[CARD_LINK_POST.channel].id, CARD_LINK_POST.message(url),
        );

        // Unread like the conversations above it, for the unreads-filter shot.
        unread.channels.push(linkPost.id);
        await clients[CAPTURE_AS].setPostUnread(viewer.id, linkPost.id);
        log(`  card link posted in ${CARD_LINK_POST.channel}`);
    } else {
        log('  focalboard not installed — skipping board fixtures');
    }

    await clients[CAPTURE_AS].suppressOnboarding(viewer.id);
    log('  onboarding prompts suppressed');

    // Last, once every admin-scoped write above is done: take the admin back out of the fixture
    // team. Creating a channel joins you to it, and any member of the team shows up in the
    // people autocomplete — `from:` in the search box listed the admin account, which
    // assertNoAdminIdentity then rejected. Narrowing the query does not help, because the
    // match is not a prefix match. The fixture world should contain only invented people.
    //
    // To look at the world yourself, log in as the capture user rather than rejoining: that is
    // what the shots see anyway. Credentials are in USERS above.
    await mm.removeFromTeam(team.id, mm.me.id);
    await mm.removeFromTeam(secondTeam.id, mm.me.id);
    log(`  admin @${mm.me.username} removed from the fixture teams`);

    return {team, users, channels, viewer, viewerClient: clients[CAPTURE_AS], threadRoot, board, boardViews, resetUnread};
}
