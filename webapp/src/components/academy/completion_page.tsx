// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {routes} from 'content';
import React from 'react';
import {Link, Redirect} from 'react-router-dom';

import {useGuideContext} from 'components/academy/guide_context';
import RichText from 'components/academy/rich_text';
import AcademyBadgeSeal from 'components/academy_badge_seal';
import {AcademyIcon} from 'components/icons';

export default function CompletionPage() {
    const {guide, completed, resetProgress, loading} = useGuideContext();

    const allDone = guide.modules.every((m) => completed.has(m.id));
    if (!loading && !allDone) {
        const firstIncomplete = guide.modules.find((m) => !completed.has(m.id));
        if (firstIncomplete) {
            return <Redirect to={routes.module(guide.id, firstIncomplete.id)}/>;
        }
    }

    return (
        <div className='academy-done'>
            <div
                className='academy-done__badge'
                role='img'
                aria-label={guide.title}
            >
                <AcademyBadgeSeal className='academy-done__seal'/>
                <span className='academy-done__badge-icon'>
                    <AcademyIcon
                        name={guide.icon}
                        size={36}
                    />
                </span>
            </div>
            <div className='academy-done__eyebrow'>{'Badge earned'}</div>
            <h2 className='academy-done__title'>{guide.doneTitle}</h2>
            <p className='academy-done__body'>
                <RichText text={guide.doneSummary}/>
            </p>
            <div className='academy-done__actions'>
                <button
                    type='button'
                    className='academy-btn academy-btn--tertiary'
                    onClick={() => {
                        resetProgress().catch(() => undefined);
                    }}
                >
                    <AcademyIcon
                        name='refresh'
                        size={16}
                    />
                    {'Review from start'}
                </button>
                <Link
                    className='academy-btn academy-btn--primary'
                    to={routes.catalog}
                >
                    {'Back to catalog'}
                </Link>
            </div>
            <div className='academy-done__links'>
                {guide.doneLinks.map((link) => {
                    // Plugins cannot import host ExternalLink.
                    return (

                        // eslint-disable-next-line @mattermost/use-external-link
                        <a
                            key={link.href}
                            className='academy-link academy-done__link'
                            href={link.href}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            {link.label}
                            <AcademyIcon
                                name='open-in-new'
                                size={14}
                            />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
