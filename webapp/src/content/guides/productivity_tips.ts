// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content/types';

const productivityTips: Guide = {
    id: 'productivity-tips',
    title: 'Productivity Tips',
    heroTitle: 'Productivity Tips',
    subtitle: 'Keyboard shortcuts, slash commands, scheduled messages, priority, notifications, and ways to find messages again.',
    description: 'Keyboard shortcuts, slash commands, scheduled messages, priority, notifications, and ways to find messages again.',
    icon: 'lightning-bolt-outline',
    audiences: ['end-user'],
    doneTitle: 'You work faster in Mattermost',
    doneSummary: 'You\'ve covered shortcuts, slash commands, scheduled messages, priority, notifications, and ways to come back to a message later. Keep these references handy:',
    doneLinks: [
        {label: 'Keyboard shortcuts', href: 'https://docs.mattermost.com/end-user-guide/collaborate/keyboard-shortcuts.html'},
        {label: 'Full slash command reference', href: 'https://docs.mattermost.com/integrations-guide/built-in-slash-commands.html'},
        {label: 'Schedule messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/schedule-messages.html'},
        {label: 'Set message priority', href: 'https://docs.mattermost.com/end-user-guide/collaborate/message-priority.html'},
        {label: 'Notification preferences', href: 'https://docs.mattermost.com/end-user-guide/preferences/manage-your-notifications.html'},
        {label: 'Save and pin messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/save-pin-messages.html'},
    ],
    modules: [
        {
            id: 'keyboard-shortcuts',
            navTitle: 'Keyboard Shortcuts',
            icon: 'key-variant',
            minutes: 2,
            title: 'Keyboard Shortcuts',
            summary: 'The difference between a slow and a fast Mattermost user is mostly the quick switcher and four or five shortcuts.',
            steps: [
                {
                    title: 'Jump anywhere with the quick switcher',
                    description: 'Press <strong>Ctrl K</strong> or <strong>⌘ K</strong> to open the channel switcher. Type a few characters to reach any channel you\'re a member of across all your teams, plus direct and group messages, unread channels, and threads. Muted channels are left out of the results.',
                },
                {
                    title: 'Learn a handful of shortcuts',
                    description: '<strong>Ctrl ⇧ K</strong> opens the direct messages dialog, <strong>Ctrl ⇧ A</strong> opens Settings, and <strong>Ctrl ⇧ M</strong> opens recent mentions. <strong>Alt ↑</strong> and <strong>Alt ↓</strong> step through the sidebar; add <strong>Shift</strong> to move only between channels with unread messages. On Mac, use <strong>⌘</strong> and <strong>⌥</strong> in place of Ctrl and Alt.',
                    tip: 'Type <strong>/shortcuts</strong> in any message box for the full list, or see the <a href="https://docs.mattermost.com/end-user-guide/collaborate/keyboard-shortcuts.html">keyboard shortcuts documentation</a>.',
                },
            ],
        },
        {
            id: 'slash-commands',
            navTitle: 'Slash Commands',
            icon: 'console',
            minutes: 3,
            title: 'Slash Commands',
            summary: 'Slash commands are shortcuts you type in a message box to take action instantly — invite someone, change your status, start a call, and more. The commands below work out of the box. Click any command to copy it.',
            steps: [
                {
                    title: 'Open the command picker',
                    description: 'Type / to see available commands in the autocomplete list. This works in channels, DMs, and threads. The same / entry point gives you access to all built-in and Admin-configured commands in your instance.',
                },
                {
                    title: 'Filter and select',
                    description: 'Autocomplete filters matching commands in real time. Use the up and down arrow keys to navigate options, then press <strong>Tab</strong> or <strong>Enter</strong> to select one.',
                },
            ],
            commandGroups: [
                {
                    label: 'People',
                    items: [
                        {command: '/invite @username', description: 'Invite someone to the current channel'},
                        {command: '/remove @username', description: 'Remove someone from the current channel'},
                    ],
                },
                {
                    label: 'Channels',
                    items: [
                        {command: '/join channel-name', description: 'Join a channel'},
                        {command: '/leave', description: 'Leave the current channel'},
                        {command: '/mute', description: 'Silence notifications for the current channel'},
                        {command: '/header', description: 'Edit the current channel header'},
                    ],
                },
                {
                    label: 'Conversations',
                    items: [
                        {command: '/msg @username', description: 'Send a direct message'},
                        {command: '/search', description: 'Search message text'},
                        {command: '/collapse', description: 'Collapse image previews by default'},
                        {command: '/expand', description: 'Expand image previews by default'},
                    ],
                },
                {
                    label: 'Status',
                    items: [
                        {command: '/status', description: 'Set a custom status message and emoji'},
                        {command: '/away', description: 'Set availability to Away'},
                        {command: '/offline', description: 'Set availability to Offline'},
                        {command: '/online', description: 'Set availability to Online'},
                        {command: '/dnd', description: 'Set availability to Do Not Disturb'},
                    ],
                },
                {
                    label: 'Calls',
                    items: [
                        {command: '/call start', description: 'Start a call in this channel'},
                        {command: '/call join', description: 'Join a call in this channel'},
                    ],
                },
                {
                    label: 'General',
                    items: [
                        {command: '/shortcuts', description: 'Show keyboard shortcuts'},
                        {command: '/settings', description: 'Open Settings'},
                    ],
                },
            ],
        },
        {
            id: 'scheduled-messages',
            navTitle: 'Scheduled Messages',
            icon: 'clock-send-outline',
            minutes: 2,
            title: 'Scheduled Messages',
            summary: 'Write now, send later. Scheduled messages wait in Drafts until the time you picked — or until you send them yourself.',
            steps: [
                {
                    title: 'Schedule a message for later',
                    description: 'Write the message, then select the right side of the <strong>Send</strong> button. Pick a preset or a custom time — Mattermost shows both your local time and the recipient\'s.',
                    media: {
                        type: 'image',
                        file: 'scheduled-messages-step1-9259c4fcaa.svg',
                        alt: 'Message composer with Schedule message menu open',
                    },
                },
                {
                    title: 'Manage scheduled messages from Drafts',
                    description: 'Scheduled messages wait in the <strong>Drafts</strong> view under the <strong>Scheduled</strong> tab. From there you can edit, reschedule, send now, or delete them.',
                },
            ],
        },
        {
            id: 'message-priority',
            navTitle: 'Message Priority',
            icon: 'flag-outline',
            minutes: 3,
            title: 'Message Priority',
            summary: 'Mark the rare message that cannot wait. Priority, acknowledgements, and persistent notifications make important messages harder to miss.',
            steps: [
                {
                    title: 'Set message priority',
                    description: 'Select the <strong>Message Priority</strong> icon in the formatting toolbar and choose <strong>Standard</strong>, <strong>Important</strong>, or <strong>Urgent</strong>. Priority applies to the first message of a thread, and the label appears next to your name in the channel and in the Threads view.',
                },
                {
                    title: 'Request an acknowledgement',
                    description: 'Turn on <strong>Request acknowledgement</strong> to add an <strong>Acknowledge</strong> button below your sent message. Hover the acknowledged icon to see exactly who has confirmed it. Marking a message <strong>Urgent</strong> requests an acknowledgement automatically.',
                },
                {
                    title: 'Send persistent notifications when it truly cannot wait',
                    description: 'On an <strong>Urgent</strong> message that @mentions at least one person or group, select <strong>Send persistent notifications</strong>. Those people are notified repeatedly until someone replies, acknowledges, or reacts to the message. Anyone set to Do Not Disturb is not notified.',
                },
            ],
        },
        {
            id: 'notifications',
            navTitle: 'Tuning Notifications',
            icon: 'bell-outline',
            minutes: 4,
            title: 'Tuning Notifications',
            summary: 'Notifications are worth ten minutes of setup. Set the global defaults once, then override them for the few channels that need something different.',
            steps: [
                {
                    title: 'Open your notification settings',
                    description: 'Select the <strong>Settings</strong> icon in the top right of the screen, then select <strong>Notifications</strong>. One place covers desktop, mobile push, and email notifications.',
                },
                {
                    title: 'See what notifies you by default',
                    description: 'You\'re notified when someone @mentions your username or first name, mentions a user group you belong to, or uses <strong>@channel</strong>, <strong>@all</strong>, or <strong>@here</strong>. Direct and group messages notify you, as do replies in threads you follow. Everything else just marks the channel as unread.',
                },
                {
                    title: 'Add keywords that trigger notifications',
                    description: 'In <strong>Settings</strong> > <strong>Notifications</strong>, add keywords so a project name, customer, or topic notifies you the way an @mention does. Keywords aren\'t case sensitive. Separate them with commas or by pressing Tab, and use Backspace to remove one. Depending on your plan you can also highlight keywords without triggering any notification.',
                },
                {
                    title: 'Override settings for a single channel',
                    description: 'Select the channel name, then <strong>Notification Preferences</strong>. You can <strong>mute the channel</strong>, choose <strong>Ignore mentions for @channel, @here and @all</strong>, change what the channel notifies you about, pick a notification sound, and auto-follow every new thread started there.',
                },
                {
                    title: 'Use Do Not Disturb and a custom status',
                    description: 'Select your profile picture to set your availability to <strong>Online</strong>, <strong>Away</strong>, <strong>Do Not Disturb</strong>, or <strong>Offline</strong>. Do Not Disturb turns off desktop, email, and push notifications, and you choose a preset expiry, a custom one, or <strong>Don\'t clear</strong>. From the same menu, <strong>Set a custom status</strong> adds an emoji and a short message next to your name, with an option for when it clears.',
                },
            ],
        },
        {
            id: 'finding-messages-again',
            navTitle: 'Finding Messages Again',
            icon: 'bookmark-outline',
            minutes: 4,
            title: 'Finding Messages Again',
            summary: 'Six ways to make sure a message comes back to you: check what mentioned you, then mark the ones you need later — some marks are private, some are for everyone in the channel.',
            steps: [
                {
                    title: 'Check your recent mentions',
                    description: 'Select the <strong>@</strong> icon near the search box to open recent mentions in the right pane. It collects every message that mentioned you or matched one of your keywords, so you can work through them without hunting channel by channel.',
                },
                {
                    title: 'Save a message for yourself',
                    description: 'Select the <strong>Save</strong> icon in the message actions to add a message to your saved list. Saved messages are private to you. Open them with the <strong>bookmark</strong> icon to the left of your profile picture, and select the Save icon again to clear one.',
                },
                {
                    title: 'Pin a message for the channel',
                    description: 'From the message actions menu, select <strong>Pin to Channel</strong>. Pinned messages are visible to every channel member and open from the <strong>Pinned messages</strong> icon in the channel header. Use this for decisions, links, and standing context — not for your own to-do list.',
                },
                {
                    title: 'Set a reminder',
                    description: 'From the message actions menu, select <strong>Remind</strong>, then pick a preset or a custom date and time. At that moment you get a direct message containing the original. You can set one reminder per message, and recurring reminders aren\'t supported.',
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
    ],
};

export default productivityTips;
