// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Board fixtures for the Boards guide.
 *
 * Boards is a separate product with its own REST API under `/plugins/focalboard/api/v2`, and its
 * own data model: a *board* carries the property definitions, *blocks* are the cards and views,
 * and a card stores property values keyed by property id. None of that is reachable through the
 * Mattermost API, so this module talks to the plugin directly.
 *
 * Two things about that API are easy to trip over:
 *   - It rejects a Bearer-authenticated request with `checkCSRFToken FAILED` unless the request
 *     also carries `X-Requested-With: XMLHttpRequest`.
 *   - Blocks must arrive with an explicit `id`, `createAt` and `updateAt`. Omitting them fails
 *     with `invalid createAt for block id `, naming the empty id rather than the real problem.
 */

import {randomBytes} from 'node:crypto';

export const BOARD = {
    title: 'Platform Roadmap',
    description: 'What the platform team is shipping this quarter.',
};

/** Property definitions. Ids are fixed so card values can reference them literally. */
const STATUS = {
    id: 'pstatus0000000000000000000',
    name: 'Status',
    type: 'select',
    options: [
        {id: 'ostatusbacklog00000000000', value: 'Backlog', color: 'propColorGray'},
        {id: 'ostatusprogress0000000000', value: 'In progress', color: 'propColorYellow'},
        {id: 'ostatusreview000000000000', value: 'In review', color: 'propColorBlue'},
        {id: 'ostatusdone00000000000000', value: 'Done', color: 'propColorGreen'},
    ],
};

const PRIORITY = {
    id: 'ppriority00000000000000000',
    name: 'Priority',
    type: 'select',
    options: [
        {id: 'oprioritylow0000000000000', value: 'Low', color: 'propColorGray'},
        {id: 'oprioritymedium0000000000', value: 'Medium', color: 'propColorYellow'},
        {id: 'opriorityhigh000000000000', value: 'High', color: 'propColorRed'},
    ],
};

const CARD_PROPERTIES = [STATUS, PRIORITY];

const CARDS = [
    {title: 'Rewrite the deploy pipeline', icon: '🚀', status: 'ostatusprogress0000000000', priority: 'opriorityhigh000000000000'},
    {title: 'Add rollback automation', icon: '🧯', status: 'ostatusprogress0000000000', priority: 'opriorityhigh000000000000'},
    {title: 'Snapshot before every migration', icon: '🗃️', status: 'ostatusreview000000000000', priority: 'oprioritymedium0000000000'},
    {title: 'Document the on-call runbook', icon: '📓', status: 'ostatusbacklog00000000000', priority: 'oprioritymedium0000000000'},
    {title: 'Trim the smoke test suite', icon: '🧪', status: 'ostatusbacklog00000000000', priority: 'oprioritylow0000000000000'},
    {title: 'Move error tracking off the legacy host', icon: '📉', status: 'ostatusdone00000000000000', priority: 'oprioritymedium0000000000'},
];

const newId = (prefix) => prefix + randomBytes(13).toString('hex');

/** A client for the Boards plugin API, scoped to one authenticated user. */
export class Boards {
    constructor(siteURL, token) {
        this.siteURL = siteURL.replace(/\/$/, '');
        this.token = token;
    }

    async req(method, path, body) {
        const res = await fetch(`${this.siteURL}/plugins/focalboard/api/v2${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.token}`,

                // Without this the plugin's CSRF middleware rejects the call outright.
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
        }
        return text ? JSON.parse(text) : null;
    }

    async boardsInTeam(teamId) {
        return this.req('GET', `/teams/${teamId}/boards`);
    }
}

/**
 * Ensures the fixture board exists with its properties, cards and views.
 *
 * Idempotent on board title: a re-run reuses the existing board and leaves it alone rather than
 * stacking duplicates, which would change what every board shot frames.
 */
export async function seedBoards(siteURL, viewerToken, teamId, userId, log) {
    const api = new Boards(siteURL, viewerToken);

    const existing = (await api.boardsInTeam(teamId)).find((b) => b.title === BOARD.title);
    if (existing) {
        log(`  board "${BOARD.title}" already present`);
        return existing;
    }

    const board = await api.req('POST', '/boards', {
        teamId,
        type: 'O',
        title: BOARD.title,
        description: BOARD.description,
        cardProperties: CARD_PROPERTIES,
        showDescription: true,
    });

    const now = Date.now();
    const base = {boardId: board.id, parentId: board.id, schema: 1, createAt: now, updateAt: now, deleteAt: 0, createdBy: userId, modifiedBy: userId};

    const cardIds = CARDS.map(() => newId('c'));
    const cards = CARDS.map((card, i) => ({
        ...base,
        id: cardIds[i],
        type: 'card',
        title: card.title,
        fields: {
            properties: {[STATUS.id]: card.status, [PRIORITY.id]: card.priority},
            contentOrder: [],
            icon: card.icon,
            isTemplate: false,
        },
    }));

    const viewDefaults = {
        sortOptions: [],
        visiblePropertyIds: [STATUS.id, PRIORITY.id],
        visibleOptionIds: [],
        hiddenOptionIds: [],
        collapsedOptionIds: [],
        filter: {operation: 'and', filters: []},
        cardOrder: cardIds,
        columnWidths: {},
        kanbanCalculations: {},
        defaultTemplateId: '',
    };

    const views = [
        {
            ...base,
            id: newId('v'),
            type: 'view',
            title: 'Board view',
            fields: {...viewDefaults, viewType: 'board', groupById: STATUS.id},
        },
        {
            ...base,
            id: newId('v'),
            type: 'view',
            title: 'Table view',
            fields: {...viewDefaults, viewType: 'table', groupById: ''},
        },
    ];

    await api.req('POST', `/boards/${board.id}/blocks?disable_notify=true`, [...views, ...cards]);
    log(`  board "${BOARD.title}" created with ${cards.length} cards and ${views.length} views`);
    return board;
}

/** The Boards product suppresses its welcome screen and tour through user preferences. */
export function boardsPreferences(userId) {
    return [
        {user_id: userId, category: 'focalboard', name: 'welcomePageViewed', value: '1'},
        {user_id: userId, category: 'focalboard', name: 'onboardingTourStep', value: '999'},
        {user_id: userId, category: 'focalboard', name: 'tourCategory', value: 'sidebar'},
    ];
}
