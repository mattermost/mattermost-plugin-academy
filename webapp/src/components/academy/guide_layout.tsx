// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {routes} from 'content';
import React, {useLayoutEffect, useRef} from 'react';
import {Link, NavLink, useLocation, useRouteMatch} from 'react-router-dom';

import {GuideProvider, useGuideContext} from 'components/academy/guide_context';
import {GuideFooterProvider, useGuideFooterState} from 'components/academy/guide_footer';
import HeaderProgress from 'components/academy/header_progress';
import RichText from 'components/academy/rich_text';
import {useHeaderCondensed} from 'components/academy/use_header_condensed';
import {AcademyIcon} from 'components/icons';

function GuideShell({children}: {children: React.ReactNode}) {
    const {guide, completed} = useGuideContext();
    const doneCount = Math.min(completed.size, guide.modules.length);
    const location = useLocation();
    const moduleMatch = useRouteMatch<{moduleId: string}>('/guides/:guideId/modules/:moduleId');
    const moduleIndex = moduleMatch ?
        guide.modules.findIndex((m) => m.id === moduleMatch.params.moduleId) :
        -1;
    const currentModule = moduleIndex >= 0 ? guide.modules[moduleIndex] : null;
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const condensed = useHeaderCondensed(headerRef, scrollRef);
    const condensedRef = useRef(condensed);
    condensedRef.current = condensed;
    const {footer, api} = useGuideFooterState();

    // Keep compact header (or expanded hero) across module switches.
    useLayoutEffect(() => {
        const root = scrollRef.current;
        if (!root) {
            return;
        }

        const isDone = (/\/done\/?$/).test(location.pathname);
        if (isDone || !condensedRef.current) {
            root.scrollTop = 0;
            return;
        }

        const header = headerRef.current;
        root.scrollTop = header ? header.offsetHeight : 0;
    }, [location.pathname]);

    return (
        <div className='academy-app__body'>
            <div className='academy-guide'>
                <nav
                    className='academy-guide__nav'
                    aria-label='Module navigation'
                >
                    <Link
                        className='academy-guide__back'
                        to={routes.catalog}
                    >
                        <AcademyIcon
                            name='arrow-left'
                            size={16}
                        />
                        {'All guides'}
                    </Link>
                    <div className='academy-guide__nav-heading'>{'Modules'}</div>
                    {guide.modules.map((mod, index) => {
                        const done = completed.has(mod.id);
                        return (
                            <NavLink
                                key={mod.id}
                                to={routes.module(guide.id, mod.id)}
                                className={`academy-guide__nav-btn${done ? ' academy-guide__nav-btn--done' : ''}`}
                                activeClassName='academy-guide__nav-btn--active'
                                title={mod.navTitle}
                            >
                                <span className='academy-guide__nav-num'>
                                    {done ? (
                                        <AcademyIcon
                                            name='check'
                                            size={12}
                                        />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <span className='academy-guide__nav-label'>{mod.navTitle}</span>
                                {mod.minutes ? (
                                    <span className='academy-guide__nav-meta'>{`~${mod.minutes} min`}</span>
                                ) : null}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className='academy-guide__main'>
                    <div
                        className='academy-guide__scroll'
                        ref={scrollRef}
                    >
                        <div
                            className={`academy-header-compact${condensed ? ' academy-header-compact--visible' : ''}`}
                            aria-hidden={!condensed}
                        >
                            <div className='academy-header-compact__brand'>
                                <span className='academy-header-compact__icon'>
                                    <AcademyIcon
                                        name={guide.icon}
                                        size={14}
                                    />
                                </span>
                                <span className='academy-header-compact__title'>{guide.heroTitle}</span>
                                {currentModule ? (
                                    <span className='academy-header-compact__module'>
                                        {`· Module ${moduleIndex + 1}: ${currentModule.title}`}
                                    </span>
                                ) : null}
                            </div>
                            <div className='academy-header-compact__progress'>
                                <span className='academy-header-compact__progress-count'>
                                    {`${doneCount}/${guide.modules.length}`}
                                </span>
                                <div className='academy-header-compact__progress-track'>
                                    <div
                                        className='academy-header-compact__progress-bar'
                                        style={{
                                            width: `${guide.modules.length ? Math.round((doneCount / guide.modules.length) * 100) : 0}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <header
                            ref={headerRef}
                            className='academy-header academy-header--in-scroll'
                        >
                            <div
                                className='academy-header__texture'
                                aria-hidden={true}
                            />
                            <div className='academy-header__content'>
                                <div className='academy-header__title-row'>
                                    <span className='academy-header__icon'>
                                        <AcademyIcon
                                            name={guide.icon}
                                            size={32}
                                        />
                                    </span>
                                    <h1 className='academy-header__title'>{guide.heroTitle}</h1>
                                </div>
                                <p className='academy-header__subtitle'>
                                    <RichText text={guide.subtitle}/>
                                </p>
                                <HeaderProgress
                                    done={doneCount}
                                    total={guide.modules.length}
                                    label={`${doneCount} / ${guide.modules.length} Modules Complete`}
                                />
                            </div>
                        </header>

                        <GuideFooterProvider api={api}>
                            {children}
                        </GuideFooterProvider>
                    </div>

                    {footer ? (
                        <div className='academy-guide__footer'>
                            {footer}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default function GuideLayout({children}: {children: React.ReactNode}) {
    return (
        <GuideProvider>
            <GuideShell>
                {children}
            </GuideShell>
        </GuideProvider>
    );
}
