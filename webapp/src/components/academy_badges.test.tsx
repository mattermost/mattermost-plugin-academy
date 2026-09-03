/**
 * @jest-environment jsdom
 */

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchPluginSettings} from 'client/settings';
import React from 'react';

import type {UserProfile} from '@mattermost/types/users';

import AcademyBadges from './academy_badges';

import {act, deferred, pluginSettings, render, waitFor} from '../../tests/render';

jest.mock('client/settings', () => ({
    fetchPluginSettings: jest.fn(),
}));

jest.mock('navigation', () => ({
    navigateToGuide: jest.fn(),
}));

const fetchPluginSettingsMock = fetchPluginSettings as jest.MockedFunction<typeof fetchPluginSettings>;

type FetchResult = {
    ok: boolean;
    json: () => Promise<unknown>;
};

const user = {id: 'user-1'} as UserProfile;

describe('AcademyBadges', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('renders nothing and does not load completions when badges are disabled', async () => {
        const settings = deferred<ReturnType<typeof pluginSettings>>();
        fetchPluginSettingsMock.mockReturnValue(settings.promise);

        const view = await render(<AcademyBadges user={user}/>);

        await act(async () => {
            settings.resolve(pluginSettings({enableProfileBadges: false}));
        });
        await waitFor(() => {
            expect(fetchPluginSettingsMock).toHaveBeenCalled();
        });

        expect(global.fetch).not.toHaveBeenCalled();
        expect(view.container.querySelector('.AcademyBadges')).toBeNull();

        await view.unmount();
    });

    it('renders nothing when the user has no completions', async () => {
        const settings = deferred<ReturnType<typeof pluginSettings>>();
        const completions = deferred<FetchResult>();
        fetchPluginSettingsMock.mockReturnValue(settings.promise);
        (global.fetch as jest.Mock).mockReturnValue(completions.promise);

        const view = await render(<AcademyBadges user={user}/>);

        await act(async () => {
            settings.resolve(pluginSettings());
        });
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
        expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain(
            '/plugins/com.mattermost.academy/api/v1/users/user-1/completions',
        );

        await act(async () => {
            completions.resolve({
                ok: true,
                json: async () => ({completions: []}),
            });
        });
        await waitFor(() => {
            expect(view.container.querySelector('.AcademyBadges')).toBeNull();
        });

        await view.unmount();
    });

    it('renders a badge for each finished guide', async () => {
        const settings = deferred<ReturnType<typeof pluginSettings>>();
        const completions = deferred<FetchResult>();
        fetchPluginSettingsMock.mockReturnValue(settings.promise);
        (global.fetch as jest.Mock).mockReturnValue(completions.promise);

        const view = await render(<AcademyBadges user={user}/>);

        await act(async () => {
            settings.resolve(pluginSettings());
        });
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        await act(async () => {
            completions.resolve({
                ok: true,
                json: async () => ({
                    completions: [{guideId: 'mattermost-basics', completedAt: 1700000000}],
                }),
            });
        });

        await waitFor(() => {
            expect(view.container.textContent).toContain('Academy Badges');
        });
        expect(view.container.querySelector('[aria-label*="Messaging Basics"]')).not.toBeNull();

        await view.unmount();
    });
});
