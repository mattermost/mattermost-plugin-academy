// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setClientSiteURL} from 'client/mm_client';
import {fetchPluginSettings} from 'client/settings';
import manifest from 'manifest';
import {discardAcademyRestore, isAcademyLocation, leaveAcademyForReload, navigateToAcademy, navigateToChannels, restoreAcademyAfterReload, watchAcademyReload} from 'navigation';
import React from 'react';
import type {Store} from 'redux';

import type {GlobalState} from '@mattermost/types/store';

import AcademyBadges from 'components/academy_badges';
import AcademyHelpMenuItem from 'components/academy_help_menu_item';
import AcademyRHS from 'components/academy_rhs';
import AcademyRHSTitle from 'components/academy_rhs_title';
import AdminGuideCompletionsSection from 'components/admin_guide_completions_section';
import AdminProfileBadgesSection from 'components/admin_profile_badges_section';
import AdminUserAccessSection from 'components/admin_user_access_section';
import AdminUserAccessSetting from 'components/admin_user_access_setting';
import App from 'components/app';
import {AcademyProductIcon, ACADEMY_ICON_URL} from 'components/icons';
import LearnIcon from 'components/learn_icon';

import type {PluginRegistry} from 'types/mattermost-webapp';

export default class Plugin {
    private stopWatchingReload?: () => void;

    public async initialize(registry: PluginRegistry, store: Store<GlobalState>) {
        let siteURL = store.getState().entities.general.config.SiteURL;
        if (!siteURL) {
            siteURL = window.location.origin;
        }
        setClientSiteURL(siteURL);

        // Admin console + profile badges are always available.
        registry.registerPopoverUserAttributesComponent(AcademyBadges);
        registry.registerAdminConsoleCustomSection('ProfileBadges', AdminProfileBadgesSection);
        registry.registerAdminConsoleCustomSection('UserAccess', AdminUserAccessSection);
        registry.registerAdminConsoleCustomSetting('UserAccessConfig', AdminUserAccessSetting, {showTitle: false});
        registry.registerAdminConsoleCustomSection('GuideCompletions', AdminGuideCompletionsSection);

        // Mattermost mounts routes as soon as plugin scripts load and does not
        // wait for initialize() to finish. Register the product before any
        // await so a refresh of /academy is not treated as a missing team.
        const productId = registry.registerProduct(
            '/academy',
            <AcademyProductIcon/>,
            'Academy',
            '/academy',
            App,
            () => null,
            () => null,
            false,
        );

        let userAllowed = true;
        try {
            const settings = await fetchPluginSettings();
            userAllowed = settings.userAllowed;
        } catch {
            // Fail open if settings cannot be loaded.
            userAllowed = true;
        }

        if (!userAllowed) {
            registry.unregisterComponent(productId);
            discardAcademyRestore();
            if (isAcademyLocation()) {
                navigateToChannels();
            }
            return;
        }

        restoreAcademyAfterReload();
        this.stopWatchingReload = watchAcademyReload(store, manifest.id);

        const {toggleRHSPlugin} = registry.registerRightHandSidebarComponent(
            AcademyRHS,
            <AcademyRHSTitle/>,
        );

        if (registry.registerAppBarComponent) {
            registry.registerAppBarComponent(
                ACADEMY_ICON_URL,
                () => store.dispatch(toggleRHSPlugin),
                'Mattermost Academy',
                null as never,
            );
        }

        registry.registerChannelHeaderButtonAction(
            <LearnIcon/>,
            () => navigateToAcademy(),
            'Mattermost Academy',
            'Mattermost Academy',
        );

        registry.registerUserGuideDropdownMenuAction(
            <AcademyHelpMenuItem/>,
            () => navigateToAcademy(),
        );

        registry.registerSlashCommandWillBePostedHook((message, args) => {
            const trigger = message.trim().split(/\s+/)[0];
            if (trigger === '/learn') {
                navigateToAcademy();
                return {};
            }
            return {message, args};
        });
    }

    public uninitialize() {
        this.stopWatchingReload?.();
        this.stopWatchingReload = undefined;
        leaveAcademyForReload();
    }
}

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void;
    }
}

if (typeof window !== 'undefined') {
    window.registerPlugin(manifest.id, new Plugin());
}
