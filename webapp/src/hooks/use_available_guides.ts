// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {selectActivePluginIDs} from 'client/active_plugins';
import {fetchPluginSettings} from 'client/settings';
import {GUIDE_LIST, getGuide, resolveGuide} from 'content';
import type {Guide, GuideAvailability} from 'content';
import {useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';

import type {GlobalState} from '@mattermost/types/store';

type GuidesState = {
    guides: Guide[];
    disabledGuideIDs: string[];
    canSeeAdminGuides: boolean;
    loading: boolean;
};

type Availability = GuideAvailability & {
    disabledGuideIDs: string[];
    loading: boolean;
};

const UNKNOWN: Availability = {
    disabledGuideIDs: [],
    activePluginIDs: null,
    canSeeAdminGuides: false,
    ignorePluginRequirements: false,
    loading: true,
};

function useAvailability(): Availability {
    const activePluginIDs = useSelector((state: GlobalState) => selectActivePluginIDs(state));
    const [availability, setAvailability] = useState<Availability>(UNKNOWN);

    useEffect(() => {
        let cancelled = false;
        fetchPluginSettings().
            then((settings) => {
                if (!cancelled) {
                    setAvailability({
                        disabledGuideIDs: settings.disabledGuideIDs,
                        activePluginIDs: null,
                        canSeeAdminGuides: settings.isAdmin || settings.testMode,
                        ignorePluginRequirements: settings.testMode,
                        loading: false,
                    });
                }
            }).
            catch(() => {
                if (!cancelled) {
                    setAvailability({...UNKNOWN, loading: false});
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return {
        ...availability,
        activePluginIDs: availability.ignorePluginRequirements ? null : activePluginIDs,
    };
}

/**
 * Guides the current user should see, with unavailable modules already removed
 * so callers can use `guide.modules` without repeating the filtering.
 */
export function useAvailableGuides(): GuidesState {
    const {disabledGuideIDs, activePluginIDs, canSeeAdminGuides, ignorePluginRequirements, loading} = useAvailability();

    const guides = useMemo(
        () => GUIDE_LIST.
            filter((guide) => !disabledGuideIDs.includes(guide.id)).
            map((guide) => resolveGuide(guide, {activePluginIDs, canSeeAdminGuides, ignorePluginRequirements})).
            filter((guide): guide is Guide => Boolean(guide)),
        [activePluginIDs, canSeeAdminGuides, disabledGuideIDs, ignorePluginRequirements],
    );

    return {guides, disabledGuideIDs, canSeeAdminGuides, loading};
}

/** Single-guide equivalent of useAvailableGuides, for the guide routes. */
export function useAvailableGuide(guideId: string): {guide: Guide | undefined; loading: boolean} {
    const {disabledGuideIDs, activePluginIDs, canSeeAdminGuides, ignorePluginRequirements, loading} = useAvailability();

    const guide = useMemo(() => {
        const found = getGuide(guideId);
        if (!found || disabledGuideIDs.includes(found.id)) {
            return undefined;
        }
        return resolveGuide(found, {activePluginIDs, canSeeAdminGuides, ignorePluginRequirements});
    }, [activePluginIDs, canSeeAdminGuides, disabledGuideIDs, ignorePluginRequirements, guideId]);

    return {guide, loading};
}
