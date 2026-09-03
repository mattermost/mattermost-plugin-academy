/**
 * @jest-environment jsdom
 */

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchPluginSettings} from 'client/settings';
import React from 'react';

import {useAcademyAccess} from './use_academy_access';

import {act, deferred, pluginSettings, render, waitFor} from '../../tests/render';

jest.mock('client/settings', () => ({
    fetchPluginSettings: jest.fn(),
}));

const fetchPluginSettingsMock = fetchPluginSettings as jest.MockedFunction<typeof fetchPluginSettings>;

function Probe() {
    const access = useAcademyAccess();
    return <div data-testid='access'>{access}</div>;
}

describe('useAcademyAccess', () => {
    it('is denied when userAllowed is false', async () => {
        const settings = deferred<ReturnType<typeof pluginSettings>>();
        fetchPluginSettingsMock.mockReturnValue(settings.promise);

        const view = await render(<Probe/>);
        expect(view.container.textContent).toBe('loading');

        await act(async () => {
            settings.resolve(pluginSettings({userAllowed: false}));
        });
        await waitFor(() => {
            expect(view.container.textContent).toBe('denied');
        });

        await view.unmount();
    });

    it('is allowed when userAllowed is true', async () => {
        const settings = deferred<ReturnType<typeof pluginSettings>>();
        fetchPluginSettingsMock.mockReturnValue(settings.promise);

        const view = await render(<Probe/>);

        await act(async () => {
            settings.resolve(pluginSettings({userAllowed: true}));
        });
        await waitFor(() => {
            expect(view.container.textContent).toBe('allowed');
        });

        await view.unmount();
    });
});
