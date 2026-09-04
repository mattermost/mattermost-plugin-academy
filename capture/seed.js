// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Deterministic fixture data for guide captures.
 *
 * Every name, channel, and message here is invented. That is deliberate: these screenshots ship
 * inside an Apache-2.0 plugin that goes to customers, so no real user, channel, or message
 * content may end up in them.
 */

import {MM} from './mm.js';

export const TEAM = {name: 'academy-demo', displayName: 'Northwind'};

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
];

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
        {as: 'jordan.reyes', message: 'Staging is serving traffic again.'},
        {as: 'maya.kessler', message: 'Error rate is back to baseline.'},
        // Carries the pinned/saved/reaction fixtures. Deliberately not the thread root: a
        // pinned, saved post renders with a yellow highlight and "Pinned • Saved" labels, which
        // is noise in the thread-reply shot and teaches the inverse in the message-menu shots.
        {as: 'jordan.reyes', message: 'I will leave the freeze in place until the morning check.', pin: true, save: true, react: 'eyes'},
        {as: 'maya.kessler', message: 'Sounds right. I have added a note to the incident doc.'},
    ],
    'release-train': [
        {as: 'jordan.reyes', message: 'PR is merged and staging is green.'},
    ],
    announcements: [
        {as: 'jordan.reyes', message: 'Reminder: sprint retro is at 3pm today.'},
    ],
    'incident-review': [
        {as: 'maya.kessler', message: 'Writeup for the 14 August incident is ready for comment.'},
    ],
};

/** A direct message, so the sidebar's DIRECT MESSAGES category is not just the bots. */
export const DIRECT_MESSAGE = {
    with: 'maya.kessler',
    messages: ['Do you have five minutes to look at the rollback plan?'],
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
export async function seed(mm, log = console.log) {
    const team = await mm.ensureTeam(TEAM);
    log(`  team ${team.display_name} (${team.id})`);

    const users = {};
    const clients = {};
    for (const spec of USERS) {
        const user = await mm.ensureUser(spec);
        users[spec.username] = user;
        await mm.addToTeam(team.id, user.id);

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

    await mm.addToTeam(team.id, mm.me.id);

    const channels = {};
    for (const spec of CHANNELS) {
        const channel = await mm.ensureChannel(team.id, spec);
        channels[spec.name] = channel;
        await mm.addToChannel(channel.id, mm.me.id);
        for (const user of Object.values(users)) {
            await mm.addToChannel(channel.id, user.id);
        }
        if (spec.favorite) {
            await clients[CAPTURE_AS].favoriteChannel(viewer.id, channel.id);
        }
    }
    log(`  channels ${Object.keys(channels).join(', ')}`);

    let posted = 0;
    let threadRoot = null;
    for (const [channelName, messages] of Object.entries(CONVERSATIONS)) {
        const channel = channels[channelName];
        for (const entry of messages) {
            const author = clients[entry.as];
            const root = await author.ensurePostBy(author, mm, channel.id, entry.message);
            posted++;

            if (entry.thread?.length) {
                threadRoot = {id: root.id, channelId: channel.id};
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

            const maya = clients['maya.kessler'];
            if (entry.react) {
                await maya.ensureReaction(users['maya.kessler'].id, root.id, entry.react);
            } else {
                await maya.removeReaction(users['maya.kessler'].id, root.id, 'eyes');
            }

            for (const reply of entry.thread || []) {
                const replier = clients[reply.as];
                await replier.ensurePostBy(replier, mm, channel.id, reply.message, {rootId: root.id});
                posted++;
            }
        }
    }
    log(`  posts ensured (${posted} checked)`);

    // The viewer neither started nor replied to the seeded thread, so follow it explicitly or
    // the Threads view is empty.
    if (threadRoot) {
        await clients[CAPTURE_AS].followThread(viewer.id, team.id, threadRoot.id);
        log('  viewer follows the ops-bridge thread');
    }

    const dm = await mm.ensureDirectChannel(viewer.id, users[DIRECT_MESSAGE.with].id);
    for (const message of DIRECT_MESSAGE.messages) {
        await clients[DIRECT_MESSAGE.with].ensurePost(dm.id, message);
    }
    channels.__dm = dm;
    log(`  direct message with ${DIRECT_MESSAGE.with}`);

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
    log(`  system join messages removed (${systemRemoved})`);

    await clients[CAPTURE_AS].setSidebarPreferences(viewer.id);
    await clients[CAPTURE_AS].setStatus(viewer.id, 'online');
    log('  viewer sidebar preferences and availability pinned');

    await clients[CAPTURE_AS].suppressOnboarding(viewer.id);
    log('  onboarding prompts suppressed');

    return {team, users, channels, viewer, viewerClient: clients[CAPTURE_AS], threadRoot};
}
