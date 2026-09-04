// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import advancedSearch from 'content/guides/advanced_search';
import aiQuickStart from 'content/guides/ai_quick_start';
import boards from 'content/guides/boards';
import mattermostBasics from 'content/guides/mattermost_basics';
import playbooks from 'content/guides/playbooks';
import productivityTips from 'content/guides/productivity_tips';
import updateGuide from 'content/guides/update_guide';
import type {Guide, Module} from 'content/types';
import manifest from 'manifest';

export type {Guide, Module, Audience, Step} from 'content/types';

export const ACADEMY_BASE_PATH = '/academy';

// Order here is catalog order: broadest onboarding first.
export const GUIDES: Record<string, Guide> = {
    [mattermostBasics.id]: mattermostBasics,
    [productivityTips.id]: productivityTips,
    [aiQuickStart.id]: aiQuickStart,
    [advancedSearch.id]: advancedSearch,
    [boards.id]: boards,
    [playbooks.id]: playbooks,
    [updateGuide.id]: updateGuide,
};

export const GUIDE_LIST: Guide[] = Object.values(GUIDES);

export function getGuide(guideId: string): Guide | undefined {
    return GUIDES[guideId];
}

/** Sum of each module's minute estimate. */
export function guideMinutes(guide: Guide): number {
    return guide.modules.reduce((sum, mod) => sum + mod.minutes, 0);
}

/**
 * A null `activePluginIDs` means the client could not determine what is
 * running, so nothing is filtered. An empty array means nothing is active.
 */
export function meetsPluginRequirements(
    requiresPlugins: string[] | undefined,
    activePluginIDs: string[] | null,
): boolean {
    if (!requiresPlugins || requiresPlugins.length === 0) {
        return true;
    }
    if (activePluginIDs === null) {
        return true;
    }
    return requiresPlugins.every((id) => activePluginIDs.includes(id));
}

export function visibleModules(guide: Guide, activePluginIDs: string[] | null): Module[] {
    return guide.modules.filter((mod) => meetsPluginRequirements(mod.requiresPlugins, activePluginIDs));
}

export type GuideAvailability = {
    activePluginIDs: string[] | null;
    canSeeAdminGuides: boolean;

    /** Skip hiding content whose required plugins are not running (admin test mode). */
    ignorePluginRequirements?: boolean;
};

/** Admin-only guides walk through the System Console, so they stay hidden
 * from everyone else unless the viewer is an admin or test mode is on. */
export function isAudienceVisible(guide: Guide, canSeeAdminGuides: boolean): boolean {
    return canSeeAdminGuides || guide.audiences.some((audience) => audience !== 'admin');
}

/**
 * Returns the guide with unavailable modules removed, or undefined when the
 * guide itself is unavailable or has nothing left to show.
 */
export function resolveGuide(guide: Guide, availability: GuideAvailability): Guide | undefined {
    const {canSeeAdminGuides, ignorePluginRequirements} = availability;

    // Test mode reuses fail-open: a null list means "do not filter by plugins".
    const activePluginIDs = ignorePluginRequirements ? null : availability.activePluginIDs;

    if (!isAudienceVisible(guide, canSeeAdminGuides)) {
        return undefined;
    }
    if (!meetsPluginRequirements(guide.requiresPlugins, activePluginIDs)) {
        return undefined;
    }
    const modules = visibleModules(guide, activePluginIDs);
    if (modules.length === 0) {
        return undefined;
    }
    if (modules.length === guide.modules.length) {
        return guide;
    }
    return {...guide, modules};
}

export function guideAssetURL(guideId: string, file: string) {
    return `/plugins/${manifest.id}/public/guides/assets/${guideId}/${file}`;
}

export function badgeSealURL() {
    return `/plugins/${manifest.id}/public/Badge.svg`;
}

/** Absolute browser URL path (for window.location / markdown links). */
export function academyPath(path = '') {
    if (!path || path === '/') {
        return ACADEMY_BASE_PATH;
    }
    return `${ACADEMY_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}

/** React Router paths (relative to basename `/academy`). */
export const routes = {
    catalog: '/',
    guide: (guideId: string) => `/guides/${guideId}`,
    module: (guideId: string, moduleId: string) => `/guides/${guideId}/modules/${moduleId}`,
    done: (guideId: string) => `/guides/${guideId}/done`,
};

export function guidePath(guideId: string) {
    return academyPath(routes.guide(guideId));
}

export function modulePath(guideId: string, moduleId: string) {
    return academyPath(routes.module(guideId, moduleId));
}

export function donePath(guideId: string) {
    return academyPath(routes.done(guideId));
}
