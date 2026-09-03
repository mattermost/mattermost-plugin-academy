// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/** Mattermost model.PluginStateRunning — plugins whose webapp actually loaded. */
const PLUGIN_STATE_RUNNING = 2;

type PluginStatus = {
    plugin_id?: string;
    id?: string;
    state?: number;
};

export type PluginHostState = {
    plugins?: {plugins?: Record<string, unknown>};
    entities?: {
        admin?: {
            pluginStatuses?: Record<string, PluginStatus>;
        };
    };
};

/**
 * Plugin IDs that are currently running.
 *
 * Prefers System Console pluginStatuses when present (actual running state).
 * Falls back to webapp-loaded plugins. Returns null when neither is available
 * so callers fail open instead of hiding every plugin-gated guide.
 */
export function selectActivePluginIDs(state: PluginHostState): string[] | null {
    const statuses = state.entities?.admin?.pluginStatuses;
    if (statuses && Object.keys(statuses).length > 0) {
        const ids: string[] = [];
        Object.values(statuses).forEach((status) => {
            if (status?.state !== PLUGIN_STATE_RUNNING) {
                return;
            }
            const id = status.plugin_id || status.id;
            if (id) {
                ids.push(id);
            }
        });
        return ids;
    }

    const plugins = state.plugins?.plugins;
    if (!plugins) {
        return null;
    }
    return Object.keys(plugins);
}
