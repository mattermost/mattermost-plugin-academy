// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAllProgress} from 'client/progress';
import type {ProgressRecord} from 'client/progress';
import type {Audience} from 'content/types';
import {useAvailableGuides} from 'hooks/use_available_guides';
import {navigateToChannels} from 'navigation';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import GuideCard, {guideCardCta} from 'components/academy/guide_card';
import HeaderProgress from 'components/academy/header_progress';
import {useHeaderCondensed} from 'components/academy/use_header_condensed';
import {AcademyIcon, AcademyProductIcon} from 'components/icons';

type Filter = 'all' | Audience;

const ALL_FILTERS: Array<[Filter, string]> = [
    ['all', 'All'],
    ['end-user', 'End-users'],
    ['admin', 'Admins'],
];

function completedCount(rec: ProgressRecord | undefined, moduleCount: number) {
    if (!rec) {
        return 0;
    }
    return Math.min(rec.completedModuleIds?.length || 0, moduleCount);
}

export default function CatalogPage() {
    const {guides: availableGuides, canSeeAdminGuides} = useAvailableGuides();
    const [filter, setFilter] = useState<Filter>('all');
    const [progress, setProgress] = useState<Record<string, ProgressRecord>>({});
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const condensed = useHeaderCondensed(headerRef, scrollRef);

    useEffect(() => {
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
    }, []);

    const guides = useMemo(() => {
        if (filter === 'all') {
            return availableGuides;
        }
        return availableGuides.filter((g) => g.audiences.includes(filter));
    }, [filter, availableGuides]);

    const completedGuides = availableGuides.filter((g) => progress[g.id]?.everCompleted).length;
    const progressPct = availableGuides.length ? Math.round((completedGuides / availableGuides.length) * 100) : 0;

    return (
        <div className='academy-app__body'>
            <div
                className='academy-catalog'
                ref={scrollRef}
            >
                <div
                    className={`academy-header-compact${condensed ? ' academy-header-compact--visible' : ''}`}
                    aria-hidden={!condensed}
                >
                    <button
                        type='button'
                        className='academy-header-compact__back'
                        onClick={() => navigateToChannels()}
                        tabIndex={condensed ? 0 : -1}
                    >
                        <AcademyIcon
                            name='arrow-left'
                            size={16}
                        />
                        {'Back to channels'}
                    </button>
                    <div className='academy-header-compact__brand'>
                        <span className='academy-header-compact__icon'>
                            <AcademyProductIcon size={14}/>
                        </span>
                        <span className='academy-header-compact__title'>{'Mattermost Academy'}</span>
                    </div>
                    <div className='academy-header-compact__progress'>
                        <span className='academy-header-compact__progress-count'>
                            {`${completedGuides}/${availableGuides.length}`}
                        </span>
                        <div className='academy-header-compact__progress-track'>
                            <div
                                className='academy-header-compact__progress-bar'
                                style={{width: `${progressPct}%`}}
                            />
                        </div>
                    </div>
                </div>

                <header
                    ref={headerRef}
                    className='academy-header academy-header--catalog academy-header--in-scroll'
                >
                    <div
                        className='academy-header__texture'
                        aria-hidden={true}
                    />
                    <div className='academy-header__content'>
                        <button
                            type='button'
                            className='academy-header__back'
                            onClick={() => navigateToChannels()}
                        >
                            <AcademyIcon
                                name='arrow-left'
                                size={16}
                            />
                            {'Back to channels'}
                        </button>
                        <div className='academy-header__title-row'>
                            <span className='academy-header__icon'>
                                <AcademyProductIcon size={32}/>
                            </span>
                            <h1 className='academy-header__title'>{'Mattermost Academy'}</h1>
                        </div>
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

                <div className='academy-catalog__content'>
                    {canSeeAdminGuides && (
                        <div className='academy-catalog__toolbar'>
                            <div className='academy-catalog__label'>{'Available guides'}</div>
                            <div
                                className='academy-catalog__filters'
                                role='group'
                                aria-label='Filter guides by audience'
                            >
                                {ALL_FILTERS.map(([id, label]) => (
                                    <button
                                        key={id}
                                        type='button'
                                        className={`academy-catalog__chip${filter === id ? ' academy-catalog__chip--active' : ''}`}
                                        onClick={() => setFilter(id)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {guides.length === 0 ? (
                        <p className='academy-catalog__empty'>{'No guides match this filter.'}</p>
                    ) : (
                        <div className='academy-catalog__grid'>
                            {guides.map((guide) => {
                                const done = completedCount(progress[guide.id], guide.modules.length);
                                return (
                                    <GuideCard
                                        key={guide.id}
                                        guide={guide}
                                        done={done}
                                        cta={guideCardCta(done, progress[guide.id]?.everCompleted)}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* eslint-disable-next-line @mattermost/use-external-link -- plugins cannot import host ExternalLink */}
                    <a
                        className='academy-catalog__cert'
                        href='https://certifications.mattermost.com/'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <span className='academy-catalog__cert-icon'>
                            <AcademyIcon
                                name='star'
                                size={22}
                            />
                        </span>
                        <span className='academy-catalog__cert-copy'>
                            <span className='academy-catalog__cert-title'>
                                {'Earn a recognized Mattermost technical certification'}
                            </span>
                            <span className='academy-catalog__cert-desc'>
                                {'Build and validate the technical skills needed to deploy, configure, and administer Mattermost for mission-critical collaboration.'}
                            </span>
                        </span>
                        <span className='academy-catalog__cert-external'>
                            <AcademyIcon
                                name='open-in-new'
                                size={16}
                            />
                        </span>
                    </a>
                </div>
            </div>
        </div>
    );
}
