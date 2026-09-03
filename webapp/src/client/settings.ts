// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import manifest from 'manifest';

export type PluginSettings = {
    enableProfileBadges: boolean;
    userAllowed: boolean;
    disabledGuideIDs: string[];
    isAdmin: boolean;

    /** When true, show plugin-gated content and admin-audience guides to everyone. */
    testMode: boolean;
};

const SETTINGS_TTL_MS = 15000;

let inFlight: Promise<PluginSettings> | null = null;
let cached: {value: PluginSettings; at: number} | null = null;

/** Test helper: drop the in-memory settings cache. */
export function resetPluginSettingsCache() {
    inFlight = null;
    cached = null;
}

async function loadPluginSettings(): Promise<PluginSettings> {
    const res = await fetch(`/plugins/${manifest.id}/api/v1/settings`, {
        credentials: 'same-origin',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
    });
    if (!res.ok) {
        throw new Error('failed to load settings');
    }
    const data = await res.json();
    return {
        enableProfileBadges: data.enableProfileBadges !== false,
        userAllowed: data.userAllowed !== false,
        disabledGuideIDs: Array.isArray(data.disabledGuideIDs) ? data.disabledGuideIDs : [],
        isAdmin: data.isAdmin === true,
        testMode: data.testMode === true,
    };
}

export async function fetchPluginSettings(): Promise<PluginSettings> {
    const now = Date.now();
    if (cached && now - cached.at < SETTINGS_TTL_MS) {
        return cached.value;
    }
    if (inFlight) {
        return inFlight;
    }
    inFlight = loadPluginSettings().
        then((value) => {
            cached = {value, at: Date.now()};
            return value;
        }).
        finally(() => {
            inFlight = null;
        });
    return inFlight;
}
