// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-restricted-imports -- plugins cannot import host OverlayTrigger */
import {fetchPluginSettings} from 'client/settings';
import {badgeSealURL} from 'content';
import {GUIDES} from 'guides';
import manifest from 'manifest';
import {navigateToGuide} from 'navigation';
import React, {useEffect, useState} from 'react';
import {OverlayTrigger} from 'react-bootstrap';
/* eslint-enable no-restricted-imports */

import type {UserProfile} from '@mattermost/types/users';

import {AcademyBadgeTooltip, formatBadgeEarnedAt} from 'components/academy_badge_tooltip';
import {AcademyIcon} from 'components/icons';

import './academy_badges.scss';

type Completion = {
    guideId: string;
    completedAt: number;
};

type Props = {
    user?: UserProfile;
    hide?: () => void;
};

const BADGE_SEAL_URL = badgeSealURL();

/**
 * Profile popover attributes: one icon per completed Academy guide.
 * Styled tooltip shows guide name + completion date; click opens the guide.
 */
export default function AcademyBadges(props: Props) {
    const userId = props.user?.id;
    const [badgesEnabled, setBadgesEnabled] = useState<boolean | null>(null);
    const [completions, setCompletions] = useState<Completion[] | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const settings = await fetchPluginSettings();
                if (!cancelled) {
                    setBadgesEnabled(settings.enableProfileBadges);
                }
            } catch {
                if (!cancelled) {
                    // Fail open so completions still show if settings are unavailable.
                    setBadgesEnabled(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!userId || badgesEnabled !== true) {
            setCompletions([]);
            return undefined;
        }

        let cancelled = false;
        setCompletions(null);

        (async () => {
            try {
                const res = await fetch(
                    `/plugins/${manifest.id}/api/v1/users/${encodeURIComponent(userId)}/completions`,
                    {
                        credentials: 'same-origin',
                        headers: {'X-Requested-With': 'XMLHttpRequest'},
                    },
                );
                if (!res.ok) {
                    throw new Error('failed to load completions');
                }
                const data = await res.json();
                if (!cancelled) {
                    setCompletions(Array.isArray(data.completions) ? data.completions : []);
                }
            } catch {
                if (!cancelled) {
                    setCompletions([]);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, badgesEnabled]);

    if (badgesEnabled === false || !completions || completions.length === 0) {
        return null;
    }

    const badges = completions.map((c) => {
        const meta = GUIDES[c.guideId];
        if (!meta) {
            return null;
        }
        const dateLabel = formatBadgeEarnedAt(c.completedAt);
        const tooltip = (
            <AcademyBadgeTooltip
                id={`academy-badge-${c.guideId}`}
                title={meta.title}
                dateLabel={dateLabel || undefined}
            />
        );

        return (
            <OverlayTrigger
                key={c.guideId}
                delayShow={400}
                placement='top'
                overlay={tooltip}
            >
                <button
                    type='button'
                    className='AcademyBadges__badge'
                    role='listitem'
                    aria-label={`${meta.title}${dateLabel ? `, earned ${dateLabel}` : ''}. Open guide.`}
                    onClick={() => {
                        props.hide?.();
                        navigateToGuide(c.guideId);
                    }}
                >
                    <img
                        className='AcademyBadges__seal'
                        src={BADGE_SEAL_URL}
                        alt=''
                        draggable={false}
                    />
                    <span
                        className='AcademyBadges__icon'
                        aria-hidden={true}
                    >
                        <AcademyIcon
                            name={meta.icon}
                            size={18}
                        />
                    </span>
                </button>
            </OverlayTrigger>
        );
    }).filter((badge): badge is React.ReactElement => Boolean(badge));

    if (badges.length === 0) {
        return null;
    }

    return (
        <div className='AcademyBadges'>
            <strong className='user-popover__subtitle AcademyBadges__heading'>{'Academy Badges'}</strong>
            <div
                className='AcademyBadges__row'
                role='list'
                aria-label='Mattermost Academy badges'
            >
                {badges}
            </div>
        </div>
    );
}
