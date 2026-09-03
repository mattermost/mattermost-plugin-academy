// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {selectActivePluginIDs} from 'client/active_plugins';
import {useSelector} from 'react-redux';

import type {GlobalState} from '@mattermost/types/store';

/**
 * Plugin IDs currently running, or null when the client cannot tell.
 */
export function useActivePluginIDs(): {activePluginIDs: string[] | null} {
    const activePluginIDs = useSelector((state: GlobalState) => selectActivePluginIDs(state));
    return {activePluginIDs};
}
