// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {hideAcademyAutocomplete} from 'client/hide_academy_autocomplete';
import {fetchPluginSettings} from 'client/settings';
import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';

import type {PluginRegistry} from 'types/mattermost-webapp';

import Plugin from './index';

jest.mock('client/mm_client', () => ({
    setClientSiteURL: jest.fn(),
}));

jest.mock('client/settings', () => ({
    fetchPluginSettings: jest.fn(),
}));

jest.mock('client/hide_academy_autocomplete', () => ({
    hideAcademyAutocomplete: jest.fn(() => jest.fn()),
}));

jest.mock('components/academy_badges', () => () => null);
jest.mock('components/academy_help_menu_item', () => () => null);
jest.mock('components/academy_rhs', () => () => null);
jest.mock('components/academy_rhs_title', () => () => null);
jest.mock('components/admin_guide_completions_section', () => () => null);
jest.mock('components/admin_profile_badges_section', () => () => null);
jest.mock('components/admin_user_access_section', () => () => null);
jest.mock('components/admin_user_access_setting', () => () => null);
jest.mock('components/app', () => () => null);
jest.mock('components/icons', () => ({
    AcademyProductIcon: () => null,
    ACADEMY_ICON_URL: '/plugins/com.mattermost.academy/public/academy-icon.png',
}));
jest.mock('components/learn_icon', () => () => null);

jest.mock('navigation', () => ({
    discardAcademyRestore: jest.fn(),
    isAcademyLocation: jest.fn(() => false),
    leaveAcademyForReload: jest.fn(),
    navigateToAcademy: jest.fn(),
    navigateToChannels: jest.fn(),
    restoreAcademyAfterReload: jest.fn(),
    watchAcademyReload: jest.fn(() => jest.fn()),
}));

const fetchPluginSettingsMock = fetchPluginSettings as jest.MockedFunction<typeof fetchPluginSettings>;
const hideAcademyAutocompleteMock = hideAcademyAutocomplete as jest.MockedFunction<typeof hideAcademyAutocomplete>;

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return {promise, resolve};
}

function makeRegistry() {
    return {
        registerPopoverUserAttributesComponent: jest.fn(),
        registerAdminConsoleCustomSection: jest.fn(),
        registerAdminConsoleCustomSetting: jest.fn(),
        registerProduct: jest.fn().mockReturnValue('product-id'),
        unregisterComponent: jest.fn(),
        registerRightHandSidebarComponent: jest.fn().mockReturnValue({toggleRHSPlugin: {}}),
        registerAppBarComponent: jest.fn(),
        registerChannelHeaderButtonAction: jest.fn(),
        registerUserGuideDropdownMenuAction: jest.fn(),
        registerSlashCommandWillBePostedHook: jest.fn(),
    };
}

function makeStore(): Store<GlobalState> {
    return {
        getState: () => ({
            entities: {general: {config: {SiteURL: 'http://localhost:8065'}}},
            plugins: {components: {Product: [{pluginId: 'com.mattermost.academy'}]}},
        }),
        subscribe: jest.fn().mockReturnValue(() => undefined),
        dispatch: jest.fn(),
    } as unknown as Store<GlobalState>;
}

describe('Plugin.initialize', () => {
    it('registers the Academy product before waiting for settings', async () => {
        const settings = deferred<{userAllowed: boolean}>();
        fetchPluginSettingsMock.mockReturnValue(settings.promise as ReturnType<typeof fetchPluginSettings>);

        const registry = makeRegistry();
        const plugin = new Plugin();
        const initPromise = plugin.initialize(
            registry as unknown as PluginRegistry,
            makeStore(),
        );

        expect(registry.registerProduct).toHaveBeenCalledWith(
            '/academy',
            expect.anything(),
            'Academy',
            '/academy',
            expect.anything(),
            expect.any(Function),
            expect.any(Function),
            false,
        );

        settings.resolve({userAllowed: true});
        await initPromise;
    });

    it('unregisters the product when the user is not allowed', async () => {
        fetchPluginSettingsMock.mockResolvedValue({
            enableProfileBadges: true,
            userAllowed: false,
            disabledGuideIDs: [],
            isAdmin: false,
            testMode: false,
        });

        const registry = makeRegistry();
        const plugin = new Plugin();
        await plugin.initialize(
            registry as unknown as PluginRegistry,
            makeStore(),
        );

        expect(registry.unregisterComponent).toHaveBeenCalledWith('product-id');
        expect(registry.registerAppBarComponent).not.toHaveBeenCalled();
        expect(registry.registerChannelHeaderButtonAction).not.toHaveBeenCalled();
        expect(registry.registerUserGuideDropdownMenuAction).not.toHaveBeenCalled();
        expect(registry.registerSlashCommandWillBePostedHook).not.toHaveBeenCalled();
        expect(hideAcademyAutocompleteMock).toHaveBeenCalled();
    });

    it('does not hide /academy autocomplete when the user is allowed', async () => {
        fetchPluginSettingsMock.mockResolvedValue({
            enableProfileBadges: true,
            userAllowed: true,
            disabledGuideIDs: [],
            isAdmin: false,
            testMode: false,
        });

        const registry = makeRegistry();
        const plugin = new Plugin();
        await plugin.initialize(
            registry as unknown as PluginRegistry,
            makeStore(),
        );

        expect(registry.unregisterComponent).not.toHaveBeenCalled();
        expect(registry.registerAppBarComponent).toHaveBeenCalled();
        expect(registry.registerSlashCommandWillBePostedHook).toHaveBeenCalled();
        expect(hideAcademyAutocompleteMock).not.toHaveBeenCalled();
    });
});
