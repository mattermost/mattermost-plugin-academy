// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAllProgress} from 'client/progress';
import type {ProgressRecord} from 'client/progress';
import {useAcademyAccess} from 'hooks/use_academy_access';
import {useAvailableGuides} from 'hooks/use_available_guides';
import {navigateToAcademy, navigateToGuide} from 'navigation';
import React, {useEffect, useState} from 'react';

import GuideCard, {guideCardCta} from 'components/academy/guide_card';
import HeaderProgress from 'components/academy/header_progress';
import AcademyAccessDenied from 'components/academy_access_denied';
import {LOADING_TEXTURE_URL} from 'components/icons';

import './app.scss';
import './academy_rhs.scss';

function completedCount(rec: ProgressRecord | undefined, moduleCount: number) {
    if (!rec) {
        return 0;
    }
    return Math.min(rec.completedModuleIds?.length || 0, moduleCount);
}

export default function AcademyRHS() {
    const access = useAcademyAccess();
    const {guides: availableGuides} = useAvailableGuides();
    const [progress, setProgress] = useState<Record<string, ProgressRecord>>({});

    useEffect(() => {
        if (access !== 'allowed') {
            return undefined;
        }

        let cancelled = false;
        fetchAllProgress().
            then((guides) => {
                if (!cancelled) {
                    setProgress(guides);
                }
            }).
            catch(() => {
                if (!cancelled) {
                    setProgress({});
                }
            });
        return () => {
            cancelled = true;
        };
    }, [access]);

    if (access === 'denied') {
        return <AcademyAccessDenied/>;
    }

    if (access === 'loading') {
        return <div className='academy-rhs'/>;
    }

    const completedGuides = availableGuides.filter((g) => progress[g.id]?.everCompleted).length;

    return (
        <div
            className='academy-rhs'
            style={{['--academy-loading-texture' as string]: `url(${LOADING_TEXTURE_URL})`}}
        >
            <header className='academy-header academy-header--compact'>
                <div
                    className='academy-header__texture'
                    aria-hidden={true}
                />
                <div className='academy-header__content'>
                    <h1 className='academy-header__title'>{'Mattermost Academy'}</h1>
                    <p className='academy-header__subtitle'>
                        {'Earn a badge for completing quick start guides that help you get more done in Mattermost.'}
                    </p>
                    <HeaderProgress
                        done={completedGuides}
                        total={availableGuides.length}
                        label={`${completedGuides} / ${availableGuides.length} guides complete`}
                    />
                </div>
            </header>

            <div className='academy-rhs__body'>
                <div className='academy-rhs__list'>
                    {availableGuides.map((guide) => {
                        const done = completedCount(progress[guide.id], guide.modules.length);
                        return (
                            <GuideCard
                                key={guide.id}
                                guide={guide}
                                done={done}
                                cta={guideCardCta(done, progress[guide.id]?.everCompleted)}
                                compact={true}
                                onClick={() => navigateToGuide(guide.id)}
                            />
                        );
                    })}
                </div>
            </div>

            <div className='academy-rhs__footer'>
                <button
                    type='button'
                    className='academy-btn academy-btn--primary'
                    onClick={() => navigateToAcademy()}
                >
                    {'Browse all guides'}
                </button>
            </div>
        </div>
    );
}
