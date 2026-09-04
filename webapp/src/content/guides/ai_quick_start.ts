// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLUGIN_IDS} from 'content/plugins';
import type {Guide} from 'content/types';

const aiQuickStart: Guide = {
    id: 'ai-quick-start',
    requiresPlugins: [PLUGIN_IDS.agents],
    title: 'AI Assistance with Agents',
    heroTitle: 'AI Assistance with Agents',
    subtitle: 'Chat, summaries, calls, search, rewrites, and custom agents to accelerate work with full operational context.',
    description: 'Chat, summaries, calls, search, rewrites, and custom agents to accelerate work with full operational context.',
    icon: 'creation-outline',
    audiences: ['end-user'],
    doneTitle: 'You\'re AI-ready in Mattermost',
    doneSummary: 'You\'ve covered chat, summaries, calls, search, rewrite, and custom agents. Learn more about Agents in our user guide:',
    doneLinks: [
        {label: 'Agents user guide', href: 'https://docs.mattermost.com/end-user-guide/agents.html'},
    ],
    modules: [
        {
            id: 'ai-chat',
            navTitle: 'AI Chat',
            icon: 'robot-happy',
            minutes: 2,
            title: 'Start a conversation with an Agent',
            summary: 'The Agents right-hand pane is your AI workspace — it\'s one click away and private to you.',
            steps: [
                {
                    title: 'Open the Agents pane',
                    description: 'In the apps sidebar on the right of the screen, select the <strong>Agents</strong> icon.',
                    media: {
                        type: 'svg',
                        file: 'ai-chat-step1.svg',
                        alt: 'Mattermost channel with Agents icon in the apps sidebar',
                    },
                },
                {
                    title: 'Ask Agents anything',
                    description: 'Start with a suggested prompt or type your own question. Use the dropdown to select the Agent you want to chat with. We\'ll cover how to create Custom Agents later in this guide.',
                    media: {
                        type: 'svg',
                        file: 'ai-chat-step2.svg',
                        alt: 'Mattermost Agents pane mock',
                    },
                },
                {
                    title: 'Share conversations with the team by @mentioning an agent',
                    description: 'In any channel or thread, @mention an agent (for example <strong>@copilot</strong>) in your message. It replies in-thread so your team can continue the conversation.',
                },
            ],
        },
        {
            id: 'summarize-threads',
            navTitle: 'Summarize Threads',
            icon: 'ai-summarize',
            minutes: 2,
            title: 'Summarize long threads in seconds',
            summary: 'Use AI Actions to generate a private thread summary in the Agents pane — plus surface action items or open questions from the same menu.',
            steps: [
                {
                    title: 'Open the message actions toolbar',
                    description: 'Hover over a message to see the actions toolbar, and select the <strong>AI Actions</strong> option.',
                    media: {
                        type: 'svg',
                        file: 'summarize-threads-step1.svg',
                        alt: 'A message about a failed staging deployment with the hover actions toolbar showing',
                    },
                },
                {
                    title: 'Select Summarize Thread',
                    description: 'The summary opens in your <strong>Agents pane</strong> and is only visible to you. The AI actions menu also offers options to <strong>find action items</strong> or <strong>find open questions</strong> about the thread.',
                    media: {
                        type: 'svg',
                        file: 'summarize-threads-step2.svg',
                        alt: 'AI actions menu listing Summarize Thread, Find action items, Find open questions, and React for me',
                    },
                },
                {
                    title: 'Ask follow-up questions in the Agents pane',
                    description: 'Refine or query your summary by responding to the agent in the pane. Your conversation here is private to you.',
                },
            ],
        },
        {
            id: 'summarize-channels',
            navTitle: 'Summarize Channels',
            icon: 'message-text-outline',
            minutes: 1,
            title: 'Summarize channels or unread messages',
            summary: 'Use AI Actions to summarize unread messages or entire channels based on your selected timeline.',
            steps: [
                {
                    title: 'Select the AI Actions button in the channel header',
                    description: 'Type a custom query about the channel, or select a date range to summarize.',
                    media: {
                        type: 'svg',
                        file: 'summarize-channels-step1.svg',
                        alt: 'Channel header with AI Actions',
                    },
                },
                {
                    title: 'Scroll to the New Messages line',
                    description: 'In a channel with unreads, find the <strong>New Messages</strong> divider. Select the <strong>Ask AI</strong> option to <strong>summarize new messages</strong>, <strong>find action items</strong>, or <strong>find open questions</strong>.',
                    media: {
                        type: 'svg',
                        file: 'summarize-channels-step2.svg',
                        alt: 'A New Messages divider in a channel with an Ask AI button beside it',
                    },
                },
                {
                    title: 'Ask follow-up questions in the Agents pane',
                    description: 'Refine or query your summary by responding to the agent in the pane. Your conversation here is private to you.',
                },
            ],
        },
        {
            id: 'summarize-calls',
            requiresPlugins: [PLUGIN_IDS.calls],
            navTitle: 'Summarize Calls',
            icon: 'video-outline',
            minutes: 2,
            title: 'Turn Call recordings into concise meeting summaries',
            summary: 'Agents read your call transcriptions and generate concise summaries with next actions and owners, shared directly in the call thread.',
            steps: [
                {
                    title: 'Record during a Mattermost Call',
                    description: 'Start a call and begin recording.',
                    media: {
                        type: 'svg',
                        file: 'summarize-calls-step1.svg',
                        alt: 'An active call at 00:46 with a red REC indicator, four participants, and an End button',
                    },
                },
                {
                    title: 'When the transcription is ready, create the summary',
                    description: 'Select <strong>Create meeting summary</strong> directly above the call transcription.',
                    media: {
                        type: 'svg',
                        file: 'summarize-calls-step2.svg',
                        alt: 'A Calls bot post with a transcription file attached and a Create meeting summary action above it',
                    },
                },
                {
                    title: 'Refine and then post the summary',
                    description: 'Refine your summary by typing in the Agents pane. When ready, select <strong>Post summary</strong> to share the refined summary with all users in the original call thread.',
                    tip: 'Recording and transcription must be enabled by your System Admin to use this feature.',
                },
            ],
        },
        {
            id: 'ai-search',
            navTitle: 'AI Search',
            icon: 'search-list',
            minutes: 1,
            title: 'Use natural language to search',
            summary: 'Instead of using keywords and search filters, ask in natural language. Semantic search finds relevant discussions and generates the answers you\'re looking for.',
            steps: [
                {
                    title: 'Open the Search pane',
                    description: 'Open the <strong>Search</strong> pane and select the <strong>Agents</strong> option to use semantic search.',
                    media: {
                        type: 'svg',
                        file: 'ai-search-step1.svg',
                        alt: 'Search pane with Agents option',
                    },
                },
                {
                    title: 'Type in natural language',
                    description: 'Type your search query in natural language and skip the search filters.',
                },
            ],
        },
        {
            id: 'rewrite-with-ai',
            navTitle: 'Rewrite with AI',
            icon: 'draw',
            minutes: 1,
            title: 'Rewrite your message drafts before you post',
            summary: 'From the compose box, open AI Actions → Rewrite, choose a transform, then Regenerate, Discard, or Send. Rewritten messages are marked AI-generated.',
            steps: [
                {
                    title: 'Start with your message draft',
                    description: 'Type your draft, then select <strong>AI Actions</strong> > <strong>Rewrite</strong> in the composer. Choose a built-in preset, or type a custom instruction for your rewrite.',
                    media: {
                        type: 'svg',
                        file: 'rewrite-with-ai-step1.svg',
                        alt: 'Rewrite menu from the composer sparkle button',
                    },
                },
                {
                    title: 'Review, iterate and send',
                    description: 'Review your rewritten message, iterate on it with another rewrite or discard it altogether to revert to your original message.',
                },
            ],
        },
        {
            id: 'custom-agents',
            navTitle: 'Custom Agents',
            icon: 'tune',
            minutes: 1,
            title: 'Use custom agents for specific tasks',
            summary: 'Custom Agents let you define unique instructions so you can give them additional context and tune their responses for specific tasks.',
            steps: [
                {
                    title: 'Open the Agents homepage',
                    description: 'Select <strong>Agents</strong> from the main menu. Use the tabs to view <strong>All Agents</strong> your team has access to, or <strong>Your Agents</strong> for a filtered list of just personally created agents.',
                    media: {
                        type: 'svg',
                        file: 'custom-agents-step1.svg',
                        alt: 'Mattermost product menu with Agents selected',
                    },
                },
                {
                    title: 'Create a new agent',
                    description: 'Select <strong>Create agent</strong>, then define the username, avatar and AI service. Add your <strong>custom instructions</strong> to give the agent additional context or tune how it behaves.',
                    media: {
                        type: 'svg',
                        file: 'custom-agents-step2.svg',
                        alt: 'A Create agent form filled in with the username secops-bot, an AI service, and custom instructions',
                    },
                },
            ],
        },
    ],
};

export default aiQuickStart;
