// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchPluginSettings, resetPluginSettingsCache} from 'client/settings';

describe('fetchPluginSettings', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        resetPluginSettingsCache();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                enableProfileBadges: true,
                userAllowed: true,
                disabledGuideIDs: [],
                isAdmin: false,
                testMode: false,
            }),
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
        resetPluginSettingsCache();
    });

    it('coalesces concurrent requests into one network call', async () => {
        await Promise.all([fetchPluginSettings(), fetchPluginSettings(), fetchPluginSettings()]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('reuses the cached value within the TTL', async () => {
        await fetchPluginSettings();
        await fetchPluginSettings();
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
