// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content/types';

const mattermostBasics: Guide = {
    id: 'mattermost-basics',
    title: 'Collaboration Basics',
    heroTitle: 'Collaboration Basics',
    subtitle: 'Channel organization, composing, formatting, and threaded replies — the collaboration habits you use every day.',
    description: 'Channel organization, composing, formatting, and threaded replies — the collaboration habits you use every day.',
    icon: 'message-text-outline',
    audiences: ['end-user'],
    doneTitle: 'You know your way around Mattermost',
    doneSummary: 'You\'ve covered channel organization, composing, formatting, and threaded replies. Keep these references handy:',
    doneLinks: [
        {label: 'Channels documentation', href: 'https://docs.mattermost.com/end-user-guide/collaborate/channel-types.html'},
        {label: 'Format messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/format-messages.html'},
    ],
    modules: [
        {
            id: 'channels-and-sidebar',
            navTitle: 'Channel Organization',
            icon: 'format-list-bulleted',
            minutes: 4,
            title: 'Channel Organization',
            summary: 'Channels hold your team\'s conversations. The sidebar is yours alone — how you organize it is invisible to everyone else.',
            steps: [
                {
                    title: 'Understand channel types',
                    description: '<strong>Public channels</strong> are open to everyone on the team and show a globe icon. <strong>Private channels</strong> are visible only to members and show a lock icon. <strong>Direct messages</strong> are between two people, and <strong>group messages</strong> hold 3 to 7 people. For a larger private conversation, use a private channel instead.',
                },
                {
                    title: 'Browse and join channels',
                    description: 'Select the <strong>plus</strong> icon at the top of the channel sidebar, then select <strong>Browse Channels</strong>. Search by name or scroll the list, and select <strong>Join</strong> next to any public channel. You can filter the list by public, private, or archived channels, and hide channels you already belong to. Private channels require an invite from an existing member.',
                },
                {
                    title: 'Favorite the channels you visit often',
                    description: 'Open a channel and select the <strong>star</strong> icon next to the channel name. Favorites collect in their own <strong>Favorites</strong> category at the top of your sidebar. Select the star again to remove it.',
                },
                {
                    title: 'Group channels into custom categories',
                    description: 'From the <strong>plus</strong> icon at the top of the sidebar, select <strong>Create New Category</strong> and name it — for example Projects or Customers. Drag channels and direct messages into it, and drag whole categories to reorder them. Collapsing a category hides everything except its unread channels.',
                },
                {
                    title: 'Sort and mute custom categories',
                    description: 'Select the <strong>category options</strong> icon, then <strong>Sort</strong> to choose <strong>Alphabetically</strong>, <strong>Recent Activity</strong>, or <strong>Manually</strong>. The same menu has <strong>Mute Category</strong>, which mutes every channel inside it. You can still unmute individual channels within a muted category.',
                },
                {
                    title: 'Eliminate noise using the unreads filter',
                    description: 'Select the <strong>filter</strong> icon at the top of the sidebar to show only channels with unread activity, and select it again to go back. If you prefer this permanently, go to <strong>Settings</strong> > <strong>Sidebar</strong> and turn on <strong>Group unread channels separately</strong> to keep unreads in their own category at the top.',
                },
            ],
        },
        {
            id: 'composing',
            navTitle: 'Composing Messages',
            icon: 'message-text-outline',
            minutes: 4,
            title: 'Composing Messages',
            summary: 'Every message starts in the compose area at the bottom of the channel. Format, attach files, add emoji, and leave a draft to come back to.',
            steps: [
                {
                    title: 'Start in the compose area',
                    description: 'The message box at the bottom of the channel is where you write. Type your message, then select <strong>Send</strong> or press <strong>Enter</strong>. Press <strong>Shift Enter</strong> to add a new line without sending.',
                },
                {
                    title: 'Use the formatting toolbar',
                    description: 'The toolbar below the message box handles bold, italic, and strikethrough text, headings, links, numbered and bulleted lists, quoted text, and code — no syntax to remember. Select the <strong>Show/Hide Formatting</strong> icon to collapse it when you don\'t need it, and <strong>Show/Hide Preview</strong> to see how the message will look before you send. With text selected, <strong>Ctrl B</strong> or <strong>⌘ B</strong> bolds it, <strong>Ctrl I</strong> or <strong>⌘ I</strong> italicizes it, and <strong>Ctrl K</strong> or <strong>⌘ K</strong> turns it into a link.',
                },
                {
                    title: 'Attach files to a message',
                    description: 'Select the <strong>Attachment</strong> icon in the compose area, drag a file into the channel, or paste from your clipboard. You can attach up to 10 files per message. To find a file later, select the <strong>Channel files</strong> icon in the channel header.',
                },
                {
                    title: 'Add emoji to a message',
                    description: 'Select the <strong>emoji</strong> icon in the formatting toolbar to insert an emoji into your message. While typing, <strong>:</strong> followed by a few characters and then Tab autocompletes an emoji.',
                },
                {
                    title: 'React instead of replying',
                    description: 'Hover over a message and select the <strong>emoji</strong> icon to add a reaction. A reaction confirms you\'ve seen something without adding a reply to the thread, and it also stops persistent notifications on an urgent message.',
                },
                {
                    title: 'Leave a draft and come back to it',
                    description: 'Anything you type but don\'t send becomes a draft, collected in the <strong>Drafts</strong> view at the top of the channel sidebar. Drafts sync to the server by default, so a draft started in your browser is waiting for you in the desktop app. To keep drafts on one client only, turn off <strong>Settings</strong> > <strong>Advanced</strong> > <strong>Allow message drafts to sync with the server</strong>.',
                },
            ],
        },
        {
            id: 'formatting',
            navTitle: 'Message Formatting',
            icon: 'text-box-outline',
            minutes: 2,
            title: 'Message Formatting',
            summary: 'A cheat sheet of the markdown you\'ll use day to day. Type these symbols as you write — they do the same thing as the toolbar. Select any item to copy it.',
            steps: [
                {
                    title: 'Type markdown directly',
                    description: 'Once the syntax is in your fingers it\'s faster than the toolbar. The table below is a reference you can come back to. Select any item to copy it.',
                    tip: 'Mattermost also supports in-line images and LaTeX math formulas. See the <a href="https://docs.mattermost.com/end-user-guide/collaborate/format-messages.html">message formatting documentation</a> for the full list.',
                },
            ],
            commandHeaders: {
                command: 'Syntax',
                description: 'What it does',
            },
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
                        {command: '---', description: 'A horizontal line'},
                    ],
                },
            ],
        },
        {
            id: 'threads',
            navTitle: 'Threaded Replies',
            icon: 'message-text-outline',
            minutes: 3,
            title: 'Threaded Replies',
            summary: 'Replying in a thread keeps a side conversation out of the main channel, and the Threads view collects every conversation you care about in one place.',
            steps: [
                {
                    title: 'Reply in a thread',
                    description: 'Hover over a message and select the <strong>reply</strong> icon. Replies collapse under the first message of the thread, so the channel stays readable. Open an existing thread by selecting the message or its reply count.',
                },
                {
                    title: 'Follow and unfollow',
                    description: 'You automatically follow any thread you start, reply to, or are @mentioned in. Toggle the <strong>Follow</strong> or <strong>Following</strong> indicator on a thread, or use <strong>Follow thread</strong> and <strong>Unfollow thread</strong> from the message actions menu. Following a message that has no replies yet means you\'ll hear about it if someone replies later.',
                },
                {
                    title: 'Work from the Threads view',
                    description: 'Select <strong>Threads</strong> at the top of the channel sidebar to see every thread you follow on the current team, with the most recent replies first. Select <strong>Unreads</strong> to narrow the list to threads with unread replies.',
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
    ],
};

export default mattermostBasics;
