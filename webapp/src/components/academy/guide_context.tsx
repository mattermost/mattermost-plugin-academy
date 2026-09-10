// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchGuideProgress, saveGuideProgress} from 'client/progress';
import {routes} from 'content';
import type {Guide} from 'content/types';
import {useAvailableGuide} from 'hooks/use_available_guides';
import React, {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useHistory, useParams} from 'react-router-dom';

export type GuideContextValue = {
    guide: Guide;
    completed: Set<string>;
    completeModule: (moduleId: string) => Promise<void>;
    resetProgress: () => Promise<void>;
    loading: boolean;
};

const GuideContext = React.createContext<GuideContextValue | null>(null);

export function useGuideContext() {
    const ctx = useContext(GuideContext);
    if (!ctx) {
        throw new Error('useGuideContext requires GuideProvider');
    }
    return ctx;
}

export function GuideProvider({children}: {children: React.ReactNode}) {
    const {guideId} = useParams<{guideId: string}>();

    // Modules the user cannot use are already stripped, so everything below
    // (progress, navigation, completion) operates on the visible curriculum.
    const {guide} = useAvailableGuide(guideId);
    const history = useHistory();
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!guide) {
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        fetchGuideProgress(guide.id).
            then((rec) => {
                if (!cancelled) {
                    setCompleted(new Set(rec.completedModuleIds || []));
                    setLoading(false);
                }
            }).
            catch(() => {
                if (!cancelled) {
                    setCompleted(new Set());
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [guide]);

    const persist = useCallback(async (ids: string[]) => {
        if (!guide) {
            return;
        }

        const rec = await saveGuideProgress(guide.id, ids);
        setCompleted(new Set(rec.completedModuleIds || ids));
    }, [guide]);

    const completeModule = useCallback(async (moduleId: string) => {
        if (!guide) {
            return;
        }
        const next = new Set(completed);
        next.add(moduleId);
        const ids = guide.modules.map((m) => m.id).filter((id) => next.has(id));

        // Optimistic update so /done does not bounce back before the PUT settles.
        setCompleted(next);
        await persist(ids);
    }, [completed, guide, persist]);

    const resetProgress = useCallback(async () => {
        if (!guide) {
            return;
        }

        // Keep earned completion; reopen module 1 for review (matches prior HTML behavior).
        history.push(routes.module(guide.id, guide.modules[0].id));
    }, [guide, history]);

    const value = useMemo(() => {
        if (!guide) {
            return null;
        }
        return {guide, completed, completeModule, resetProgress, loading};
    }, [completeModule, completed, guide, loading, resetProgress]);

    if (!guide || !value) {
        return null;
    }

    return (
        <GuideContext.Provider value={value}>
            {children}
        </GuideContext.Provider>
    );
}
