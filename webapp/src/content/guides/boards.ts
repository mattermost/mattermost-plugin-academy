// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLUGIN_IDS} from 'content/plugins';
import type {Guide} from 'content/types';

const boards: Guide = {
    id: 'boards',
    requiresPlugins: [PLUGIN_IDS.boards],
    title: 'Boards',
    heroTitle: 'Track project work in Boards',
    subtitle: 'Five focused modules covering navigation, templates, cards and properties, views, and sharing. Organize tasks and deadlines alongside the channels where the work gets discussed.',
    description: 'Organize project work with boards, cards, properties, views, and channel links.',
    icon: 'table-large',
    audiences: ['end-user'],
    doneTitle: 'You\'re ready to run a project in Boards',
    doneSummary: 'You\'ve covered navigation, templates, cards and properties, views, and sharing. Learn more about Boards in our user guide:',
    doneLinks: [
        {label: 'Project and task management', href: 'https://docs.mattermost.com/end-user-guide/project-task-management.html'},
        {label: 'Work with cards', href: 'https://docs.mattermost.com/end-user-guide/project-management/work-with-cards.html'},
    ],
    modules: [
        {
            id: 'opening-boards',
            navTitle: 'Opening Boards',
            icon: 'table-large',
            minutes: 2,
            title: 'Find Boards and the boards linked to your channels',
            summary: 'Boards is its own place in Mattermost with a sidebar of every board on your team. Individual boards can also be linked to a channel so they sit next to the conversation.',
            steps: [
                {
                    title: 'Open Boards from the product menu',
                    description: 'Select the <strong>product menu</strong> in the top left corner of Mattermost, then select <strong>Boards</strong> to see every board on your team.',
                },
                {
                    title: 'Open linked boards from a channel',
                    description: 'In any channel, select the <strong>Boards</strong> icon in the apps bar on the right of the screen. The right-hand pane lists the boards linked to that channel. Select <strong>Add</strong> to search for an existing board to link, or <strong>Create a Board</strong> to start a new one already linked to the channel.',
                },
                {
                    title: 'Understand how boards relate to channels',
                    description: 'Boards belong to a team, not to a channel. Linking a board to a channel is a convenience and a permission grant — every member of that channel gets access to the board. A channel can have several boards linked to it, but each board can be linked to only one channel at a time.',
                },
                {
                    title: 'Organize your sidebar',
                    description: 'Every board you can access is listed in the left-hand sidebar under the default <strong>Boards</strong> category. Use the menu next to a category to create, rename, or delete categories, then use <strong>Move To…</strong> on a board to file it. You can also drag boards and categories into the order you want.',
                    media: {
                        type: 'image',
                        file: 'boards-sidebar.webp',
                        alt: 'The Boards sidebar listing a board and its two views',
                    },
                    tip: 'Categories are per-user. Rearranging or hiding a board in your sidebar doesn\'t change what anyone else sees.',
                },
                {
                    title: 'Jump straight to a board',
                    description: 'Select the <strong>Find Boards</strong> field at the top of the sidebar to open the board switcher, then start typing the board name.',
                },
            ],
        },
        {
            id: 'create-a-board',
            navTitle: 'Templates',
            icon: 'folder-outline',
            minutes: 3,
            title: 'Create a board from a template',
            summary: 'Templates hand you a board with properties, saved views, and example cards already in place. Start from the one closest to your workflow, then adjust it.',
            steps: [
                {
                    title: 'Open the template picker',
                    description: 'Select the plus icon at the top of the Boards sidebar, then select <strong>Create New Board</strong>. Select any template name to preview it before you commit.',
                },
                {
                    title: 'Choose a standard template',
                    description: 'Standard templates include <strong>Project Tasks</strong>, <strong>Roadmap</strong>, <strong>Sprint Planner</strong>, <strong>Meeting Agenda</strong>, <strong>Team Retrospective</strong>, <strong>Content Calendar</strong>, <strong>Company Goals & OKRs</strong>, <strong>Competitive Analysis</strong>, <strong>User Research Sessions</strong>, <strong>Personal Tasks</strong>, and <strong>Personal Goals</strong>. Each one is fully customizable once created.',
                },
                {
                    title: 'Or start from a blank board',
                    description: 'If none of the templates fit, select <strong>Create empty board</strong> from the template picker and build your own properties and views from scratch.',
                },
                {
                    title: 'Name the board and add a description',
                    description: 'Select the board title to rename it. To give the team context, hover above the title and select <strong>Show description</strong>, then select <strong>Add a description</strong> below the title. Changes to boards and cards save immediately.',
                },
                {
                    title: 'Turn a board you like into a template',
                    description: 'Once a board is set up the way you want, hover over its name in the sidebar, open the options menu, and select <strong>New template from board</strong>. Your custom templates appear in the template picker alongside the standard ones and stay fully editable.',
                    tip: 'Custom templates are private to you by default. Open the template editor and select <strong>Share</strong> to set a team role of Viewer so everyone on the team can use it.',
                },
            ],
        },
        {
            id: 'cards-and-properties',
            navTitle: 'Cards and Properties',
            icon: 'text-box-outline',
            minutes: 4,
            title: 'Track individual work items on cards',
            summary: 'A card holds properties, a description, and comments. Properties are shared by every card on the board, so design them for the board as a whole rather than one task.',
            steps: [
                {
                    title: 'Add a card',
                    description: 'Select <strong>New</strong> at the top of the board and give the card a title. Open a card at any time to fill in the detail — everything you type saves as you go.',
                    media: {
                        type: 'image',
                        file: 'boards-kanban.webp',
                        alt: 'A board in the Kanban layout, with cards grouped into Backlog, In progress, In review, and Done columns',
                    },
                },
                {
                    title: 'Write the description',
                    description: 'Open a card and select <strong>Add a description</strong> below the Comments section. Descriptions are built from content blocks: hover over the section and select <strong>Add content</strong> to insert a <strong>Text</strong>, <strong>Image</strong>, <strong>Divider</strong>, or <strong>Checkbox</strong> block. Text blocks support Markdown.',
                    media: {
                        type: 'image',
                        file: 'boards-card-detail.webp',
                        alt: 'A card opened to show its description, properties, and comment box',
                    },
                },
                {
                    title: 'Add properties',
                    description: 'Open a card, select <strong>Add a property</strong>, then choose a type. Boards supports <strong>Text</strong>, <strong>Number</strong>, <strong>Email</strong>, <strong>Phone</strong>, <strong>URL</strong>, <strong>Select</strong>, <strong>Multi-select</strong>, <strong>Date</strong>, <strong>Person</strong>, <strong>Multi-person</strong>, and <strong>Checkbox</strong>, plus the read-only system properties <strong>Created time</strong>, <strong>Created by</strong>, <strong>Last updated time</strong>, and <strong>Last updated by</strong>.',
                    tip: 'Properties belong to the board, not the card. Adding, renaming, retyping, or deleting a property applies to every card on that board, and changing a type can lose existing values.',
                },
                {
                    title: 'Set up Select options',
                    description: 'Add a property, set its type to <strong>Select</strong> or <strong>Multi-select</strong>, then type an option name and press Enter to create it. Repeat for each option. Options show as color-coded tags — use the options menu next to an option to assign a color or delete it. Select and Person properties are what views group by, so this is where status and priority live.',
                },
                {
                    title: 'Show the properties that matter on the board',
                    description: 'Select <strong>Properties</strong> at the top of the board to choose which properties appear on the card preview. Enable <strong>Comments and Description</strong> to show badges telling you which cards have a description, how many comments they have, and how many checkboxes are ticked.',
                    media: {
                        type: 'image',
                        file: 'boards-properties-menu.webp',
                        alt: 'The Properties menu, choosing which card properties show on the board',
                    },
                },
                {
                    title: 'Comment, mention, and follow',
                    description: 'Open a card, select <strong>Add a comment…</strong>, then select <strong>Send</strong>. @mention a teammate in a comment or description and they get a direct message from the boards bot with a link to the card. You automatically follow cards you create — use <strong>Follow</strong> in the top-right of any other card to get updates on it too.',
                },
            ],
        },
        {
            id: 'views',
            navTitle: 'Views',
            icon: 'filter-variant',
            minutes: 3,
            title: 'Change how a board displays its cards',
            summary: 'A view is a saved layout with its own grouping, filters, and sort. Build several views over the same cards so each perspective is one click away.',
            steps: [
                {
                    title: 'Add a view',
                    description: 'In the board header, select the menu next to the current view name, scroll down, and select <strong>+ Add view</strong>. Then pick the layout you want.',
                },
                {
                    title: 'Pick a layout',
                    description: '<strong>Board</strong> is a kanban layout where cards sit in columns you can drag them between. <strong>Table</strong> gives you a row per card and a column per property, editable in place. <strong>Gallery</strong> shows the first image attached to each card. <strong>Calendar</strong> places cards on dates.',
                    tip: 'Calendar view needs a <strong>Date</strong> property. Without one, cards fall back to their creation date and can\'t be moved around the calendar.',
                },
                {
                    title: 'Group cards',
                    description: 'Select <strong>Group by</strong> at the top of the board and choose a <strong>Select</strong> or <strong>Person</strong> property. Grouping works in board and table views. In board view each value becomes a column, so dragging a card to another column updates that property on the card.',
                    media: {
                        type: 'image',
                        file: 'boards-group-by.webp',
                        alt: 'The Group by menu, choosing which property splits cards into columns',
                    },
                },
                {
                    title: 'Filter down to what you need',
                    description: 'Select <strong>Filter</strong> > <strong>+ Add filter</strong>, choose a property, then set the criteria: <strong>Includes</strong>, <strong>Doesn\'t include</strong>, <strong>Is empty</strong>, or <strong>Is not empty</strong>. Add more layers to narrow further — a card has to match every layer to appear.',
                    media: {
                        type: 'image',
                        file: 'boards-filter.webp',
                        alt: 'The Filter panel, narrowing a board to the cards you want',
                    },
                },
                {
                    title: 'Sort',
                    description: 'Select <strong>Sort</strong> and pick the card name or any property. Selecting the same option again switches between ascending and descending. Select <strong>Manual</strong> to clear the sort and drag cards into whatever order you want.',
                    media: {
                        type: 'image',
                        file: 'boards-sort.webp',
                        alt: 'The Sort menu, ordering cards by a property',
                    },
                },
                {
                    title: 'Search within a board',
                    description: 'Select the <strong>Search cards</strong> field in the top-right of a board to search across every card on it.',
                },
            ],
        },
        {
            id: 'sharing-and-linking',
            navTitle: 'Sharing and Linking',
            icon: 'account-multiple-outline',
            minutes: 3,
            title: 'Share a board and connect it to a channel',
            summary: 'Access is controlled per board using four roles. Link the board to a channel to bring the whole channel in at once, and export it when you need the data elsewhere.',
            steps: [
                {
                    title: 'Open the Share dialog',
                    description: 'Select <strong>Share</strong> in the top-right corner of the board. You manage all access from here, and you are an admin of any board you create.',
                    media: {
                        type: 'image',
                        file: 'boards-share-dialog.webp',
                        alt: 'The Share dialog for a board, with team access and role options',
                    },
                },
                {
                    title: 'Set team access and individual roles',
                    description: 'Next to the <strong>Everyone at</strong> team option, choose the minimum role for everyone on the team, then search for individual members to give them more. The roles are <strong>Admin</strong> (edit the board, its contents, and its permissions), <strong>Editor</strong> (edit the board and its contents), <strong>Commenter</strong> (comment on cards), and <strong>Viewer</strong> (read only).',
                    tip: 'New boards start with team access set to <strong>None</strong>, so nobody else can see a board until you share it.',
                },
                {
                    title: 'Link the board to a channel',
                    description: 'In the Share dialog, search for a channel name and add it. Everyone in that channel gets <strong>Editor</strong> access, and the board appears in the channel\'s Boards pane. To undo it, open the role dropdown next to the channel name and select <strong>Unlink</strong>.',
                    tip: 'A board can be linked to one channel at a time. Linking it to another channel removes the previous link.',
                },
                {
                    title: 'Share a link to a board or a card',
                    description: 'Select <strong>Share</strong> > <strong>Copy link</strong> and paste it into a channel or direct message — only people with permission to the board can open it. For a single card, open the card\'s options menu and select <strong>Copy link</strong>. Pasting a card link into a channel renders a preview of the card.',
                    tip: 'Publicly shared boards are turned off by default. If your System Admin has enabled them, board admins get a <strong>Publish</strong> tab in the Share dialog for a read-only public link.',
                },
                {
                    title: 'Export the board',
                    description: 'Select the options menu to the left of the <strong>New</strong> button at the top of the board. Choose <strong>Export to CSV</strong> for the cards and their property values, or <strong>Export board archive</strong> for a full copy including descriptions, comments, and image attachments. To bring an archive back in, select the gear icon next to your profile picture and choose <strong>Import archive</strong>.',
                    tip: 'A filter or search active on the board narrows a CSV export. Clear both first if you want every card.',
                },
            ],
        },
    ],
};

export default boards;
