// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLayoutEffect, useState} from 'react';
import type {RefObject} from 'react';

/**
 * True once `sentinel` has scrolled out of the top of `root`.
 * Observes the Academy scroller (not window). Does not reset on navigation —
 * callers restore scroll position to keep condensed state across modules.
 */
export function useHeaderCondensed(
    sentinelRef: RefObject<HTMLElement | null>,
    rootRef: RefObject<HTMLElement | null>,
) {
    const [condensed, setCondensed] = useState(false);

    useLayoutEffect(() => {
        const sentinel = sentinelRef.current;
        const root = rootRef.current;
        if (!sentinel || !root) {
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry) {
                    return;
                }
                setCondensed(!entry.isIntersecting);
            },
            {
                root,
                threshold: 0,

                // Trip slightly before the sentinel fully leaves, so the compact
                // bar appears as the hero clears the top of the scrollport.
                rootMargin: '0px 0px 0px 0px',
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [sentinelRef, rootRef]);

    return condensed;
}
