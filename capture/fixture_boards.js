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

import sharp from 'sharp';

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

/*
 * One property of each kind a card commonly carries. "Add properties" lists the types, and a card
 * showing only two selects teaches none of them. Card values for these are set per card below.
 */
const OWNER = {id: 'powner00000000000000000000', name: 'Owner', type: 'person', options: []};
const DUE = {id: 'pdue0000000000000000000000', name: 'Due date', type: 'date', options: []};
const ESTIMATE = {id: 'pestimate00000000000000000', name: 'Estimate (days)', type: 'number', options: []};
const TAGS = {
    id: 'ptags000000000000000000000',
    name: 'Tags',
    type: 'multiSelect',
    options: [
        {id: 'otagci0000000000000000000', value: 'CI', color: 'propColorBlue'},
        {id: 'otaginfra0000000000000000', value: 'Infra', color: 'propColorPurple'},
        {id: 'otagdocs00000000000000000', value: 'Docs', color: 'propColorGreen'},
    ],
};
const SPEC = {id: 'pspec000000000000000000000', name: 'Spec', type: 'url', options: []};
const REVIEWED = {id: 'previewed00000000000000000', name: 'Design reviewed', type: 'checkbox', options: []};

const CARD_PROPERTIES = [STATUS, PRIORITY, OWNER, DUE, ESTIMATE, TAGS, SPEC, REVIEWED];

/**
 * The description on the card the card-detail shot opens. "Write the description" names Text,
 * Divider and Checkbox blocks, so the description is built from all three.
 */
const CARD_DESCRIPTION = {
    card: 'Rewrite the deploy pipeline',
    blocks: [
        {
            type: 'text',
            title: 'Move the pipeline off the shared runner. Builds should cache dependencies, and every ' +
                'deploy takes a database snapshot first, so a rollback always has something to restore.',
        },
        {type: 'divider', title: ''},
        {type: 'text', title: '**Done when**'},
        {type: 'checkbox', title: 'Builds cache dependencies between runs', fields: {value: true}},
        {type: 'checkbox', title: 'Every deploy takes a database snapshot first', fields: {value: true}},
        {type: 'checkbox', title: 'A rollback restores the latest snapshot', fields: {value: false}},
    ],
};

/**
 * Cards, with the extra property values. `due` is a day of the *current* month: the calendar view
 * opens on this month, and cards dated in another one leave it empty. `owner` names a fixture user.
 */
const CARDS = [
    {
        title: 'Rewrite the deploy pipeline', icon: '🚀', status: 'ostatusprogress0000000000', priority: 'opriorityhigh000000000000',
        owner: 'alex.lindman', due: 9, estimate: '5', tags: ['otagci0000000000000000000', 'otaginfra0000000000000000'],
        spec: 'https://example.com/specs/deploy-pipeline', reviewed: true,
    },
    {title: 'Add rollback automation', icon: '🧯', status: 'ostatusprogress0000000000', priority: 'opriorityhigh000000000000', owner: 'maya.kessler', due: 14, estimate: '3', tags: ['otaginfra0000000000000000'], art: 'flow'},
    {title: 'Snapshot before every migration', icon: '🗃️', status: 'ostatusreview000000000000', priority: 'oprioritymedium0000000000', owner: 'jordan.reyes', due: 6, estimate: '2', art: 'snapshots'},
    {title: 'Document the on-call runbook', icon: '📓', status: 'ostatusbacklog00000000000', priority: 'oprioritymedium0000000000', owner: 'maya.kessler', due: 21, estimate: '1', tags: ['otagdocs00000000000000000'], art: 'doc'},
    {title: 'Trim the smoke test suite', icon: '🧪', status: 'ostatusbacklog00000000000', priority: 'oprioritylow0000000000000', due: 23, tags: ['otagci0000000000000000000'], art: 'bars'},
    {title: 'Move error tracking off the legacy host', icon: '📉', status: 'ostatusdone00000000000000', priority: 'oprioritymedium0000000000', owner: 'jordan.reyes', due: 2, art: 'line'},
];

/**
 * Invented illustrations for the cards' first image block. Gallery view "shows the first image
 * attached to each card", so a gallery of cards without one is a grid of blank tiles. Drawn here
 * rather than checked in, for the same reason as the file-search attachments.
 */
const ART_INK = '#1c58d9';
const ART_MUTED = '#c9ccd3';
function cardArtSvg(kind) {
    const frame = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#f4f6fa"/>${body}</svg>`;
    const box = (x, label) => `<rect x="${x}" y="105" width="96" height="60" rx="8" fill="#ffffff" stroke="${ART_INK}" stroke-width="2"/>` +
        `<text x="${x + 48}" y="141" font-family="Helvetica" font-size="15" fill="#3f4350" text-anchor="middle">${label}</text>`;
    const arrow = (x) => `<path d="M${x} 135 h20 m-7 -6 l7 6 l-7 6" stroke="${ART_MUTED}" stroke-width="2" fill="none"/>`;
    switch (kind) {
    case 'flow':
        return frame(box(36, 'Deploy') + arrow(138) + box(164, 'Check') + arrow(266) + box(292, 'Roll back').replace(ART_INK, '#d24b4e'));
    case 'snapshots':
        return frame([0, 1, 2].map((i) => {
            const x = 110 + (i * 110);
            return `<ellipse cx="${x}" cy="95" rx="40" ry="12" fill="#ffffff" stroke="${ART_INK}" stroke-width="2"/>` +
                `<path d="M${x - 40} 95 v80 a40 12 0 0 0 80 0 v-80" fill="#ffffff" stroke="${ART_INK}" stroke-width="2"/>` +
                `<text x="${x}" y="215" font-family="Helvetica" font-size="13" fill="#3f4350" text-anchor="middle">v${7 + i}.0</text>`;
        }).join(''));
    case 'doc':
        return frame(`<rect x="150" y="30" width="180" height="210" rx="6" fill="#ffffff" stroke="${ART_MUTED}" stroke-width="2"/>` +
            `<rect x="170" y="54" width="110" height="12" rx="3" fill="${ART_INK}"/>` +
            [84, 104, 124, 144, 164, 184, 204].map((y, i) => `<rect x="170" y="${y}" width="${[140, 120, 132, 96, 140, 110, 70][i]}" height="7" rx="3" fill="${ART_MUTED}"/>`).join(''));
    case 'bars':
        return frame([92, 68, 74, 40, 30, 22].map((h, i) => `<rect x="${70 + (i * 60)}" y="${220 - (h * 1.8)}" width="36" height="${h * 1.8}" rx="3" fill="${i < 3 ? ART_MUTED : ART_INK}"/>`).join('') +
            `<line x1="50" y1="220" x2="430" y2="220" stroke="${ART_MUTED}" stroke-width="2"/>`);
    case 'line':
        return frame(`<polyline points="50,70 110,90 170,80 230,150 290,185 350,195 430,200" fill="none" stroke="${ART_INK}" stroke-width="4" stroke-linejoin="round"/>` +
            `<line x1="50" y1="220" x2="430" y2="220" stroke="${ART_MUTED}" stroke-width="2"/>`);
    default:
        throw new Error(`no card art "${kind}"`);
    }
}


/** Noon UTC on `day` of the current month, as a Boards date value. */
function dueValue(day) {
    const now = new Date();
    return JSON.stringify({from: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12)});
}

/** A card's full property map, as Boards stores it. Unset properties are simply absent. */
function cardProperties(card, people) {
    const props = {[STATUS.id]: card.status, [PRIORITY.id]: card.priority};
    if (card.owner) {
        props[OWNER.id] = people[card.owner];
    }
    if (card.due) {
        props[DUE.id] = dueValue(card.due);
    }
    if (card.estimate) {
        props[ESTIMATE.id] = card.estimate;
    }
    if (card.tags) {
        props[TAGS.id] = card.tags;
    }
    if (card.spec) {
        props[SPEC.id] = card.spec;
    }
    if (card.reviewed) {
        props[REVIEWED.id] = 'true';
    }
    return props;
}

/**
 * The other boards on the team, and how the sidebar files them. "Organize your sidebar" is about
 * categories, and a sidebar holding one board in the default category has none to show.
 */
const OTHER_BOARDS = [
    {title: 'Bug Triage', icon: '🐞', cards: ['Export times out on large teams', 'Avatar cache serves stale images']},
    {title: 'Sprint 42', icon: '🏃', cards: ['Ship the new empty state', 'Retire the legacy job runner']},
    {title: 'Q4 Launch Plan', icon: '📣', cards: ['Draft the launch post', 'Brief the support team']},
    {title: 'Team Retrospective', icon: '🔁', cards: ['What went well', 'What to change']},
];

const SIDEBAR_CATEGORIES = [
    {name: 'Platform', boards: [BOARD.title, 'Bug Triage', 'Sprint 42']},
    {name: 'Planning', boards: ['Q4 Launch Plan', 'Team Retrospective']},
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
        // Most routes answer JSON; moving a board between categories answers a bare "ok".
        try {
            return text ? JSON.parse(text) : null;
        } catch {
            return text;
        }
    }

    async boardsInTeam(teamId) {
        return this.req('GET', `/teams/${teamId}/boards`);
    }

    /** Uploads an image to a board and returns its file id. Multipart, so not through `req`. */
    async upload(teamId, boardId, name, buffer) {
        const form = new FormData();
        form.append('file', new Blob([buffer], {type: 'image/png'}), name);
        const res = await fetch(`${this.siteURL}/plugins/focalboard/api/v2/teams/${teamId}/${boardId}/files`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${this.token}`, 'X-Requested-With': 'XMLHttpRequest'},
            body: form,
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`upload ${name} -> ${res.status}: ${text.slice(0, 200)}`);
        }
        return JSON.parse(text).fileId;
    }
}

/**
 * Ensures the fixture boards exist: the main board with its properties, cards, views and card
 * description, the smaller boards beside it, and the sidebar categories that file them.
 *
 * Idempotent on board title: a re-run reuses an existing board rather than stacking duplicates,
 * which would change what every board shot frames — and reconciles it to the current fixture.
 *
 * `people` maps fixture usernames to user ids, for the Owner property.
 *
 * Returns the main board; its view ids by layout, because Boards reopens whichever view was used
 * last and a shot has to name the one it wants; and the featured card and the view it opens in,
 * for the card-link post.
 */
export async function seedBoards(siteURL, viewerToken, teamId, userId, log, people) {
    const api = new Boards(siteURL, viewerToken);
    const all = await api.boardsInTeam(teamId);

    let board = all.find((b) => b.title === BOARD.title);
    if (board) {
        log(`  board "${BOARD.title}" already present`);
    } else {
        board = await createMainBoard(api, teamId, userId, people);
        log(`  board "${BOARD.title}" created with ${CARDS.length} cards`);
    }
    const {card, views} = await reconcileBoard(api, board, teamId, userId, log, people);

    const byTitle = {[BOARD.title]: board};
    for (const spec of OTHER_BOARDS) {
        byTitle[spec.title] = all.find((b) => b.title === spec.title) || await createSmallBoard(api, teamId, userId, spec);
    }
    await reconcileCategories(api, teamId, userId, byTitle);
    log(`  ${OTHER_BOARDS.length} more boards, filed into ${SIDEBAR_CATEGORIES.map((c) => c.name).join(' and ')}`);

    return {board, card, views};
}

function blockBase(boardId, userId) {
    const now = Date.now();
    return {boardId, parentId: boardId, schema: 1, createAt: now, updateAt: now, deleteAt: 0, createdBy: userId, modifiedBy: userId};
}

const VIEW_DEFAULTS = {
    sortOptions: [],
    visiblePropertyIds: [STATUS.id, PRIORITY.id],
    visibleOptionIds: [],
    hiddenOptionIds: [],
    collapsedOptionIds: [],
    filter: {operation: 'and', filters: []},
    cardOrder: [],
    columnWidths: {},
    kanbanCalculations: {},
    defaultTemplateId: '',
};

/**
 * The views the Views module needs, by layout. Board keeps to Status and Priority so the Kanban
 * cards stay compact; Table shows the columns a reader would compare across cards; Calendar places
 * cards by Due date.
 */
const VIEWS = [
    {viewType: 'board', title: 'Board view', fields: {groupById: STATUS.id, hiddenOptionIds: ['']}},
    {
        viewType: 'table',
        title: 'Table view',
        fields: {
            groupById: '',
            visiblePropertyIds: [STATUS.id, PRIORITY.id, OWNER.id, DUE.id, ESTIMATE.id],

            // The default widths truncate both the card names and the dates.
            columnWidths: {__title: 270, [STATUS.id]: 130, [PRIORITY.id]: 100, [OWNER.id]: 150, [DUE.id]: 120, [ESTIMATE.id]: 130},
        },
    },
    // `__title` is Boards' own id for the card name; the gallery omits names without it.
    {viewType: 'gallery', title: 'Gallery view', fields: {visiblePropertyIds: ['__title', STATUS.id, OWNER.id]}},
    {viewType: 'calendar', title: 'Calendar view', fields: {dateDisplayPropertyId: DUE.id, visiblePropertyIds: []}},
];

async function createMainBoard(api, teamId, userId, people) {
    const board = await api.req('POST', '/boards', {
        teamId,
        type: 'O',
        title: BOARD.title,
        description: BOARD.description,
        cardProperties: CARD_PROPERTIES,
        showDescription: true,
    });
    const base = blockBase(board.id, userId);
    const cardIds = CARDS.map(() => newId('c'));
    const cards = CARDS.map((card, i) => ({
        ...base,
        id: cardIds[i],
        type: 'card',
        title: card.title,
        fields: {properties: cardProperties(card, people), contentOrder: [], icon: card.icon, isTemplate: false},
    }));

    // The board view only; reconcileBoard adds the rest, the same way it would for a board
    // seeded before they existed.
    const view = {
        ...base,
        id: newId('v'),
        type: 'view',
        title: VIEWS[0].title,
        fields: {...VIEW_DEFAULTS, cardOrder: cardIds, viewType: 'board', ...VIEWS[0].fields},
    };
    await api.req('POST', `/boards/${board.id}/blocks?disable_notify=true`, [view, ...cards]);
    return board;
}

/** A board with a Status property, a board view and a couple of cards — enough to open. */
async function createSmallBoard(api, teamId, userId, spec) {
    const board = await api.req('POST', '/boards', {
        teamId,
        type: 'O',
        title: spec.title,
        icon: spec.icon,
        cardProperties: [STATUS],
    });
    const base = blockBase(board.id, userId);
    const cards = spec.cards.map((title) => ({
        ...base,
        id: newId('c'),
        type: 'card',
        title,
        fields: {properties: {[STATUS.id]: 'ostatusbacklog00000000000'}, contentOrder: [], icon: '', isTemplate: false},
    }));
    const view = {
        ...base,
        id: newId('v'),
        type: 'view',
        title: 'Board view',
        fields: {...VIEW_DEFAULTS, visiblePropertyIds: [STATUS.id], cardOrder: cards.map((c) => c.id), viewType: 'board', groupById: STATUS.id, hiddenOptionIds: ['']},
    };
    await api.req('POST', `/boards/${board.id}/blocks?disable_notify=true`, [view, ...cards]);
    return board;
}

/**
 * Brings the main board up to the current fixture: its properties, every card's values, its views,
 * and the featured card's description.
 *
 * The board is created once and then reused, so anything added to the fixture later has to be
 * applied here or a server seeded before the change would never get it.
 */
async function reconcileBoard(api, board, teamId, userId, log, people) {
    const base = () => blockBase(board.id, userId);

    // Board members, so the Owner property can name them. Boards resolves a person property only
    // against the board's own members: anyone else renders as "Empty", value set or not.
    const members = await api.req('GET', `/boards/${board.id}/members`);
    for (const id of Object.values(people)) {
        if (!members.some((m) => m.userId === id)) {
            await api.req('POST', `/boards/${board.id}/members`, {boardId: board.id, userId: id, schemeEditor: true});
        }
    }

    // Properties are merged by id, so this adds new ones and leaves values on existing cards.
    // Compared on what the fixture sets: the server adds and reorders fields of its own, so a
    // whole-object comparison reports a difference on every run.
    const shape = (p) => JSON.stringify([p.name, p.type, (p.options || []).map((o) => [o.id, o.value, o.color])]);
    const have = new Map((board.cardProperties || []).map((p) => [p.id, shape(p)]));
    if (CARD_PROPERTIES.some((p) => have.get(p.id) !== shape(p))) {
        await api.req('PATCH', `/boards/${board.id}`, {updatedCardProperties: CARD_PROPERTIES});
        log('  board properties updated');
    }

    let blocks = await api.req('GET', `/boards/${board.id}/blocks?all=true`);

    for (const spec of CARDS) {
        const card = blocks.find((b) => b.type === 'card' && b.title === spec.title);
        const want = cardProperties(spec, people);
        // Key order is the server's, not ours, so compare sorted. An unsorted comparison patched
        // every card on every run, and each patch moved the card's "Updated" time, which the
        // card-link preview prints.
        const sorted = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
        if (card && sorted(card.fields.properties || {}) !== sorted(want)) {
            await api.req('PATCH', `/boards/${board.id}/blocks/${card.id}?disable_notify=true`, {updatedFields: {properties: want}});
        }
    }

    // One view per layout. The empty "No Status" column is the first thing in the Kanban, a
    // full column of nothing, so the board view hides it; its option id is the empty string.
    const cardIds = blocks.filter((b) => b.type === 'card').map((b) => b.id);
    for (const spec of VIEWS) {
        const view = blocks.find((b) => b.type === 'view' && b.fields?.viewType === spec.viewType);
        if (!view) {
            await api.req('POST', `/boards/${board.id}/blocks?disable_notify=true`, [{
                ...base(),
                id: newId('v'),
                type: 'view',
                title: spec.title,
                fields: {...VIEW_DEFAULTS, cardOrder: cardIds, viewType: spec.viewType, ...spec.fields},
            }]);
            log(`  ${spec.title} added`);
            continue;
        }
        const stale = Object.entries(spec.fields).filter(([k, v]) => JSON.stringify(view.fields[k]) !== JSON.stringify(v));
        if (stale.length) {
            await api.req('PATCH', `/boards/${board.id}/blocks/${view.id}?disable_notify=true`, {updatedFields: Object.fromEntries(stale)});
        }
    }

    blocks = await api.req('GET', `/boards/${board.id}/blocks?all=true`);
    await reconcileArt(api, board, teamId, blocks, base, log);

    blocks = await api.req('GET', `/boards/${board.id}/blocks?all=true`);
    const views = Object.fromEntries(blocks.filter((b) => b.type === 'view').map((b) => [b.fields.viewType, b.id]));
    const card = blocks.find((b) => b.type === 'card' && b.title === CARD_DESCRIPTION.card);
    if (!card) {
        return {card: null, views};
    }
    await reconcileDescription(api, board, card, blocks, base, log);
    return {card: {id: card.id, viewId: views.board}, views};
}

/** Gives each card with `art` one image block, its first content. Uploaded once. */
async function reconcileArt(api, board, teamId, blocks, base, log) {
    let added = 0;
    for (const spec of CARDS.filter((c) => c.art)) {
        const card = blocks.find((b) => b.type === 'card' && b.title === spec.title);
        if (!card || blocks.some((b) => b.type === 'image' && b.parentId === card.id)) {
            continue;
        }
        const png = await sharp(Buffer.from(cardArtSvg(spec.art))).png().toBuffer();
        const fileId = await api.upload(teamId, board.id, `${spec.art}.png`, png);
        const [image] = await api.req('POST', `/boards/${board.id}/blocks?disable_notify=true`, [{
            ...base(),
            id: newId('i'),
            parentId: card.id,
            type: 'image',
            title: '',
            fields: {fileId},
        }]);
        await api.req('PATCH', `/boards/${board.id}/blocks/${card.id}?disable_notify=true`, {
            updatedFields: {contentOrder: [image.id, ...(card.fields.contentOrder || [])]},
        });
        added++;
    }
    if (added) {
        log(`  card art added to ${added} card(s)`);
    }
}

/**
 * Makes the featured card's description exactly CARD_DESCRIPTION's blocks, in order.
 *
 * Compared as a sequence and rebuilt whole when it differs: blocks are small, and patching one
 * into the middle of an existing order is more code than the problem deserves.
 */
async function reconcileDescription(api, board, card, blocks, base, log) {
    const CONTENT = ['text', 'divider', 'checkbox', 'image'];
    const byId = new Map(blocks.filter((b) => b.parentId === card.id && CONTENT.includes(b.type)).map((b) => [b.id, b]));
    const current = (card.fields.contentOrder || []).flat().map((id) => byId.get(id)).filter(Boolean);
    const shape = (b) => `${b.type}|${b.title}|${Boolean(b.fields?.value)}`;
    if (current.length === byId.size && current.map(shape).join('\n') === CARD_DESCRIPTION.blocks.map(shape).join('\n')) {
        return;
    }

    for (const id of byId.keys()) {
        await api.req('DELETE', `/boards/${board.id}/blocks/${id}?disable_notify=true`);
    }

    // Boards assigns its own ids on insert and ignores the ones sent, so the ids to link the
    // card to are the ones in the response — linking the sent ones points contentOrder at blocks
    // that do not exist, and the card shows "Add a description…".
    const created = await api.req('POST', `/boards/${board.id}/blocks?disable_notify=true`, CARD_DESCRIPTION.blocks.map((b) => ({
        ...base(),
        id: newId('a'),
        parentId: card.id,
        type: b.type,
        title: b.title,
        fields: b.fields || {},
    })));
    await api.req('PATCH', `/boards/${board.id}/blocks/${card.id}?disable_notify=true`, {
        updatedFields: {contentOrder: created.map((b) => b.id)},
    });
    log(`  description rebuilt on "${CARD_DESCRIPTION.card}" (${created.length} blocks)`);
}

/**
 * Files the boards into SIDEBAR_CATEGORIES for the viewer. Categories are per user, so this runs
 * on the viewer's own token, like every other Boards call here.
 */
async function reconcileCategories(api, teamId, userId, boardsByTitle) {
    const list = async () => api.req('GET', `/teams/${teamId}/categories`);
    const boardIdsIn = (c) => (c.boardMetadata || []).map((m) => m.boardID).concat(c.boardIDs || []);

    for (const spec of SIDEBAR_CATEGORIES) {
        let categories = await list();
        let category = categories.find((c) => c.name === spec.name && c.type === 'custom');
        if (!category) {
            category = await api.req('POST', `/teams/${teamId}/categories`, {name: spec.name, teamID: teamId, userID: userId, type: 'custom'});
            categories = await list();
        }
        for (const title of spec.boards) {
            const boardId = boardsByTitle[title]?.id;
            if (!boardId || boardIdsIn(categories.find((c) => c.id === category.id) || {}).includes(boardId)) {
                continue;
            }
            const from = categories.find((c) => boardIdsIn(c).includes(boardId));
            await api.req('POST', `/teams/${teamId}/categories/${category.id}/boards/${boardId}`, {fromCategoryID: from?.id || ''});
        }
    }
}

/** The Boards product suppresses its welcome screen and tour through user preferences. */
export function boardsPreferences(userId) {
    return [
        {user_id: userId, category: 'focalboard', name: 'welcomePageViewed', value: '1'},
        {user_id: userId, category: 'focalboard', name: 'onboardingTourStep', value: '999'},
        {user_id: userId, category: 'focalboard', name: 'tourCategory', value: 'sidebar'},
    ];
}
