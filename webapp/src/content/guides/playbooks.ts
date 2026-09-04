// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLUGIN_IDS} from 'content/plugins';
import type {Guide} from 'content/types';

const playbooks: Guide = {
    id: 'playbooks',
    requiresPlugins: [PLUGIN_IDS.playbooks],
    title: 'Playbooks',
    heroTitle: 'Run repeatable processes without dropping steps',
    subtitle: 'How runs work, how to work a checklist, how to keep stakeholders updated, how to build a playbook, how to trigger one automatically, and how to review a run afterwards.',
    description: 'Run repeatable processes in Mattermost — checklists, status updates, playbook configuration, and retrospectives.',
    icon: 'playlist-check',
    audiences: ['end-user'],
    doneTitle: 'You can run a playbook end to end',
    doneSummary: 'You\'ve covered runs, checklists, status updates, playbook configuration, and retrospectives. Go deeper in the documentation:',
    doneLinks: [
        {label: 'Workflow automation documentation', href: 'https://docs.mattermost.com/end-user-guide/workflow-automation.html'},
        {label: 'Playbooks slash commands', href: 'https://docs.mattermost.com/end-user-guide/workflow-automation/interact-with-playbooks.html'},
        {label: 'Metrics and goals', href: 'https://docs.mattermost.com/end-user-guide/workflow-automation/metrics-and-goals.html'},
    ],
    modules: [
        {
            id: 'playbooks-and-runs',
            navTitle: 'Playbooks and Runs',
            icon: 'format-list-bulleted',
            minutes: 2,
            title: 'What Playbooks solves',
            summary: 'Two words carry the whole product: a playbook is the process you write down once, and a run is one execution of it.',
            steps: [
                {
                    title: 'A playbook is the process, a run is the execution',
                    description: 'A <strong>playbook</strong> is a checklist of the tasks that make up a repeatable process — a release, an incident, a customer onboarding. A <strong>run</strong> is a single pass through that playbook. You write the playbook once and start a new run every time the process happens.',
                    media: {
                        type: 'image',
                        file: 'pb-run-overview.webp',
                        alt: 'A run in progress, with its summary and current status',
                    },
                },
                {
                    title: 'Runs live in a channel',
                    description: 'When a run starts, it is anchored to a channel. Participants work the checklist in the run details pane beside the conversation, so discussion and progress stay together. A playbook can create a new channel for every run, or reuse the same channel each time.',
                    media: {
                        type: 'image',
                        file: 'pb-run-channel.webp',
                        alt: 'The channel created for a run, where the conversation happens alongside the checklist',
                    },
                },
                {
                    title: 'When a checklist beats a channel',
                    description: 'Use a playbook when the same steps repeat, when the order or the owner of each step matters, or when people outside the channel need visibility into progress. A plain channel is enough for one-off coordination where nothing needs to be tracked, measured, or repeated.',
                },
                {
                    title: 'Find playbooks and runs',
                    description: 'Open <strong>Product menu</strong> > <strong>Playbooks</strong> to see the playbooks you can access. Select a playbook name, then select <strong>Runs</strong> to see its runs. From a run, select <strong>Go to channel</strong> to open the run channel.',
                    media: {
                        type: 'image',
                        file: 'pb-playbooks-list.webp',
                        alt: 'The Playbooks list, showing available playbooks with their run counts',
                    },
                    tip: 'Only public playbooks and private playbooks you\'re a member of appear in the list.',
                },
            ],
        },
        {
            id: 'joining-a-run',
            navTitle: 'Joining a Run',
            icon: 'account-multiple-outline',
            minutes: 3,
            title: 'Start or join a run',
            summary: 'Start a run from the playbook when you plan ahead, or from the channel when something is already unfolding.',
            steps: [
                {
                    title: 'Start a run from a playbook',
                    description: 'Open <strong>Product menu</strong> > <strong>Playbooks</strong> and select <strong>Run</strong> beside the playbook you want. Name the run and confirm which channel it should use. The checklist, the owner, and any configured automations are copied from the playbook into the new run.',
                },
                {
                    title: 'Start a run from the channel',
                    description: 'Type <strong>/playbook run</strong> and choose a playbook. Reach for this when a conversation has already started and you want the process attached to it immediately, without leaving the channel.',
                },
                {
                    title: 'Open the run details pane',
                    description: 'In a run channel, select the <strong>Toggle Run Details</strong> icon to open the checklist, participants, and current status alongside the conversation. This pane is where most of your work in a run happens.',
                    media: {
                        type: 'image',
                        file: 'pb-run-info-pane.webp',
                        alt: 'The run details pane, listing the playbook, owner, participants, followers, and channel',
                    },
                },
                {
                    title: 'Know the difference between participating and following',
                    description: 'Participants work the checklist, post status updates, and change assignees. Followers are notified when the run starts, when status updates are posted, and when the run finishes — useful for stakeholders who need visibility but no tasks.',
                },
                {
                    title: 'Get your bearings in an unfamiliar run',
                    description: 'Type <strong>/playbook info</strong> in a run channel for a summary of the current run, including its status and owner. Use <strong>/playbook owner</strong> to see who owns it, or pass a username to hand ownership over.',
                },
            ],
            commandGroups: [
                {
                    label: 'Start and inspect a run',
                    items: [
                        {command: '/playbook run', description: 'Start a run from a playbook'},
                        {command: '/playbook info', description: 'Show a summary of the run in this channel'},
                        {command: '/playbook timeline', description: 'Show the timeline for this run'},
                        {command: '/playbook todo', description: 'List the tasks assigned to you'},
                    ],
                },
                {
                    label: 'Work the checklist',
                    items: [
                        {command: '/playbook check [checklist #] [item #]', description: 'Check or uncheck a checklist item'},
                        {command: '/playbook checkadd [checklist #] [item text]', description: 'Add a checklist item'},
                        {command: '/playbook checkremove [checklist #] [item #]', description: 'Remove a checklist item'},
                    ],
                },
                {
                    label: 'Update and finish',
                    items: [
                        {command: '/playbook update', description: 'Post a status update'},
                        {command: '/playbook owner [@username]', description: 'Show or change the run owner'},
                        {command: '/playbook finish', description: 'Finish the run in this channel'},
                    ],
                },
                {
                    label: 'Digests',
                    items: [
                        {command: '/playbook settings digest [on/off]', description: 'Turn the daily digest on or off'},
                        {command: '/playbook settings weekly-digest [on/off]', description: 'Turn the weekly digest on or off'},
                    ],
                },
            ],
        },
        {
            id: 'working-the-checklist',
            navTitle: 'Working the Checklist',
            icon: 'playlist-check',
            minutes: 3,
            title: 'Work the checklist',
            summary: 'Tasks carry an assignee, a due date, and sometimes an action. Every change you make is recorded on the run timeline.',
            steps: [
                {
                    title: 'Check off tasks as you go',
                    description: 'Select a task\'s checkbox in the run details pane to mark it complete. Completion is recorded on the run timeline, so anyone reviewing the run later can see what happened and when.',
                    media: {
                        type: 'image',
                        file: 'pb-checklist.webp',
                        alt: 'A run checklist with tasks checked off, each showing an assignee and a due date',
                    },
                },
                {
                    title: 'Assign each task to a person',
                    description: 'Hover a task and set an assignee from the run participants. Assignment makes accountability explicit and puts the task into that person\'s task inbox.',
                },
                {
                    title: 'Add due dates where timing matters',
                    description: 'Hover a task and select the calendar icon to set a due date. Dates can be typed in plain language, such as <strong>in two hours</strong>, or numerically, such as <strong>15 March 2026</strong>. You can also sort the run overview by due date.',
                },
                {
                    title: 'Skip what does not apply',
                    description: 'Not every task fits every run. Skip a task rather than checking it off, so the record shows the step was deliberately set aside instead of completed. Unskip it if circumstances change.',
                },
                {
                    title: 'Let task actions close tasks for you',
                    description: 'A task can be configured to complete itself when specific text appears in the run — for example a deploy bot posting <strong>rollout complete</strong>. The match is set up on the playbook and looks for any of the words you provide, so prefer a distinctive phrase over single common words.',
                },
                {
                    title: 'Track your own work across runs',
                    description: 'Type <strong>/playbook todo</strong> for a refreshed list of the tasks assigned to you. For a fuller view, open the task inbox from the header of the Playbooks page — it lists every task assigned to you across active runs, sorted by due date, where you can complete, skip, reassign, or reschedule them.',
                    tip: 'The Playbooks bot also sends a daily digest listing your outstanding tasks and any status updates you owe.',
                },
            ],
        },
        {
            id: 'status-updates',
            navTitle: 'Status Updates',
            icon: 'bell-outline',
            minutes: 3,
            title: 'Keep everyone informed',
            summary: 'Status updates are how a run reports outward. Set a cadence, post to a template, and broadcast to the people who need to know.',
            steps: [
                {
                    title: 'Post an update',
                    description: 'In the run details pane, select <strong>Post update</strong>. You can also type <strong>/playbook update</strong> in the run channel. The update posts to the run channel, shows as the current status in the run details, and is recorded on the run timeline.',
                    media: {
                        type: 'image',
                        file: 'pb-post-update-dialog.webp',
                        alt: 'The status update dialog, pre-filled from the playbook\'s update template',
                    },
                },
                {
                    title: 'Work to a cadence',
                    description: 'A playbook can define how often an update is expected. A timer counts down in the run details pane, the Playbooks bot reminds the owner when an update is due, and you can reset the timer as you post — for example to <strong>in 30 minutes</strong> while things are moving quickly.',
                },
                {
                    title: 'Post to a template',
                    description: 'When the playbook defines an update template, it is pre-filled in the update box so every update answers the same questions in the same order. Edit the template text rather than starting from a blank box.',
                },
                {
                    title: 'Broadcast to stakeholders',
                    description: 'If the playbook defines broadcast channels, the Playbooks bot copies each status update into them. Stakeholders can follow a quiet broadcast channel instead of joining the busy run channel. Editing or deleting the original update does not change the broadcast copy.',
                },
                {
                    title: 'Ask for an update',
                    description: 'If you need to know where a run stands, open the run details page, select the menu next to <strong>Post update</strong>, then select <strong>Request update</strong>. The owner is notified that an update has been requested.',
                },
                {
                    title: 'Finish the run',
                    description: 'When the process is done, select <strong>Finish run</strong> below the checklist, or type <strong>/playbook finish</strong> in the run channel. Status updates are disabled once a run is finished, and the Playbooks bot asks whether you want to complete a retrospective.',
                    media: {
                        type: 'image',
                        file: 'pb-finish-run.webp',
                        alt: 'The end of a run, where finishing it closes out the checklist and notifies followers',
                    },
                },
            ],
        },
        {
            id: 'building-a-playbook',
            navTitle: 'Building a Playbook',
            icon: 'draw',
            minutes: 4,
            title: 'Build a playbook',
            summary: 'Configure the playbook once and every future run inherits it: checklists, automations, update settings, and access.',
            steps: [
                {
                    title: 'Start from a template',
                    description: 'Open <strong>Product menu</strong> > <strong>Playbooks</strong> and create a playbook. Pick the template closest to your process — its checklists, actions, status update settings, and retrospective settings arrive pre-filled and fully editable — or start blank if your process is unusual.',
                    tip: 'The <strong>Learn how to use playbooks</strong> template breaks down each component and lets you start a test run to see how the pieces fit together.',
                },
                {
                    title: 'Build the checklist first',
                    description: 'Select the <strong>Outline</strong> tab and go to the tasks section. Add tasks, group them into sections, and drag to reorder. Task descriptions support a limited set of Markdown, including text styling and links.',
                    media: {
                        type: 'image',
                        file: 'pb-playbook-editor.webp',
                        alt: 'The Outline tab of the playbook editor, listing the checklists every run starts from',
                    },
                },
                {
                    title: 'Attach actions to tasks',
                    description: 'Tasks are more than reminders. Begin a task with <strong>/</strong> to attach a built-in or custom slash command, or wire up an outgoing webhook, so a participant can trigger the work from the checklist instead of retyping it.',
                },
                {
                    title: 'Decide what happens when a run starts',
                    description: 'In the actions section, choose whether each run creates a new channel or reuses an existing one, who gets invited, which sidebar category the channel joins, and whether an outgoing webhook fires. These choices apply to every run started from this playbook.',
                },
                {
                    title: 'Set update and retrospective behavior',
                    description: 'Configure the update cadence, the update template, and the broadcast channels so runs report outward consistently. Enable the retrospective here too if you want a report and metrics after each run.',
                },
                {
                    title: 'Control who can see and change it',
                    description: 'A <strong>public</strong> playbook is visible across the team; a <strong>private</strong> playbook is limited to its members. Members work with the playbook, and playbook admins manage membership and settings. Your System Admin can tighten this further, restricting who creates playbooks, edits them, or starts runs.',
                    tip: 'Edits apply to future runs only. Runs already in progress keep the checklist and settings they started with.',
                },
            ],
        },
        {
            id: 'triggers',
            navTitle: 'Triggers',
            icon: 'lightning-bolt-outline',
            minutes: 2,
            title: 'Start runs without waiting to be asked',
            summary: 'A run does not have to begin with someone remembering to begin it. Channel Actions watch a channel for a keyword and offer the right playbook the moment it shows up.',
            steps: [
                {
                    title: 'Trigger a playbook from a keyword',
                    description: 'Open <strong>Channel Actions</strong> from the channel menu, enter a keyword, and choose the playbook it should offer. The keyword can be a word or a phrase that appears in a message — <strong>SEV1</strong>, <strong>outage</strong>, or <strong>deploy failed</strong>. When someone posts it, Mattermost prompts to start that playbook.',
                    media: {
                        type: 'image',
                        file: 'triggers-step1-9e6405dce4.svg',
                        alt: 'Channel Actions modal showing a keyword trigger with Prompt to run a playbook enabled',
                    },
                    tip: 'The prompt is an offer, not an automatic start. Someone still confirms, which keeps a stray mention of the keyword from opening a run.',
                },
                {
                    title: 'Let connected systems supply the keyword',
                    description: 'Pair the trigger with an incoming webhook so an alerting or monitoring system posts into the channel. The alert text carries the keyword, so the process is offered as soon as the system reports the problem rather than when a person notices it.',
                },
            ],
        },
        {
            id: 'retrospectives',
            navTitle: 'Retrospectives',
            icon: 'chart-line',
            minutes: 3,
            title: 'Learn from each run',
            summary: 'The retrospective turns a finished run into something the next run can use — a written report, an accurate timeline, and comparable metrics.',
            steps: [
                {
                    title: 'Write the retrospective report',
                    description: 'When a run finishes, the Playbooks bot offers to start the retrospective. Write the report in the retrospective section of the run using Markdown, and save it as often as you like. Publishing shares it with stakeholders and makes the report and its metrics read-only.',
                    media: {
                        type: 'image',
                        file: 'pb-retrospective.webp',
                        alt: 'A completed retrospective report for a run',
                    },
                },
                {
                    title: 'Use the timeline as your source of truth',
                    description: 'The run timeline records key events automatically, including owner changes, status updates, and task assignments. Filter it to what you need, and select an event to jump to that moment in the channel. In the run channel, <strong>/playbook timeline</strong> gives you the same history inline.',
                    media: {
                        type: 'image',
                        file: 'pb-timeline.webp',
                        alt: 'The run timeline, recording each event in order as the run progressed',
                    },
                },
                {
                    title: 'Add the messages that mattered',
                    description: 'Context often sits in a message rather than an event. From any message in Channels, use the message actions menu to add it to a run timeline — including messages posted before the run started, such as the first report of a problem.',
                },
                {
                    title: 'Record metrics',
                    description: 'Metrics are enabled alongside retrospectives and defined on the playbook as numeric, time, or value inputs. Enter a value for each metric in the run\'s retrospective section. Values stay editable until you publish.',
                },
                {
                    title: 'Compare runs over time',
                    description: 'Published retrospectives feed the playbook dashboard, which reports each metric across runs: the average for all runs, the last ten-run average against the previous ten, the value range, the target, and a chart of the last ten runs. Use it to check whether a change to the process actually helped.',
                    tip: 'Metric values only reach the dashboard once the retrospective is published, so publish even when the report is brief.',
                },
            ],
        },
    ],
};

export default playbooks;
