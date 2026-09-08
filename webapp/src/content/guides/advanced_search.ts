// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLUGIN_IDS} from 'content/plugins';
import type {Guide} from 'content/types';

const advancedSearch: Guide = {
    id: 'advanced-search',
    title: 'Advanced Search Techniques',
    heroTitle: 'Advanced Search Techniques',
    subtitle: 'Search filters, precision syntax, file search, and AI semantic search to find the right message in seconds.',
    description: 'Search filters, precision syntax, file search, and AI semantic search to find the right message in seconds.',
    icon: 'search-list',
    audiences: ['end-user'],
    doneTitle: 'You can find anything in Mattermost',
    doneSummary: 'You\'ve covered search scope, filters, precision syntax, file search, and semantic search. Keep the full reference handy:',
    doneLinks: [
        {label: 'Search for messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/search-for-messages.html'},
        {label: 'Save and pin messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/save-pin-messages.html'},
    ],
    modules: [
        {
            id: 'search-basics',
            navTitle: 'Search Basics',
            icon: 'magnify',
            minutes: 3,
            title: 'Search Basics',
            summary: 'Every search starts with two decisions — whether you want messages or files, and how wide to cast the net across your teams.',
            steps: [
                {
                    title: 'Choose Messages or Files',
                    description: 'Select the <strong>Search</strong> field, then select <strong>Messages</strong> to search message text or <strong>Files</strong> to search files attached to messages. The two tabs return separate result sets, so switch tabs if the first search comes up empty.',
                },
                {
                    title: 'Set how many teams to search',
                    description: 'By default your results cover all channels in your current team. Select <strong>All Teams</strong> to search every team you belong to, or pick a single specific team instead.',
                },
                {
                    title: 'Know what search matches',
                    description: 'A multi-word search returns only messages that contain <strong>all</strong> of your terms. Very common words such as <code>the</code> and <code>are</code>, along with one- and two-letter terms, are filtered out. URLs and IP addresses do not return results.',
                    tip: 'You can search archived channels as long as you were a member of them. To drop archived channels from your results, leave the archived channel.',
                },
                {
                    title: 'Jump to a message in context',
                    description: 'Results open in the Search Results pane on the right. Select <strong>Jump</strong> on any result to move the center pane to that message in its original channel and thread.',
                },
                {
                    title: 'Keep results open while you work',
                    description: 'On the web or desktop app, select the <strong>Open in new window</strong> icon in the Search Results header to pop your results out into a separate window, so you can keep browsing channels without losing them.',
                },
            ],
        },
        {
            id: 'search-filters',
            navTitle: 'Search Filters',
            icon: 'account-multiple-outline',
            minutes: 4,
            title: 'Search Filters',
            summary: 'Pin a search to a person, a conversation, or a date. These modifiers stack, so a few of them turn a noisy result list into a handful of messages.',
            steps: [
                {
                    title: 'Filter by person',
                    description: 'Add <code>from:</code> and a username to return only what that person posted. For example, <code>budget from:john.smith</code> returns messages containing "budget" that John Smith wrote.',
                    tip: 'When you search across <strong>All Teams</strong>, type <code>from:</code> yourself. Autocomplete does not offer it in a cross-team search, but the modifier still works.',
                },
                {
                    title: 'Filter by channel',
                    description: 'Add <code>in:</code> and a channel to stay in one conversation — <code>Mattermost in:town-square</code>. <code>in:</code> also works on direct messages, group messages, and private channels you belong to, as in <code>Mattermost in:john.doe</code>.',
                },
                {
                    title: 'Filter by date',
                    description: '<code>before:</code> returns content posted earlier than a date, <code>after:</code> later than a date, and <code>on:</code> that day only. For example, <code>website before:2026-03-01</code>, <code>website after:2026-02-01</code>, or <code>website on:2026-03-01</code>. Selecting a date modifier from autocomplete opens a date picker; if you type it, use <code>YYYY-MM-DD</code>.',
                },
                {
                    title: 'Combine filters',
                    description: 'Modifiers stack. <code>deploy from:john.smith in:release-discussion</code> returns only messages about "deploy" that John posted in that channel. Add dates the same way — <code>website after:2026-02-01 before:2026-03-01 from:john.smith</code> brackets a window and a person at once.',
                },
            ],
        },
        {
            id: 'precision',
            navTitle: 'Precision Search',
            icon: 'filter-variant',
            minutes: 4,
            title: 'Sharpen a noisy search',
            summary: 'When a search returns hundreds of results, these four techniques cut the noise: exact phrases, exclusions, wildcards, and hashtags. Select any modifier below to copy it.',
            steps: [
                {
                    title: 'Quote an exact phrase',
                    description: 'Wrap terms in quotation marks to match them together and in order. Searching <code>"Mattermost website"</code> returns messages containing that exact phrase, and skips messages that happen to mention "Mattermost" and "website" separately.',
                },
                {
                    title: 'Exclude terms with a hyphen',
                    description: 'Prefix a term with <code>-</code> to remove it from your results. Searching <code>test -release</code> returns results containing "test" that do not contain "release".',
                },
                {
                    title: 'Exclude whole channels and people',
                    description: 'The hyphen also works in front of a modifier. <code>test -release -in:release-discussion -from:eric</code> keeps results for "test" while dropping the term "release", that one channel, and that one sender.',
                },
                {
                    title: 'Match word beginnings with a wildcard',
                    description: 'Add <code>*</code> to the end of a word to match everything starting with those letters. Searching <code>rea*</code> matches "reach", "reason", "reality", and "real". The wildcard only works at the end of a word, so <code>*each</code> and <code>re*ch</code> are not valid.',
                },
                {
                    title: 'Search hashtags',
                    description: 'Hashtags are searchable labels anyone can add to a message with <code>#</code>. Select a hashtag in an existing post, or type it including the pound symbol, to find every message tagged with it.',
                    tip: 'Hashtags are not channel links. Selecting <code>#marketing</code> does not open the Marketing channel. To link a public channel, use the tilde symbol instead, as in <code>~marketing</code>.',
                },
            ],
            commandGroups: [
                {
                    label: 'People and channels',
                    items: [
                        {command: 'from:john.smith', description: 'Only messages from a specific person'},
                        {command: 'in:town-square', description: 'Only messages in a specific channel, DM, or group message'},
                    ],
                },
                {
                    label: 'Dates',
                    items: [
                        {command: 'before:2026-03-01', description: 'Posted before a date'},
                        {command: 'after:2026-02-01', description: 'Posted after a date'},
                        {command: 'on:2026-03-01', description: 'Posted on a single date'},
                    ],
                },
                {
                    label: 'Exact and excluded terms',
                    items: [
                        {command: '"quarterly roadmap"', description: 'The exact phrase, not the words separately'},
                        {command: '-release', description: 'Exclude a term'},
                        {command: '-in:release-discussion', description: 'Exclude a channel'},
                        {command: '-from:eric', description: 'Exclude a person'},
                    ],
                },
                {
                    label: 'Wildcards and hashtags',
                    items: [
                        {command: 'rea*', description: 'Words starting with "rea", such as "reach" and "reason"'},
                        {command: '#bug', description: 'Messages tagged with a hashtag'},
                    ],
                },
                {
                    label: 'Files',
                    items: [
                        {command: 'ext:pdf', description: 'Files with a specific extension, in the Files tab'},
                    ],
                },
            ],
        },
        {
            id: 'file-search',
            navTitle: 'File Search',
            icon: 'text-box-outline',
            minutes: 3,
            title: 'Find files and what is inside them',
            summary: 'The Files tab searches attachments by name and, for supported document types, by the text inside them.',
            steps: [
                {
                    title: 'Switch to the Files tab',
                    description: 'Select the <strong>Search</strong> field, then select <strong>Files</strong>. Each result shows the file name, extension, and size, plus when and where it was shared. As with messages, you can scope the search to the current team, a specific team, or all teams.',
                },
                {
                    title: 'Filter by file extension',
                    description: 'Use <code>ext:</code> followed by an extension to return only that file type, as in <code>ext:pdf</code>. The search autocomplete suggests extensions as you type, so you do not have to remember them.',
                },
                {
                    title: 'Filter by file category instead',
                    description: 'On the web or desktop app, select the <strong>File Type Filter</strong> option in the results header to narrow by category — documents, spreadsheets, or images — rather than by a single extension.',
                },
                {
                    title: 'Search the text inside documents',
                    description: 'File search matches on file name and, for supported document formats, on the text content inside the file. Supported formats include PDF, PPTX, DOCX, ODT, HTML, and plain text.',
                    tip: 'Whether document contents are searchable depends on a server setting your system admin controls, and it can also depend on when the file was uploaded. If a file you know exists is not matching on its contents, ask your system admin whether document content search is enabled.',
                },
                {
                    title: 'Stack modifiers on file searches too',
                    description: '<code>from:</code>, <code>in:</code>, <code>before:</code>, <code>after:</code>, and <code>on:</code> all work in the Files tab. <code>budget from:john.smith ext:pdf after:2026-02-01</code> finds one PDF instead of a page of them.',
                },
                {
                    title: 'Browse a channel\'s recent files',
                    description: 'When you know which channel a file landed in, skip search entirely. Select the channel name, select <strong>View Info</strong>, then select <strong>Files</strong> in the right pane to see what has been shared there recently.',
                },
            ],
        },
        {
            id: 'channels-mentions-saved',
            navTitle: 'Mentions & Saved',
            icon: 'at',
            minutes: 3,
            title: 'Channel search, recent mentions, and saved posts',
            summary: 'Search is not always the fastest route. Three shortcuts get you to a channel, a mention of your name, or something you set aside earlier.',
            steps: [
                {
                    title: 'Search only the channel you\'re in',
                    description: 'Press <strong>Ctrl+Shift+F</strong> on Windows or Linux, or <strong>Cmd+Shift+F</strong> on Mac, to move focus to the search field with the current channel already scoped. This is the fastest way to search one conversation without typing an <code>in:</code> modifier.',
                },
                {
                    title: 'Find a channel rather than a message',
                    description: 'Select <strong>Find channel</strong> in the channel sidebar, or press <strong>Ctrl+K</strong> on Windows or Linux, or <strong>Cmd+K</strong> on Mac. This searches every channel you belong to across all your teams, including private channels, DMs, and group messages. Muted channels are not included.',
                },
                {
                    title: 'Join a channel you are not in yet',
                    description: 'Select the <strong>Plus</strong> icon at the top of the channel sidebar, then select <strong>Browse Channels</strong> to see public channels you have not joined. Filter the list by public, private, or archived, and hide channels you are already a member of.',
                },
                {
                    title: 'Review your recent mentions',
                    description: 'Select the <strong>@</strong> icon next to the search field, or press <strong>Ctrl+Shift+M</strong> on Windows or Linux, or <strong>Cmd+Shift+M</strong> on Mac. This lists recent messages that mention you or contain one of your keyword triggers. Select <strong>Jump</strong> to open any of them in context.',
                },
                {
                    title: 'Set messages aside and come back to them',
                    description: 'Select the <strong>Save</strong> icon next to any message to save it for yourself only — nobody else sees that you saved it. Select the <strong>Bookmark</strong> icon to the left of your profile picture to open your full list of saved messages in the right-hand pane.',
                    tip: 'Saving is private to you. Pinning is the shared equivalent — a pinned message is visible to every member of the channel from the Pinned posts icon in the channel header.',
                },
            ],
        },
        {
            id: 'semantic-search',
            navTitle: 'AI Search',
            icon: 'robot-happy',
            minutes: 2,
            requiresPlugins: [PLUGIN_IDS.agents],
            title: 'Search in plain language with AI',
            summary: 'Semantic search matches on meaning rather than on exact words, so you can ask a question instead of guessing which keywords someone used.',
            steps: [
                {
                    title: 'Switch the search pane to Agents',
                    description: 'Open the <strong>Search</strong> pane and select the <strong>Agents</strong> option to run a semantic search instead of a keyword search.',
                },
                {
                    title: 'Ask a full question',
                    description: 'Type what you are looking for the way you would ask a colleague — for example, <code>what did we decide about the pricing change?</code> You do not need modifiers, quotation marks, or exact wording.',
                },
                {
                    title: 'Know which search to reach for',
                    description: 'Use keyword search and modifiers when you know a specific term, sender, channel, or date. Use semantic search when you remember the <strong>topic</strong> of a discussion but not the words anyone used.',
                },
                {
                    title: 'Go further with Agents',
                    description: 'Semantic search is one part of what Agents can do. The <a href="/academy/guides/ai-quick-start">AI Acceleration with Agents</a> guide covers thread and channel summaries, call summaries, message rewrites, and custom agents.',
                },
            ],
        },
    ],
};

export default advancedSearch;
