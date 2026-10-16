// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Inserts `media` blocks into a guide's content file, keyed on step title.
 *
 * Alt text is imported from shots.js rather than restated here, so the two cannot drift: the
 * capture and the guide always describe the same image with the same words. It used to be pulled
 * out with a regex, which quietly stopped matching the moment a shot grew a comment between its
 * `module` and `alt` keys, or an `alt` long enough to be written as a concatenation.
 *
 *   node wire_media.mjs <guide-id>
 *
 * Idempotent: re-running rewrites each mapped step's image block from shots.js, so a changed
 * alt text or file name reaches the guide. A step may map to a list of shots, which become a
 * list of images, each labelled by its shot's `caption`. Steps with no mapped shot keep whatever
 * they have — nothing, which is the normal case, or an existing illustration — except an image
 * whose shot is no longer in shots.js, which is removed with it.
 */

import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {SHOTS} from './shots.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/** guide id -> content file, and step title -> shot id. */
const GUIDES = {
    /**
     * Fifteen of eighteen. Left without art: "Start in the compose area" (the formatting-toolbar
     * shot one step later is the same box), "Type markdown directly" (a reference table sits
     * under it already), and "Control notifications thread by thread" (a concept, not a screen).
     */
    'mattermost-basics': {
        file: 'mattermost_basics.ts',
        steps: {
            'Understand channel types': 'channel-types',
            'Browse and join channels': 'browse-channels',
            'Favorite the channels you visit often': 'sidebar-favorites',
            'Group channels into custom categories': 'create-category',
            'Sort and mute custom categories': 'category-menu',
            'Eliminate noise using the unreads filter': 'unreads-filter',
            'Use the formatting toolbar': 'formatting-toolbar',
            'Attach files to a message': 'attach-files',
            'Add emoji to a message': 'emoji-picker',
            'React instead of replying': 'emoji-reaction',
            'Leave a draft and come back to it': 'drafts-view',
            'Reply in a thread': 'thread-reply',
            'Follow and unfollow': 'thread-follow',
            'Work from the Threads view': 'threads-view',
            'Clear the backlog': 'threads-item-menu',
        },
    },
    /**
     * Fifteen of twenty. Scheduled messages, acknowledgements and persistent notifications are
     * licensed, so those three come from the remote test server (`source: 'remote'`), and the
     * scheduled-message capture replaces the hand-drawn scene that step had. "Mark a message
     * unread" and "Copy a permanent link" are items in the same menu the Pin step already shows.
     */
    'productivity-tips': {
        file: 'productivity_tips.ts',
        scrubSvg: true,
        steps: {
            'Schedule a message for later': 'scheduled-message-menu',
            'Request an acknowledgement': 'message-priority-ack',
            'Send persistent notifications when it truly cannot wait': 'message-priority-persistent',
            'Jump anywhere with the quick switcher': 'quick-switcher',
            'Open the command picker': 'slash-command-picker',
            'Filter and select': 'slash-command-filtered',
            'Set message priority': 'message-priority',
            'Open your notification settings': 'notification-settings',
            'Add keywords that trigger notifications': 'notification-keywords',
            'Override settings for a single channel': 'channel-notification-preferences',
            'Use Do Not Disturb and a custom status': 'status-menu',
            'Check your recent mentions': 'recent-mentions',
            'Save a message for yourself': 'saved-messages',
            'Pin a message for the channel': 'message-actions-menu',
            'Set a reminder': 'remind-menu',
        },
    },
    'advanced-search': {
        file: 'advanced_search.ts',
        steps: {
            'Choose Messages or Files': 'search-results-tabs',
            'Set how many teams to search': 'search-team-picker',
            'Jump to a message in context': 'search-jump',
            'Filter by person': 'search-from-autocomplete',
            'Filter by channel': 'search-in-autocomplete',
            'Filter by date': 'search-date-picker',
            'Combine filters': 'search-modifiers-combined',
            'Quote an exact phrase': 'search-exact-phrase',
            'Search hashtags': 'search-hashtag',
            'Switch to the Files tab': 'search-files-tab',
            'Filter by file extension': 'search-file-extension',
            'Filter by file category instead': 'search-file-type-filter',
            'Browse a channel\'s recent files': 'search-channel-files',
            'Review your recent mentions': 'search-recent-mentions',
            'Set messages aside and come back to them': 'search-saved-messages',
        },
    },
    boards: {
        file: 'boards.ts',
        steps: {
            'Open Boards from the product menu': 'boards-product-menu',
            'Organize your sidebar': 'boards-sidebar',
            'Jump straight to a board': 'boards-find-boards',
            'Open the template picker': 'boards-template-picker',
            'Turn a board you like into a template': 'boards-template-from-board',
            'Add a card': 'boards-kanban',
            'Write the description': 'boards-card-detail',
            'Add properties': 'boards-card-properties',
            'Add a view': 'boards-view-menu',
            'Pick a layout': ['boards-view-table', 'boards-view-gallery', 'boards-view-calendar'],
            'Open the Share dialog': 'boards-share-dialog',
            'Share a link to a board or a card': 'boards-card-link',
        },
    },
    /**
     * Captured from a maintained remote test server rather than the local fixture world —
     * Playbooks will not start on an unlicensed server. See `source: 'remote'` in shots.js.
     *
     * Ten steps of 34. Several of the rest are served by an image already mapped here: the
     * update dialog covers the cadence, template and broadcast steps, and the checklist shot
     * shows the assignee, due-date and task-action controls those steps describe. Mapping the
     * same picture onto four adjacent steps reads as padding, so they stay text-only.
     */
    playbooks: {
        file: 'playbooks.ts',
        steps: {
            'A playbook is the process, a run is the execution': 'pb-run-overview',
            'Runs live in a channel': 'pb-run-channel',
            'Find playbooks and runs': 'pb-playbooks-list',
            'Open the run details pane': 'pb-run-info-pane',
            'Check off tasks as you go': 'pb-checklist',
            'Post an update': 'pb-post-update-dialog',
            'Finish the run': 'pb-finish-run',
            'Build the checklist first': 'pb-playbook-editor',
            'Write the retrospective report': 'pb-retrospective',
            'Use the timeline as your source of truth': 'pb-timeline',
        },
    },
    /**
     * Two steps, out of 31, and both are the same dialog — which genuinely is the screen both
     * point at. Update Guide is mostly CLI and process: backups, schema migrations, rollbacks.
     * The pre-flight items that *would* suit a screenshot (plugin versions, PostgreSQL) are
     * `ChecklistItem`s rather than `Step`s, and ChecklistItem has no `media` field.
     */
    'update-guide': {
        file: 'update_guide.ts',
        steps: {
            'Find the version you are running': 'about-mattermost',
            'Confirm the version and schema version': 'about-mattermost',
        },
    },
    /**
     * Captures replace the guide's hand-drawn SVG scenes, which did not match the product.
     * `scrubSvg` removes the rest rather than leave a mix: Summarize Calls needs the Calls
     * plugin and ffmpeg, and AI search needs an embeddings provider and pgvector, none of which
     * a local dev server has. Everything else here is licence-gated in Agents rather than
     * absent — see the note on the AI section of shots.js.
     *
     * "Ask follow-up questions in the Agents pane" is the title of a step in two modules, and
     * both get the same picture, which is the same screen.
     */
    'ai-quick-start': {
        file: 'ai_quick_start.ts',
        scrubSvg: true,
        steps: {
            'Open the Agents pane': 'ai-agents-pane',
            'Ask Agents anything': 'ai-agents-reply',
            'Open the message actions toolbar': 'ai-post-actions',
            'Select Summarize Thread': 'ai-thread-menu',
            'Ask follow-up questions in the Agents pane': 'ai-thread-summary',
            'Select the AI Actions button in the channel header': 'ai-channel-menu',
            'Scroll to the New Messages line': 'ai-new-messages',
            'Start with your message draft': 'ai-rewrite-menu',
            'Open the Agents homepage': 'ai-agents-page',
            'Create a new agent': 'ai-create-agent',
        },
    },
};

function wire(guideId) {
    const guide = GUIDES[guideId];
    if (!guide) {
        throw new Error(`no mapping for guide "${guideId}". Known: ${Object.keys(GUIDES).join(', ')}`);
    }

    const shots = Object.fromEntries(SHOTS.map((shot) => [shot.id, shot]));
    const known = new Set(SHOTS.map((shot) => shot.id));
    let removed = 0;
    const file = path.join(ROOT, 'webapp', 'src', 'content', 'guides', guide.file);
    let lines = readFileSync(file, 'utf8').split('\n');
    const scrubbed = guide.scrubSvg ? [] : null;
    if (scrubbed) {
        lines = removeSvgMedia(lines, scrubbed);
    }

    const out = [];
    let inserted = 0;
    let present = 0;
    const matched = new Set();

    for (let i = 0; i < lines.length; i++) {
        out.push(lines[i]);

        const titleMatch = lines[i].match(/^(\s*)title: '((?:[^'\\]|\\.)*)',$/);
        if (!titleMatch) {
            continue;
        }

        const title = titleMatch[2].replace(/\\'/g, "'");
        const pad = titleMatch[1];
        const mapping = guide.steps[title];

        // Descriptions are always a single line in these files.
        const descIdx = i + 1;
        if (!/^\s*description: /.test(lines[descIdx] || '')) {
            continue;
        }
        out.push(lines[descIdx]);
        i = descIdx;

        // The existing media block, single or list, if there is one.
        let existing = null;
        if (/^\s*media: [{[]$/.test(lines[i + 1] || '')) {
            const close = new RegExp(`^${pad}[}\\]],$`);
            let end = i + 1;
            while (end < lines.length && !close.test(lines[end])) {
                end++;
            }
            existing = {start: i + 1, end, text: lines.slice(i + 1, end + 1).join('\n')};
        }

        if (!mapping) {
            // An image whose shot has been retired goes with it — the author asked for some
            // images to be removed, and a block pointing at a deleted file fails the content
            // tests. Anything else, an SVG scene or a hand-placed image, is left alone.
            const files = existing ? [...existing.text.matchAll(/file: '([^']+)\.webp'/g)].map((m) => m[1]) : [];
            if (existing && /type: 'image'/.test(existing.text) && files.length && files.every((f) => !known.has(f))) {
                i = existing.end;
                removed++;
            }
            continue;
        }

        const shotIds = [].concat(mapping);
        for (const shotId of shotIds) {
            if (!shots[shotId]) {
                throw new Error(`shots.js has no shot "${shotId}" (step "${title}")`);
            }
        }
        matched.add(title);

        // An existing image block for a mapped step is rewritten, not kept: alt text lives in
        // shots.js, and a reframed shot's new description would otherwise never reach the guide.
        // Anything else already there — an SVG scene on a step with no capture — is left alone.
        if (existing) {
            if (!/type: 'image'/.test(existing.text)) {
                present++;
                continue;
            }
            i = existing.end;
            present++;
        } else {
            inserted++;
        }

        const item = (p, shot) => [
            `${p}type: 'image',`,
            `${p}file: '${shot.id}.webp',`,
            `${p}alt: '${shot.alt.replace(/'/g, "\\'")}',`,
            ...(shot.caption ? [`${p}caption: '${shot.caption.replace(/'/g, "\\'")}',`] : []),
        ];
        if (shotIds.length === 1) {
            out.push(`${pad}media: {`, ...item(`${pad}    `, shots[shotIds[0]]), `${pad}},`);
        } else {
            out.push(`${pad}media: [`);
            for (const id of shotIds) {
                out.push(`${pad}    {`, ...item(`${pad}        `, shots[id]), `${pad}    },`);
            }
            out.push(`${pad}],`);
        }
    }

    // Every mapped title must still exist. Counting insertions instead breaks the moment one
    // title names steps in two modules.
    const mapped = Object.keys(guide.steps).length;
    const missing = Object.keys(guide.steps).filter((title) => !matched.has(title));
    if (missing.length) {
        throw new Error(
            `${guideId}: no step titled ${missing.map((t) => `"${t}"`).join(', ')}. ` +
            'A step title in the mapping no longer matches the guide.',
        );
    }

    writeFileSync(file, out.join('\n'));
    const scrubNote = scrubbed ? `, scrubbed ${scrubbed.length} SVG` : '';
    const removedNote = removed ? `, removed ${removed} retired` : '';
    console.log(`${guideId}: inserted ${inserted}, refreshed ${present}, mapped ${mapped}${removedNote}${scrubNote}`);
    return scrubbed || [];
}

/**
 * Drops every `media` block of `type: 'svg'`, collecting the files it pointed at.
 *
 * For guides whose hand-drawn scenes are being replaced wholesale: a step keeping an SVG while
 * its neighbours show the product reads worse than either on its own, and an SVG that does not
 * match the product is worse than none.
 */
function removeSvgMedia(lines, removed) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const open = lines[i].match(/^(\s*)media: \{$/);
        if (open && /type: 'svg',/.test(lines[i + 1] || '')) {
            const close = `${open[1]}},`;
            let j = i + 1;
            for (; j < lines.length && lines[j] !== close; j++) {
                const f = lines[j].match(/file: '([^']+)'/);
                if (f) {
                    removed.push(f[1]);
                }
            }
            i = j;
            continue;
        }
        out.push(lines[i]);
    }
    return out;
}

const [guideId] = process.argv.slice(2);
if (!guideId) {
    console.error(`usage: node wire_media.mjs <${Object.keys(GUIDES).join('|')}|all>`);
    process.exit(1);
}
for (const id of guideId === 'all' ? Object.keys(GUIDES) : [guideId]) {
    const scrubbed = wire(id);
    for (const file of scrubbed) {
        const asset = path.join(ROOT, 'public', 'guides', 'assets', id, file);
        if (existsSync(asset)) {
            unlinkSync(asset);
            console.log(`  removed ${path.relative(ROOT, asset)}`);
        }
    }
}
