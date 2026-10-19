// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Guide} from 'content';
import type {Audience} from 'content/types';
import React from 'react';

export type AudienceFilterValue = 'all' | Audience;

const FILTERS: Array<[AudienceFilterValue, string]> = [
    ['all', 'All'],
    ['end-user', 'End-users'],
    ['admin', 'Admins'],
];

/** The guides an audience filter leaves. */
export function filterByAudience(guides: Guide[], filter: AudienceFilterValue): Guide[] {
    return filter === 'all' ? guides : guides.filter((g) => g.audiences.includes(filter));
}

/**
 * All / End-users / Admins chips, shared by the catalog and the RHS. Only worth drawing for
 * someone who can see admin guides; everyone else has a single audience to choose from.
 */
export default function AudienceFilter({value, onChange}: {value: AudienceFilterValue; onChange: (value: AudienceFilterValue) => void}) {
    return (
        <div
            className='academy-catalog__filters'
            role='group'
            aria-label='Filter guides by audience'
        >
            {FILTERS.map(([id, label]) => (
                <button
                    key={id}
                    type='button'
                    className={`academy-catalog__chip${value === id ? ' academy-catalog__chip--active' : ''}`}
                    aria-pressed={value === id}
                    onClick={() => onChange(id)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
