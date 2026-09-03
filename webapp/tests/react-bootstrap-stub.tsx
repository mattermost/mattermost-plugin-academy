// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

/** Host-provided at runtime; Jest has no Mattermost webapp bundle. */
export function OverlayTrigger({children}: {children: React.ReactNode}) {
    return children;
}

export function Tooltip({children}: {children?: React.ReactNode}) {
    return <div>{children}</div>;
}
