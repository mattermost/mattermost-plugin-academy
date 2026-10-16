// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useId} from 'react';

/**
 * The hexagonal badge behind a guide's icon, drawn inline so it takes the current theme's colours.
 *
 * It used to be a fixed navy-and-gold image (public/Badge.svg), which all but disappeared on dark
 * themes: navy on Onyx's or Indigo's near-black. Now the body is the theme's button colour, the
 * band its away (amber) colour, and the icon on top `--button-color` — set by the caller, see
 * `.academy-badge-icon`. Every theme's button colour is chosen to stand out from its own
 * background, so the badge does too. Geometry is unchanged from the original art.
 */
export default function AcademyBadgeSeal({className}: {className?: string}) {
    // Filter and clip ids are document-global, and a profile popover can hold several badges.
    const id = useId().replace(/:/g, '');
    const shadow = `academy-badge-shadow-${id}`;
    const lift = `academy-badge-lift-${id}`;
    const band = `academy-badge-band-${id}`;
    const bandInner = `academy-badge-band-inner-${id}`;
    const face = `academy-badge-face-${id}`;

    const lower = 'M255 36.1603C264.282 30.8013 275.718 30.8013 285 36.1603L465.011 140.09C474.293 145.449 480.011 155.353 480.011 166.071V373.929C480.011 384.647 474.293 394.551 465.011 399.91L285 503.84C275.718 509.199 264.282 509.199 255 503.84L74.9888 399.91C65.7068 394.551 59.9888 384.647 59.9888 373.929V166.071C59.9888 155.353 65.7068 145.449 74.9888 140.09L255 36.1603Z';
    const middle = 'M254.603 -33.3032C264.44 -38.9826 276.56 -38.9826 286.397 -33.3032L477.172 76.8407C487.009 82.5201 493.069 93.0161 493.069 104.375V324.663C493.069 336.021 487.009 346.517 477.172 352.197L286.397 462.341C276.56 468.02 264.44 468.02 254.603 462.341L63.8284 352.197C53.9913 346.517 47.9315 336.021 47.9315 324.663V104.375C47.9315 93.0161 53.9913 82.5201 63.8284 76.8407L254.603 -33.3032Z';
    const upper = 'M255 -73.5406C264.282 -78.8996 275.718 -78.8996 285 -73.5406L465.011 30.3889C474.293 35.7479 480.011 45.6517 480.011 56.3697V264.229C480.011 274.947 474.293 284.85 465.011 290.209L285 394.139C275.718 399.498 264.282 399.498 255 394.139L74.9888 290.209C65.7068 284.85 59.9888 274.947 59.9888 264.229V56.3697C59.9888 45.6517 65.7068 35.7479 74.9888 30.3889L255 -73.5406Z';

    return (
        <svg
            className={className}
            viewBox='0 0 540 560'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden={true}
            focusable={false}
        >
            <defs>
                <filter
                    id={shadow}
                    x='27.9888'
                    y='20.141'
                    width='484.022'
                    height='539.718'
                    filterUnits='userSpaceOnUse'
                    colorInterpolationFilters='sRGB'
                >
                    <feDropShadow
                        dy='20'
                        stdDeviation='16'
                        floodColor='#000'
                        floodOpacity='0.48'
                    />
                </filter>
                <filter
                    id={lift}
                    x='37.9315'
                    y='-37.5627'
                    width='465.137'
                    height='524.163'
                    filterUnits='userSpaceOnUse'
                    colorInterpolationFilters='sRGB'
                >
                    <feDropShadow
                        dy='10'
                        stdDeviation='5'
                        floodColor='#000'
                        floodOpacity='0.5'
                    />
                </filter>
                <clipPath id={band}>
                    <rect
                        x='60.5'
                        y='199.5'
                        width='419'
                        height='292'
                        rx='20'
                    />
                </clipPath>
                <clipPath id={bandInner}>
                    <rect
                        x='48.5'
                        y='246.5'
                        width='444'
                        height='232'
                        rx='20'
                    />
                </clipPath>
                <clipPath id={face}>
                    <rect
                        x='27.5'
                        y='188.5'
                        width='485'
                        height='214'
                        rx='20'
                    />
                </clipPath>
            </defs>

            {/* The base, a shade darker than the face so the badge keeps its depth. */}
            <g filter={`url(#${shadow})`}>
                <path
                    d={lower}
                    fill='var(--button-bg)'
                />
                <path
                    d={lower}
                    fill='#000'
                    fillOpacity='0.24'
                />
            </g>
            <g clipPath={`url(#${band})`}>
                <g filter={`url(#${lift})`}>
                    <path
                        d={middle}
                        fill='var(--away-indicator)'
                    />
                </g>
            </g>
            <g clipPath={`url(#${bandInner})`}>
                <path
                    d={middle}
                    fill='var(--away-indicator)'
                />
            </g>
            <g clipPath={`url(#${face})`}>
                <path
                    d={upper}
                    fill='var(--button-bg)'
                />
            </g>
        </svg>
    );
}
