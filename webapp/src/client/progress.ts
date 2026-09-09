// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import manifest from 'manifest';

export type ProgressRecord = {
    v?: number;
    guideId: string;
    completedModuleIds: string[];
    updatedAt?: number;
    everCompleted?: boolean;
    completedAt?: number;
};

const jsonHeaders = {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
};

function progressURL(guideId?: string) {
    const base = `/plugins/${manifest.id}/api/v1/progress`;
    return guideId ? `${base}/${encodeURIComponent(guideId)}` : base;
}

export async function fetchAllProgress(): Promise<Record<string, ProgressRecord>> {
    const res = await fetch(progressURL(), {
        credentials: 'same-origin',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
    });
    if (!res.ok) {
        throw new Error('failed to load progress');
    }
    const data = await res.json();
    return (data?.guides || {}) as Record<string, ProgressRecord>;
}

export async function fetchGuideProgress(guideId: string): Promise<ProgressRecord> {
    const res = await fetch(progressURL(guideId), {
        credentials: 'same-origin',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
    });
    if (!res.ok) {
        throw new Error('failed to load guide progress');
    }
    return res.json();
}

export async function saveGuideProgress(
    guideId: string,
    completedModuleIds: string[],
): Promise<ProgressRecord> {
    const res = await fetch(progressURL(guideId), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: jsonHeaders,
        body: JSON.stringify({completedModuleIds}),
    });
    if (!res.ok) {
        throw new Error('failed to save progress');
    }
    return res.json();
}
