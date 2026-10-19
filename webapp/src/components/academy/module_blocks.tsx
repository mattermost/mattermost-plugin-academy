// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {guideAssetURL, mediaOf} from 'content';
import type {Callout, CalloutType, ChecklistItem, CommandGroup, CommandHeaders, Step, Tier, Variant} from 'content/types';
import React, {useState} from 'react';

import RichText from 'components/academy/rich_text';
import {AcademyIcon} from 'components/icons';

const CALLOUT_ICONS: Record<CalloutType, string> = {
    info: 'information-outline',
    tip: 'lightbulb-outline',
    warning: 'alert-outline',
};

/** What a screen reader announces before the callout's text, since the icon carries the type. */
const CALLOUT_LABELS: Record<CalloutType, string> = {
    info: 'Info',
    tip: 'Tip',
    warning: 'Warning',
};

function StepCallout({callout}: {callout: Callout}) {
    return (
        <div
            className={`academy-callout academy-callout--${callout.type}`}
            role='note'
            aria-label={CALLOUT_LABELS[callout.type]}
        >
            <span
                className='academy-callout__icon'
                aria-hidden={true}
            >
                <AcademyIcon
                    name={CALLOUT_ICONS[callout.type]}
                    size={16}
                />
            </span>
            <span className='academy-callout__text'>
                <RichText text={callout.text}/>
            </span>
        </div>
    );
}

/**
 * Screenshot step art is captured at 2x (capture/capture.js, `deviceScaleFactor: 2`). Without a
 * density hint the browser treats every pixel as one CSS pixel, so a 600px-wide dialog displays
 * at 1200px until the column cap stops it — step art rendered up to 2.6x larger than the product
 * it shows. The `2x` descriptor makes it render at true size. SVG art is resolution-independent
 * and carries its own dimensions, so it gets no descriptor.
 */
function stepImageSrcSet(guideId: string, file: string): string | undefined {
    return (/\.(webp|png|jpe?g)$/i).test(file) ? `${guideAssetURL(guideId, file)} 2x` : undefined;
}

export function StepList({guideId, keyPrefix, steps}: {guideId: string; keyPrefix: string; steps: Step[]}) {
    if (steps.length === 0) {
        return null;
    }

    return (
        <>
            {steps.map((step, index) => (
                <div
                    className='academy-step'
                    key={`${keyPrefix}-${index}`}
                >
                    <div className='academy-step__num'>{index + 1}</div>
                    <div className='academy-step__body'>
                        <h3 className='academy-step__title'>{step.title}</h3>
                        <p className='academy-step__desc'>
                            <RichText text={step.description}/>
                        </p>
                        {mediaOf(step).map((media) => (
                            <figure
                                className='academy-step__figure'
                                key={media.file}
                            >
                                {media.caption ? (
                                    <figcaption className='academy-step__caption'>{media.caption}</figcaption>
                                ) : null}
                                <div className='academy-step__media'>
                                    <img
                                        src={guideAssetURL(guideId, media.file)}
                                        srcSet={stepImageSrcSet(guideId, media.file)}
                                        alt={media.alt || ''}
                                    />
                                </div>
                            </figure>
                        ))}
                        {step.callout ? <StepCallout callout={step.callout}/> : null}
                    </div>
                </div>
            ))}
        </>
    );
}

export function TierList({tiers}: {tiers: Tier[]}) {
    return (
        <div className='academy-tiers'>
            {tiers.map((tier) => (
                <section
                    className='academy-tier'
                    key={tier.label}
                >
                    <header className='academy-tier__hdr'>
                        <h3 className='academy-tier__label'>{tier.label}</h3>
                        <p className='academy-tier__summary'>
                            <RichText text={tier.summary}/>
                        </p>
                    </header>
                    <ul className='academy-tier__items'>
                        {tier.items.map((item) => (
                            <li
                                className='academy-tier__item'
                                key={item.name}
                            >
                                <span className='academy-tier__item-name'>
                                    {item.name}
                                    {item.edition ? (
                                        <span className='academy-tier__badge'>{item.edition}</span>
                                    ) : null}
                                </span>
                                <span className='academy-tier__item-desc'>
                                    <RichText text={item.description}/>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

export function VariantTabs({guideId, moduleId, variants}: {guideId: string; moduleId: string; variants: Variant[]}) {
    const [active, setActive] = useState(0);
    const current = variants[active] ?? variants[0];

    return (
        <div className='academy-variants'>
            <span
                className='academy-variants__label'
                id={`${moduleId}-variants-label`}
            >
                {'Choose your setup'}
            </span>
            <div
                className='academy-variants__tabs'
                role='tablist'
                aria-labelledby={`${moduleId}-variants-label`}
            >
                {variants.map((variant, index) => (
                    <button
                        key={variant.label}
                        type='button'
                        role='tab'
                        id={`${moduleId}-tab-${index}`}
                        aria-selected={index === active}
                        aria-controls={`${moduleId}-panel-${index}`}
                        className={`academy-variants__tab${index === active ? ' academy-variants__tab--active' : ''}`}
                        onClick={() => setActive(index)}
                    >
                        {variant.label}
                    </button>
                ))}
            </div>
            <div
                className='academy-variants__panel'
                role='tabpanel'
                id={`${moduleId}-panel-${active}`}
                aria-labelledby={`${moduleId}-tab-${active}`}
            >
                <StepList
                    guideId={guideId}
                    keyPrefix={`${moduleId}-${current.label}`}
                    steps={current.steps}
                />
            </div>
        </div>
    );
}

export function Checklist({items}: {items: ChecklistItem[]}) {
    return (
        <ul className='academy-checklist'>
            {items.map((item) => (
                <li
                    className='academy-checklist__item'
                    key={item.title}
                >
                    <span
                        className='academy-checklist__marker'
                        aria-hidden={true}
                    >
                        <AcademyIcon
                            name='check'
                            size={12}
                        />
                    </span>
                    <div className='academy-checklist__body'>
                        <span className='academy-checklist__title'>{item.title}</span>
                        <span className='academy-checklist__desc'>
                            <RichText text={item.description}/>
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function CommandGroups({groups, headers}: {groups: CommandGroup[]; headers?: CommandHeaders}) {
    const [copied, setCopied] = useState<string | null>(null);

    const copyCommand = async (command: string) => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(command);
            window.setTimeout(() => setCopied(null), 1500);
        } catch {
            // ignore clipboard failures
        }
    };

    return (
        <div className='academy-cmd'>
            <div className='academy-cmd__hdr'>
                <span>{headers?.command ?? 'Command'}</span>
                <span>{headers?.description ?? 'What it does'}</span>
            </div>
            {groups.map((group) => (
                <div key={group.label}>
                    <div className='academy-cmd__group-label'>{group.label}</div>
                    {group.items.map((item) => (
                        <div
                            className='academy-cmd__item'
                            key={item.command}
                        >
                            <button
                                type='button'
                                className='academy-cmd__try'
                                onClick={() => copyCommand(item.command)}
                                title='Copy'
                            >
                                <span>{item.command}</span>
                                <AcademyIcon
                                    name={copied === item.command ? 'check' : 'content-copy'}
                                    size={14}
                                />
                            </button>
                            <span className='academy-cmd__desc'>{item.description}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
