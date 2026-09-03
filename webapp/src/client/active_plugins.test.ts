// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {selectActivePluginIDs} from 'client/active_plugins';

describe('selectActivePluginIDs', () => {
    it('prefers running pluginStatuses from the admin store', () => {
        expect(selectActivePluginIDs({
            entities: {
                admin: {
                    pluginStatuses: {
                        playbooks: {plugin_id: 'playbooks', state: 2},
                        focalboard: {plugin_id: 'focalboard', state: 0},
                    },
                },
            },
            plugins: {plugins: {ignored: {}}},
        })).toEqual(['playbooks']);
    });

    it('falls back to webapp-loaded plugins', () => {
        expect(selectActivePluginIDs({
            plugins: {plugins: {playbooks: {}, 'mattermost-ai': {}}},
        })).toEqual(['playbooks', 'mattermost-ai']);
    });

    it('returns null when neither source is available', () => {
        expect(selectActivePluginIDs({})).toBeNull();
    });
});
