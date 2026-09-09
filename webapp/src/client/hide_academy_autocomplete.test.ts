/**
 * @jest-environment jsdom
 */

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    hideAcademyAutocomplete,
    isCommandAutocompleteRequest,
    omitAcademyAutocomplete,
} from 'client/hide_academy_autocomplete';

describe('omitAcademyAutocomplete', () => {
    it('removes /academy from suggestion payloads', () => {
        expect(omitAcademyAutocomplete([
            {Complete: 'away', Suggestion: 'away'},
            {Complete: 'academy', Suggestion: 'academy', Description: 'Mattermost Academy'},
            {Complete: 'help', Suggestion: 'help'},
        ])).toEqual([
            {Complete: 'away', Suggestion: 'away'},
            {Complete: 'help', Suggestion: 'help'},
        ]);
    });

    it('removes the academy command from autocomplete command lists', () => {
        expect(omitAcademyAutocomplete([
            {trigger: 'join', auto_complete_desc: 'Join a channel'},
            {trigger: 'academy', auto_complete_desc: 'Mattermost Academy'},
        ])).toEqual([
            {trigger: 'join', auto_complete_desc: 'Join a channel'},
        ]);
    });

    it('leaves non-arrays unchanged', () => {
        const payload = {commands: [{trigger: 'academy'}]};
        expect(omitAcademyAutocomplete(payload)).toBe(payload);
    });
});

describe('isCommandAutocompleteRequest', () => {
    it('matches both autocomplete endpoints', () => {
        expect(isCommandAutocompleteRequest('/api/v4/teams/t1/commands/autocomplete')).toBe(true);
        expect(isCommandAutocompleteRequest('http://localhost:8065/api/v4/teams/t1/commands/autocomplete_suggestions?user_input=/ac')).toBe(true);
        expect(isCommandAutocompleteRequest('/api/v4/commands/execute')).toBe(false);
    });
});

describe('hideAcademyAutocomplete', () => {
    const originalFetch = window.fetch;

    afterEach(() => {
        window.fetch = originalFetch;
    });

    it('filters /academy out of autocomplete responses', async () => {
        const payload = [
            {Complete: 'academy', Suggestion: 'academy'},
            {Complete: 'logout', Suggestion: 'logout'},
        ];
        window.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => payload,
            clone: () => ({json: async () => payload}),
        });

        const restore = hideAcademyAutocomplete();
        const response = await window.fetch('/api/v4/teams/t1/commands/autocomplete_suggestions?user_input=/a');
        await expect(response.json()).resolves.toEqual([
            {Complete: 'logout', Suggestion: 'logout'},
        ]);
        restore();
    });

    it('does not touch unrelated requests', async () => {
        const payload = [{trigger: 'academy'}];
        window.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => payload,
            clone: () => ({json: async () => payload}),
        });

        const restore = hideAcademyAutocomplete();
        const response = await window.fetch('/api/v4/users/me');
        await expect(response.json()).resolves.toEqual([{trigger: 'academy'}]);
        restore();
    });
});
