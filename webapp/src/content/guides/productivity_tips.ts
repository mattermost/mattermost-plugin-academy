// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content/types';

const productivityTips: Guide = {
    id: 'productivity-tips',
    title: 'Productivity Tips',
    heroTitle: 'Productivity Tips',
    subtitle: 'Keyboard shortcuts, slash commands, and ways to find messages again so you spend less time hunting and more time working.',
    description: 'Keyboard shortcuts, slash commands, and ways to find messages again so you spend less time hunting and more time working.',
    icon: 'lightning-bolt-outline',
    audiences: ['end-user'],
    doneTitle: 'You work faster in Mattermost',
    doneSummary: 'You\'ve covered keyboard shortcuts, slash commands, and ways to come back to a message later. Keep these references handy:',
    doneLinks: [
        {label: 'Keyboard shortcuts', href: 'https://docs.mattermost.com/end-user-guide/collaborate/keyboard-shortcuts.html'},
        {label: 'Full slash command reference', href: 'https://docs.mattermost.com/integrations-guide/built-in-slash-commands.html'},
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
