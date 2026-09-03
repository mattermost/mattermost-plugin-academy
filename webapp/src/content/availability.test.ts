// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {meetsPluginRequirements, resolveGuide, visibleModules} from 'content';
import type {Audience, Guide, Module} from 'content/types';

/** Default availability: no plugins running, admin guides hidden. */
const RESTRICTED = {activePluginIDs: [] as string[] | null, canSeeAdminGuides: false};

function makeModule(id: string, requiresPlugins?: string[]): Module {
    return {
        id,
        navTitle: id,
        icon: 'check',
        title: id,
        summary: '',
        steps: [],
        minutes: 1,
        requiresPlugins,
    };
}

function makeGuide(modules: Module[], requiresPlugins?: string[], audiences: Audience[] = ['end-user']): Guide {
    return {
        id: 'guide',
        title: 'Guide',
        heroTitle: 'Guide',
        subtitle: '',
        description: '',
        icon: 'check',
        audiences,
        modules,
        doneTitle: '',
        doneSummary: '',
        doneLinks: [],
        requiresPlugins,
    };
}

describe('meetsPluginRequirements', () => {
    it('allows content with no requirements', () => {
        expect(meetsPluginRequirements(undefined, [])).toBe(true);
        expect(meetsPluginRequirements([], [])).toBe(true);
    });

    it('allows content when the active plugin list is unknown', () => {
        expect(meetsPluginRequirements(['playbooks'], null)).toBe(true);
    });

    it('requires every listed plugin to be active', () => {
        expect(meetsPluginRequirements(['playbooks'], ['playbooks'])).toBe(true);
        expect(meetsPluginRequirements(['playbooks', 'focalboard'], ['playbooks'])).toBe(false);
        expect(meetsPluginRequirements(['playbooks'], [])).toBe(false);
    });
});

describe('visibleModules', () => {
    it('drops modules whose plugin is not active', () => {
        const guide = makeGuide([
            makeModule('always'),
            makeModule('boards-only', ['focalboard']),
        ]);

        expect(visibleModules(guide, []).map((m) => m.id)).toEqual(['always']);
        expect(visibleModules(guide, ['focalboard']).map((m) => m.id)).toEqual(['always', 'boards-only']);
    });
});

describe('resolveGuide', () => {
    it('hides a guide whose required plugin is not active', () => {
        const guide = makeGuide([makeModule('one')], ['focalboard']);

        expect(resolveGuide(guide, RESTRICTED)).toBeUndefined();
        expect(resolveGuide(guide, {...RESTRICTED, activePluginIDs: ['focalboard']})).toBe(guide);
    });

    it('hides a guide once every module is filtered out', () => {
        const guide = makeGuide([makeModule('one', ['focalboard'])]);

        expect(resolveGuide(guide, RESTRICTED)).toBeUndefined();
    });

    it('returns a trimmed copy when only some modules are filtered out', () => {
        const guide = makeGuide([makeModule('one'), makeModule('two', ['focalboard'])]);
        const resolved = resolveGuide(guide, RESTRICTED);

        expect(resolved).not.toBe(guide);
        expect(resolved?.modules.map((m) => m.id)).toEqual(['one']);
    });

    it('returns the original guide when nothing is filtered', () => {
        const guide = makeGuide([makeModule('one')]);

        expect(resolveGuide(guide, RESTRICTED)).toBe(guide);
    });

    it('shows plugin-required content when ignorePluginRequirements is set', () => {
        const guide = makeGuide(
            [makeModule('one'), makeModule('two', ['focalboard'])],
            ['playbooks'],
        );

        expect(resolveGuide(guide, {...RESTRICTED, ignorePluginRequirements: true})).toBe(guide);
    });

    it('does not open admin-only guides just because plugin requirements are ignored', () => {
        const guide = makeGuide([makeModule('one', ['focalboard'])], undefined, ['admin']);

        expect(resolveGuide(guide, {...RESTRICTED, ignorePluginRequirements: true})).toBeUndefined();
        expect(resolveGuide(guide, {...RESTRICTED, ignorePluginRequirements: true, canSeeAdminGuides: true})).toBe(guide);
    });

    it('hides admin-only guides unless the viewer may see them', () => {
        const guide = makeGuide([makeModule('one')], undefined, ['admin']);

        expect(resolveGuide(guide, RESTRICTED)).toBeUndefined();
        expect(resolveGuide(guide, {...RESTRICTED, canSeeAdminGuides: true})).toBe(guide);
    });

    it('shows guides aimed at both audiences to everyone', () => {
        const guide = makeGuide([makeModule('one')], undefined, ['end-user', 'admin']);

        expect(resolveGuide(guide, RESTRICTED)).toBe(guide);
    });
});
