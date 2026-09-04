// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLUGIN_IDS} from 'content/plugins';
import type {Guide} from 'content/types';

const advancedSearch: Guide = {
    id: 'advanced-search',
    title: 'Advanced Search',
    heroTitle: 'Find anything in Mattermost',
    subtitle: 'Search modifiers, date filters, precision syntax, file search, and AI semantic search — everything you need to find the right message in seconds.',
    description: 'Search modifiers, date filters, precision syntax, file search, and AI semantic search — find any message fast.',
    icon: 'search-list',
    audiences: ['end-user'],
    doneTitle: 'You can find anything in Mattermost',
    doneSummary: 'You\'ve covered search scope, modifiers, date filters, precision syntax, file search, and semantic search. Keep the full reference handy:',
    doneLinks: [
        {label: 'Search for messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/search-for-messages.html'},
        {label: 'Save and pin messages', href: 'https://docs.mattermost.com/end-user-guide/collaborate/save-pin-messages.html'},
    ],
    modules: [
        {
            id: 'search-basics',
            navTitle: 'How Search Works',
            icon: 'magnify',
            minutes: 3,
            title: 'How Mattermost search works',
            summary: 'Every search starts with two decisions — whether you want messages or files, and how wide to cast the net across your teams.',
            steps: [
                {
                    title: 'Choose Messages or Files',
                    description: 'Select the <strong>Search</strong> field, then select <strong>Messages</strong> to search message text or <strong>Files</strong> to search files attached to messages. The two tabs return separate result sets, so switch tabs if the first search comes up empty.',
                    media: {
                        type: 'image',
                        file: 'search-results-tabs.webp',
                        alt: 'Search results in the right-hand pane, with Messages and Files tabs showing counts',
                    },
                },
                {
                    title: 'Set how many teams to search',
                    description: 'By default your results cover all channels in your current team. Select <strong>All Teams</strong> to search every team you belong to, or pick a single specific team instead.',
                },
                {
                    title: 'Know what search matches',
                    description: 'A multi-word search returns only messages that contain <strong>all</strong> of your terms. Very common words such as "the" and "are", along with one- and two-letter terms, are filtered out. URLs and IP addresses do not return results.',
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
            id: 'from-and-in',
            navTitle: 'from: and in:',
            icon: 'account-multiple-outline',
            minutes: 3,
            title: 'Narrow by person and by channel',
            summary: 'The two modifiers you will reach for most often. Use from: to pin a search to a person, and in: to pin it to a conversation.',
            steps: [
                {
                    title: 'Find messages from a person',
                    description: 'Add <strong>from:</strong> followed by a username to return only content that person posted. For example, <strong>budget from:john.smith</strong> returns messages containing "budget" that John Smith wrote.',
                    media: {
                        type: 'image',
                        file: 'search-from-autocomplete.webp',
                        alt: 'Typing from: in the search box, narrowing the list of people as you type',
                    },
                },
                {
                    title: 'Find messages in a channel',
                    description: 'Add <strong>in:</strong> followed by a channel to limit results to that conversation. For example, <strong>Mattermost in:town-square</strong> returns only results from Town Square. You can specify a channel by display name or by channel ID.',
                    media: {
                        type: 'image',
                        file: 'search-in-autocomplete.webp',
                        alt: 'Typing in: in the search box, with a list of channels to choose from',
                    },
                },
                {
                    title: 'Search a DM or group message',
                    description: '<strong>in:</strong> also works on direct and group messages, including private channels you belong to. For example, <strong>Mattermost in:john.doe</strong> searches only your direct message history with John Doe.',
                },
                {
                    title: 'Combine both to cut results down fast',
                    description: 'Modifiers stack. <strong>deploy from:john.smith in:release-discussion</strong> returns only messages about "deploy" that John posted in that one channel.',
                    media: {
                        type: 'image',
                        file: 'search-modifiers-combined.webp',
                        alt: 'A search combining from: and in: to narrow results to one person in one channel',
                    },
                },
                {
                    title: 'Type from: yourself for cross-team searches',
                    description: 'When you search across <strong>All Teams</strong>, you have to type the <strong>from:</strong> modifier into the search field manually. The autocomplete list does not offer it in cross-team searches, but the modifier still works once typed.',
                },
            ],
        },
        {
            id: 'date-filters',
            navTitle: 'Date Filters',
            icon: 'calendar-outline',
            minutes: 3,
            title: 'Filter results by date',
            summary: 'Three date modifiers — before:, after:, and on: — turn "somewhere in the last year" into a handful of results.',
            steps: [
                {
                    title: 'Search before a date',
                    description: 'Use <strong>before:</strong> to return only content posted earlier than a date. For example, <strong>website before:2026-03-01</strong> returns messages containing "website" posted prior to March 1, 2026.',
                },
                {
                    title: 'Search after a date',
                    description: 'Use <strong>after:</strong> to return only content posted later than a date. For example, <strong>website after:2026-02-01</strong> returns messages containing "website" posted after February 1, 2026.',
                },
                {
                    title: 'Search a single day',
                    description: 'Use <strong>on:</strong> when you know the exact day. For example, <strong>website on:2026-03-01</strong> returns messages containing "website" posted that day only.',
                },
                {
                    title: 'Combine before: and after: for a range',
                    description: 'Use both together to bracket a window. <strong>website after:2026-02-01 before:2026-03-01</strong> returns messages containing "website" posted between those two dates.',
                },
                {
                    title: 'Use the date picker instead of typing',
                    description: 'When you select a date modifier from the search autocomplete, a date picker opens so you can choose the day visually. If you would rather type, use <strong>YYYY-MM-DD</strong> format.',
                    media: {
                        type: 'image',
                        file: 'search-date-picker.webp',
                        alt: 'The date picker that appears after typing before: in the search box',
                    },
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
                    description: 'Wrap terms in quotation marks to match them together and in order. Searching <strong>"Mattermost website"</strong> returns messages containing that exact phrase, and skips messages that happen to mention "Mattermost" and "website" separately.',
                    media: {
                        type: 'image',
                        file: 'search-exact-phrase.webp',
                        alt: 'A quoted search phrase, matching only messages containing that exact wording',
                    },
                },
                {
                    title: 'Exclude terms with a hyphen',
                    description: 'Prefix a term with <strong>-</strong> to remove it from your results. Searching <strong>test -release</strong> returns results containing "test" that do not contain "release".',
                },
                {
                    title: 'Exclude whole channels and people',
                    description: 'The hyphen also works in front of a modifier. <strong>test -release -in:release-discussion -from:eric</strong> keeps results for "test" while dropping the term "release", that one channel, and that one sender.',
                },
                {
                    title: 'Match word beginnings with a wildcard',
                    description: 'Add <strong>*</strong> to the end of a word to match everything starting with those letters. Searching <strong>rea*</strong> matches "reach", "reason", "reality", and "real". The wildcard only works at the end of a word, so <strong>*each</strong> and <strong>re*ch</strong> are not valid.',
                },
                {
                    title: 'Search hashtags',
                    description: 'Hashtags are searchable labels anyone can add to a message with <strong>#</strong>. Select a hashtag in an existing post, or type it including the pound symbol, to find every message tagged with it.',
                    media: {
                        type: 'image',
                        file: 'search-hashtag.webp',
                        alt: 'Searching a hashtag, returning every message tagged with it',
                    },
                    tip: 'Hashtags are not channel links. Selecting #marketing does not open the Marketing channel. To link a public channel, use the tilde symbol instead, as in ~marketing.',
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
                    media: {
                        type: 'image',
                        file: 'search-files-tab.webp',
                        alt: 'The Files tab of search results, listing matching attachments',
                    },
                },
                {
                    title: 'Filter by file extension',
                    description: 'Use <strong>ext:</strong> followed by an extension to return only that file type, as in <strong>ext:pdf</strong>. The search autocomplete suggests extensions as you type, so you do not have to remember them.',
                    media: {
                        type: 'image',
                        file: 'search-file-extension.webp',
                        alt: 'Filtering a file search to one extension with ext:, leaving a single PDF',
                    },
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
                    description: '<strong>from:</strong>, <strong>in:</strong>, <strong>before:</strong>, <strong>after:</strong>, and <strong>on:</strong> all work in the Files tab. <strong>budget from:john.smith ext:pdf after:2026-02-01</strong> finds one PDF instead of a page of them.',
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
                    description: 'Press <strong>Ctrl+Shift+F</strong> on Windows or Linux, or <strong>Cmd+Shift+F</strong> on Mac, to move focus to the search field with the current channel already scoped. This is the fastest way to search one conversation without typing an <strong>in:</strong> modifier.',
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
                    media: {
                        type: 'image',
                        file: 'search-recent-mentions.webp',
                        alt: 'The Recent mentions pane collecting messages that mentioned you',
                    },
                },
                {
                    title: 'Set messages aside and come back to them',
                    description: 'Select the <strong>Save</strong> icon next to any message to save it for yourself only — nobody else sees that you saved it. Select the <strong>Bookmark</strong> icon to the left of your profile picture to open your full list of saved messages in the right-hand pane.',
                    media: {
                        type: 'image',
                        file: 'search-saved-messages.webp',
                        alt: 'The Saved messages pane listing a message set aside for later',
                    },
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
                    description: 'Type what you are looking for the way you would ask a colleague — for example, "what did we decide about the pricing change?" You do not need modifiers, quotation marks, or exact wording.',
                },
                {
                    title: 'Know which search to reach for',
                    description: 'Use keyword search and modifiers when you know a specific term, sender, channel, or date. Use semantic search when you remember the <strong>topic</strong> of a discussion but not the words anyone used.',
                },
                {
                    title: 'Go further with Agents',
                    description: 'Semantic search is one part of what Agents can do. The <a href="/academy/guides/ai-quick-start">AI Quick Start guide</a> covers thread and channel summaries, call summaries, message rewrites, and custom agents.',
                },
            ],
        },
    ],
};

export default advancedSearch;
