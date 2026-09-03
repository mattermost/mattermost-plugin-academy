// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content/types';

const slashCommands: Guide = {

    // Renaming this would orphan saved progress and the asset folder, so the
    // id still mentions workflow automation after that content moved out.
    id: 'slash-command-workflow-automation-quick-start',
    title: 'Slash Commands & Scheduled Messages',
    heroTitle: 'Command your workflow',
    subtitle: 'Drive Mattermost from the message box: run commands without leaving the conversation, and send messages at the moment they land best.',
    description: 'Slash commands and scheduled messages — drive Mattermost without leaving the message box.',
    icon: 'console',
    audiences: ['end-user'],
    doneTitle: 'You\'re driving Mattermost from the keyboard',
    doneSummary: 'You\'ve covered slash command basics, the built-in commands worth memorizing, and scheduled messages.',
    doneLinks: [
        {label: 'Full slash command reference', href: 'https://docs.mattermost.com/integrations-guide/built-in-slash-commands.html'},
        {label: 'Schedule messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/schedule-messages.html'},
    ],
    modules: [
        {
            id: 'slash-command-basics',
            navTitle: 'Slash Command Basics',
            icon: 'console',
            minutes: 1,
            title: 'Slash command basics',
            summary: 'Slash commands are shortcuts you type in a message box to take action instantly — invite someone, change your status, start a call, and more.',
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
        },
        {
            id: 'built-in-commands',
            navTitle: 'Built-in Commands',
            icon: 'format-list-bulleted',
            minutes: 2,
            title: 'Built-in commands',
            summary: 'These commands work out of the box in every Mattermost instance — no plugins or Admin setup required. Click any command to copy it.',
            steps: [
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
            title: 'Scheduled messages',
            summary: 'Compose a message now and send it at exactly the right time — no slash command needed and no Admin setup required.',
            steps: [
                {
                    title: 'Compose your message',
                    description: 'Write your message in any channel or DM as you normally would. When you\'re ready to schedule it, click the <strong>arrow</strong> next to the send button.',
                    media: {
                        type: 'image',
                        file: 'scheduled-messages-step1-9259c4fcaa.svg',
                        alt: 'Message composer with Schedule message menu open',
                    },
                },
                {
                    title: 'Pick a date and time',
                    description: 'Choose a preset time or set a custom date and time — Mattermost queues and sends it automatically.',
                },
                {
                    title: 'When to use it',
                    description: 'Scheduled messages are especially useful when your team spans timezones, when you want to post an announcement at a specific moment, or when you finish writing something in the evening but don\'t want to ping everyone until morning.',
                },
            ],
        },
    ],
};

export default slashCommands;
