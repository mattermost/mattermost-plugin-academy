// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content/types';

const mattermostBasics: Guide = {
    id: 'mattermost-basics',
    title: 'Messaging Basics & Productivity Tips',
    heroTitle: 'Learn the core of daily Mattermost',
    subtitle: 'Seven modules covering channels and your sidebar, threads, notifications, composing, formatting, finding messages again, and the shortcuts that make all of it fast.',
    description: 'Channels, threads, notifications, composing, formatting, and shortcuts — the skills you use every day.',
    icon: 'book-outline',
    audiences: ['end-user'],
    doneTitle: 'You know your way around Mattermost',
    doneSummary: 'You\'ve covered channels and the sidebar, threads, notifications, composing, formatting, saving messages, and shortcuts. Keep these references handy:',
    doneLinks: [
        {label: 'Channels documentation', href: 'https://docs.mattermost.com/end-user-guide/collaborate/channel-types.html'},
        {label: 'Notification preferences', href: 'https://docs.mattermost.com/end-user-guide/preferences/manage-your-notifications.html'},
        {label: 'Keyboard shortcuts', href: 'https://docs.mattermost.com/end-user-guide/collaborate/keyboard-shortcuts.html'},
    ],
    modules: [
        {
            id: 'channels-and-sidebar',
            navTitle: 'Channels & Sidebar',
            icon: 'format-list-bulleted',
            minutes: 4,
            title: 'Channels and your sidebar',
            summary: 'Channels hold your team\'s conversations. The sidebar is yours alone — how you organize it is invisible to everyone else.',
            steps: [
                {
                    title: 'Know the kinds of conversation',
                    description: '<strong>Public channels</strong> are open to everyone on the team and show a globe icon. <strong>Private channels</strong> are visible only to members and show a lock icon. <strong>Direct messages</strong> are between two people, and <strong>group messages</strong> hold 3 to 7 people. For a larger private conversation, use a private channel instead.',
                    media: {
                        type: 'image',
                        file: 'channel-types.webp',
                        alt: 'A sidebar showing public channels with globe icons, a private channel with a lock icon, and a direct message',
                    },
                },
                {
                    title: 'Browse and join channels',
                    description: 'Select the <strong>plus</strong> icon at the top of the channel sidebar, then select <strong>Browse Channels</strong>. Search by name or scroll the list, and select <strong>Join</strong> next to any public channel. You can filter the list by public, private, or archived channels, and hide channels you already belong to. Private channels require an invite from an existing member.',
                    media: {
                        type: 'image',
                        file: 'browse-channels.webp',
                        alt: 'The Browse Channels dialog listing public channels available to join',
                    },
                },
                {
                    title: 'Favorite the channels you live in',
                    description: 'Open a channel and select the <strong>star</strong> icon next to the channel name. Favorites collect in their own <strong>Favorites</strong> category at the top of your sidebar. Select the star again to remove it.',
                    media: {
                        type: 'image',
                        file: 'sidebar-overview.webp',
                        alt: 'The channel sidebar with a Favorites category above the channel list',
                    },
                },
                {
                    title: 'Group channels into custom categories',
                    description: 'From the <strong>plus</strong> icon at the top of the sidebar, select <strong>Create New Category</strong> and name it — for example Projects or Customers. Drag channels and direct messages into it, and drag whole categories to reorder them. Collapsing a category hides everything except its unread channels.',
                    media: {
                        type: 'image',
                        file: 'create-category.webp',
                        alt: 'The Create New Category dialog with a name field',
                    },
                },
                {
                    title: 'Sort and mute',
                    description: 'Select the <strong>category options</strong> icon, then <strong>Sort</strong> to choose <strong>Alphabetically</strong>, <strong>Recent Activity</strong>, or <strong>Manually</strong>. The same menu has <strong>Mute Category</strong>, which mutes every channel inside it. You can still unmute individual channels within a muted category.',
                    media: {
                        type: 'image',
                        file: 'category-menu.webp',
                        alt: 'A category options menu open on the Favorites category, showing Sort and Mute Category',
                    },
                },
                {
                    title: 'Cut the noise with the unreads filter',
                    description: 'Select the <strong>filter</strong> icon at the top of the sidebar to show only channels with unread activity, and select it again to go back. If you prefer this permanently, go to <strong>Settings</strong> > <strong>Sidebar</strong> and turn on <strong>Group unread channels separately</strong> to keep unreads in their own category at the top.',
                    media: {
                        type: 'image',
                        file: 'unreads-filter.webp',
                        alt: 'The unreads filter enabled, narrowing the sidebar to channels with unread messages',
                    },
                    tip: 'Sidebar changes only affect your own view. Read more in the <a href="https://docs.mattermost.com/end-user-guide/preferences/customize-your-channel-sidebar.html">sidebar documentation</a>.',
                },
            ],
        },
        {
            id: 'threads',
            navTitle: 'Threads',
            icon: 'message-text-outline',
            minutes: 3,
            title: 'Threads',
            summary: 'Replying in a thread keeps a side conversation out of the main channel, and the Threads view collects every conversation you care about in one place.',
            steps: [
                {
                    title: 'Reply in a thread',
                    description: 'Hover over a message and select the <strong>reply</strong> icon. Replies collapse under the first message of the thread, so the channel stays readable. Open an existing thread by selecting the message or its reply count.',
                    media: {
                        type: 'image',
                        file: 'thread-reply.webp',
                        alt: 'A channel message with its replies collapsed underneath, showing a reply count',
                    },
                },
                {
                    title: 'Follow and unfollow',
                    description: 'You automatically follow any thread you start, reply to, or are @mentioned in. Toggle the <strong>Follow</strong> or <strong>Following</strong> indicator on a thread, or use <strong>Follow thread</strong> and <strong>Unfollow thread</strong> from the message actions menu. Following a message that has no replies yet means you\'ll hear about it if someone replies later.',
                    media: {
                        type: 'image',
                        file: 'thread-follow.webp',
                        alt: 'An open thread showing the Following indicator that can be toggled off',
                    },
                },
                {
                    title: 'Work from the Threads view',
                    description: 'Select <strong>Threads</strong> at the top of the channel sidebar to see every thread you follow on the current team, with the most recent replies first. Select <strong>Unreads</strong> to narrow the list to threads with unread replies.',
                    media: {
                        type: 'image',
                        file: 'threads-view.webp',
                        alt: 'The Threads view listing followed threads with their most recent replies',
                    },
                },
                {
                    title: 'Clear the backlog',
                    description: 'Select <strong>Mark all as read</strong> in the Threads view to clear the unread status of every thread in the list. Each thread also has its own menu for marking it read or unread, saving it, copying a link to it, or unfollowing it.',
                },
                {
                    title: 'Control notifications thread by thread',
                    description: 'Following is the per-thread switch: follow a thread to be notified about replies, unfollow it to stop. Under <strong>Settings</strong> > <strong>Notifications</strong>, <strong>Notify me about replies to threads I\'m following</strong> controls this behavior everywhere at once, and channel notification preferences can override it for a single channel.',
                },
            ],
        },
        {
            id: 'notifications',
            navTitle: 'Notifications',
            icon: 'bell-outline',
            minutes: 4,
            title: 'Tuning notifications',
            summary: 'Notifications are worth ten minutes of setup. Set the global defaults once, then override them for the few channels that need something different.',
            steps: [
                {
                    title: 'Open your notification settings',
                    description: 'Select the <strong>Settings</strong> icon in the top right of the screen, then select <strong>Notifications</strong>. One place covers desktop, mobile push, and email notifications.',
                    media: {
                        type: 'image',
                        file: 'notification-settings.webp',
                        alt: 'The Notifications tab of Settings, covering desktop, mobile, and email notifications',
                    },
                },
                {
                    title: 'Know what notifies you by default',
                    description: 'You\'re notified when someone @mentions your username or first name, mentions a user group you belong to, or uses <strong>@channel</strong>, <strong>@all</strong>, or <strong>@here</strong>. Direct and group messages notify you, as do replies in threads you follow. Everything else just marks the channel as unread.',
                },
                {
                    title: 'Add keywords that trigger notifications',
                    description: 'In <strong>Settings</strong> > <strong>Notifications</strong>, add keywords so a project name, customer, or topic notifies you the way an @mention does. Keywords aren\'t case sensitive. Separate them with commas or by pressing Tab, and use Backspace to remove one. Depending on your plan you can also highlight keywords without triggering any notification.',
                    media: {
                        type: 'image',
                        file: 'notification-keywords.webp',
                        alt: 'The keywords section of notification settings, expanded for editing',
                    },
                },
                {
                    title: 'Override settings for a single channel',
                    description: 'Select the channel name, then <strong>Notification Preferences</strong>. You can <strong>mute the channel</strong>, choose <strong>Ignore mentions for @channel, @here and @all</strong>, change what the channel notifies you about, pick a notification sound, and auto-follow every new thread started there.',
                    media: {
                        type: 'image',
                        file: 'channel-notification-preferences.webp',
                        alt: 'The Notification Preferences dialog for a single channel, with a mute option',
                    },
                },
                {
                    title: 'Use Do Not Disturb and a custom status',
                    description: 'Select your profile picture to set your availability to <strong>Online</strong>, <strong>Away</strong>, <strong>Do Not Disturb</strong>, or <strong>Offline</strong>. Do Not Disturb turns off desktop, email, and push notifications, and you choose a preset expiry, a custom one, or <strong>Don\'t clear</strong>. From the same menu, <strong>Set a custom status</strong> adds an emoji and a short message next to your name, with an option for when it clears.',
                    media: {
                        type: 'image',
                        file: 'status-menu.webp',
                        alt: 'The availability menu open, showing Online, Away, Do Not Disturb, and Offline',
                    },
                },
            ],
        },
        {
            id: 'composing',
            navTitle: 'Composing',
            icon: 'clock-send-outline',
            minutes: 4,
            title: 'Composing messages',
            summary: 'The message box does more than send text. Save a draft, send it at a better hour, and mark the rare message that genuinely cannot wait.',
            steps: [
                {
                    title: 'Leave a draft and come back to it',
                    description: 'Anything you type but don\'t send becomes a draft, collected in the <strong>Drafts</strong> view at the top of the channel sidebar. Drafts sync to the server by default, so a draft started in your browser is waiting for you in the desktop app. To keep drafts on one client only, turn off <strong>Settings</strong> > <strong>Advanced</strong> > <strong>Allow message drafts to sync with the server</strong>.',
                    media: {
                        type: 'image',
                        file: 'drafts-view.webp',
                        alt: 'The Drafts view listing an unsent message with the channel it belongs to',
                    },
                },
                {
                    title: 'Schedule a message for later',
                    description: 'Write the message, then select the right side of the <strong>Send</strong> button. Pick a preset or a custom time — Mattermost shows both your local time and the recipient\'s. Scheduled messages wait in the <strong>Drafts</strong> view under the <strong>Scheduled</strong> tab, where you can edit, reschedule, send now, or delete them.',
                },
                {
                    title: 'Set message priority',
                    description: 'Select the <strong>Message Priority</strong> icon in the formatting toolbar and choose <strong>Standard</strong>, <strong>Important</strong>, or <strong>Urgent</strong>. Priority applies to the first message of a thread, and the label appears next to your name in the channel and in the Threads view.',
                    media: {
                        type: 'image',
                        file: 'message-priority.webp',
                        alt: 'The message priority menu offering Standard, Important, and Urgent',
                    },
                },
                {
                    title: 'Request an acknowledgement',
                    description: 'Turn on <strong>Request acknowledgement</strong> to add an <strong>Acknowledge</strong> button below your sent message. Hover the acknowledged icon to see exactly who has confirmed it. Marking a message <strong>Urgent</strong> requests an acknowledgement automatically.',
                },
                {
                    title: 'Send persistent notifications when it truly cannot wait',
                    description: 'On an <strong>Urgent</strong> message that @mentions at least one person or group, select <strong>Send persistent notifications</strong>. Those people are notified repeatedly until someone replies, acknowledges, or reacts to the message. Anyone set to Do Not Disturb is not notified.',
                    tip: 'Server-synced drafts, scheduled messages, message priority, acknowledgements, and persistent notifications can each be turned off by a system admin. If you don\'t see one of these options, ask whether it\'s enabled on your instance.',
                },
            ],
        },
        {
            id: 'formatting',
            navTitle: 'Formatting',
            icon: 'text-box-outline',
            minutes: 3,
            title: 'Formatting',
            summary: 'A code block or a short list makes a message far easier to read. Use the toolbar, or type markdown directly — both produce the same result.',
            steps: [
                {
                    title: 'Use the formatting toolbar',
                    description: 'The toolbar below the message box handles bold, italic, and strikethrough text, headings, links, attachments, numbered and bulleted lists, quoted text, code, emojis and GIFs, and message priority — no syntax to remember. Select the <strong>Show/Hide Formatting</strong> icon to collapse the toolbar when you don\'t need it.',
                    media: {
                        type: 'image',
                        file: 'formatting-toolbar.webp',
                        alt: 'The message box with its formatting toolbar for bold, italic, lists, and code',
                    },
                },
                {
                    title: 'Preview before you send',
                    description: 'Select the <strong>Show/Hide Preview</strong> icon to see how the message will look once posted, then select it again to return to your draft. This is worth doing for anything with a table or a long code block.',
                    media: {
                        type: 'image',
                        file: 'formatting-preview.webp',
                        alt: 'A message with markdown shown in preview mode, rendered as it will appear once sent',
                    },
                },
                {
                    title: 'Learn the three shortcuts you\'ll use constantly',
                    description: 'With text selected, press <strong>Ctrl B</strong> or <strong>⌘ B</strong> to bold it, <strong>Ctrl I</strong> or <strong>⌘ I</strong> to italicize it, and <strong>Ctrl K</strong> or <strong>⌘ K</strong> to turn it into a link.',
                },
                {
                    title: 'Type markdown directly',
                    description: 'Once the syntax is in your fingers it\'s faster than the toolbar. The reference below covers what you\'ll use day to day. Select any item to copy it.',
                    tip: 'Mattermost also supports task lists, horizontal lines, in-line images, and LaTeX math formulas. See the <a href="https://docs.mattermost.com/end-user-guide/collaborate/format-messages.html">message formatting documentation</a> for the full list.',
                },
            ],
            commandGroups: [
                {
                    label: 'Text',
                    items: [
                        {command: '**bold**', description: 'Bold text'},
                        {command: '*italics*', description: 'Italic text'},
                        {command: '~~strikethrough~~', description: 'Struck-out text'},
                        {command: '`code`', description: 'In-line monospaced code'},
                    ],
                },
                {
                    label: 'Blocks',
                    items: [
                        {command: '# Heading', description: 'A heading — add more # characters for smaller headings'},
                        {command: '> quoted text', description: 'An indented block quote'},
                        {command: '```', description: 'Put three backticks on their own line above and below a block of code'},
                        {command: '```go', description: 'Name a language after the opening backticks for syntax highlighting'},
                    ],
                },
                {
                    label: 'Lists',
                    items: [
                        {command: '- item', description: 'A bulleted list — indent two spaces for a sub-point'},
                        {command: '1. item', description: 'A numbered list'},
                        {command: '- [ ] task', description: 'A task list — replace the space with x to mark it complete'},
                    ],
                },
                {
                    label: 'Links and tables',
                    items: [
                        {command: '[label](https://example.com)', description: 'A link with your own label instead of the raw URL'},
                        {command: '~channel-name', description: 'A link to a channel'},
                        {command: '| Column A | Column B |', description: 'A table row — put a row of dashes under the header row'},
                    ],
                },
            ],
        },
        {
            id: 'finding-it-again',
            navTitle: 'Finding It Again',
            icon: 'bookmark-outline',
            minutes: 3,
            title: 'Finding it again',
            summary: 'Five ways to make sure a message comes back to you: some are private to you, some mark it for everyone in the channel.',
            steps: [
                {
                    title: 'Save a message for yourself',
                    description: 'Select the <strong>Save</strong> icon in the message actions to add a message to your saved list. Saved messages are private to you. Open them with the <strong>bookmark</strong> icon to the left of your profile picture, and select the Save icon again to clear one.',
                    media: {
                        type: 'image',
                        file: 'saved-messages.webp',
                        alt: 'The Saved messages pane listing a message saved for later',
                    },
                },
                {
                    title: 'Pin a message for the channel',
                    description: 'From the message actions menu, select <strong>Pin to Channel</strong>. Pinned messages are visible to every channel member and open from the <strong>Pinned messages</strong> icon in the channel header. Use this for decisions, links, and standing context — not for your own to-do list.',
                    media: {
                        type: 'image',
                        file: 'message-actions-menu.webp',
                        alt: 'A message actions menu open, showing Pin to Channel, Remind, and Mark as Unread',
                    },
                },
                {
                    title: 'Set a reminder',
                    description: 'From the message actions menu, select <strong>Remind</strong>, then pick a preset or a custom date and time. At that moment you get a direct message containing the original. You can set one reminder per message, and recurring reminders aren\'t supported.',
                    media: {
                        type: 'image',
                        file: 'remind-menu.webp',
                        alt: 'The Remind submenu offering preset times and a custom option',
                    },
                },
                {
                    title: 'Mark a message unread',
                    description: 'From the message actions menu, select <strong>Mark as Unread</strong>. The channel goes bold in your sidebar and the message groups with everything else you haven\'t handled — useful when you read something you can\'t deal with right now.',
                },
                {
                    title: 'Copy a permanent link',
                    description: 'From the message actions menu, select <strong>Copy Link</strong>. The timestamp next to any message is also a permanent link. Pasting a message link generates a preview, and previews respect channel membership, so only people who already have access can see the content.',
                },
            ],
        },
        {
            id: 'speed',
            navTitle: 'Speed',
            icon: 'lightning-bolt-outline',
            minutes: 3,
            title: 'Speed',
            summary: 'The difference between a slow and a fast Mattermost user is mostly the quick switcher and four or five shortcuts.',
            steps: [
                {
                    title: 'Jump anywhere with the quick switcher',
                    description: 'Press <strong>Ctrl K</strong> or <strong>⌘ K</strong> to open the channel switcher. Type a few characters to reach any channel you\'re a member of across all your teams, plus direct and group messages, unread channels, and threads. Muted channels are left out of the results.',
                    media: {
                        type: 'image',
                        file: 'quick-switcher.webp',
                        alt: 'The quick switcher open, matching channels as you type',
                    },
                },
                {
                    title: 'Learn a handful of shortcuts',
                    description: '<strong>Ctrl ⇧ K</strong> opens the direct messages dialog, <strong>Ctrl ⇧ A</strong> opens Settings, and <strong>Ctrl ⇧ M</strong> opens recent mentions. <strong>Alt ↑</strong> and <strong>Alt ↓</strong> step through the sidebar; add <strong>Shift</strong> to move only between channels with unread messages. On Mac, use <strong>⌘</strong> and <strong>⌥</strong> in place of Ctrl and Alt.',
                    tip: 'Type <strong>/shortcuts</strong> in any message box for the full list, or see the <a href="https://docs.mattermost.com/end-user-guide/collaborate/keyboard-shortcuts.html">keyboard shortcuts documentation</a>.',
                },
                {
                    title: 'Check your recent mentions',
                    description: 'Select the <strong>@</strong> icon near the search box to open recent mentions in the right pane. It collects every message that mentioned you or matched one of your keywords, so you can work through them without hunting channel by channel.',
                    media: {
                        type: 'image',
                        file: 'recent-mentions.webp',
                        alt: 'The Recent mentions pane collecting messages that mentioned you',
                    },
                },
                {
                    title: 'React instead of replying',
                    description: 'Hover over a message and select the <strong>emoji</strong> icon to add a reaction. A reaction confirms you\'ve seen something without adding a reply to the thread, and it also stops persistent notifications on an urgent message. While typing, <strong>:</strong> followed by a few characters and then Tab autocompletes an emoji.',
                    media: {
                        type: 'image',
                        file: 'emoji-reaction.webp',
                        alt: 'The emoji picker open on a message, ready to add a reaction',
                    },
                },
            ],
        },
    ],
};

export default mattermostBasics;
