/**
 * @jest-environment jsdom
 */

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GUIDE_LIST} from 'content';
import {useAcademyAccess} from 'hooks/use_academy_access';
import {useAvailableGuides} from 'hooks/use_available_guides';
import React from 'react';

import App from './app';

import {render, waitFor} from '../../tests/render';

jest.mock('hooks/use_academy_access');
jest.mock('hooks/use_available_guides');
jest.mock('client/progress', () => ({
    fetchAllProgress: jest.fn().mockResolvedValue({}),
}));
jest.mock('navigation', () => ({
    navigateToChannels: jest.fn(),
}));

const useAcademyAccessMock = useAcademyAccess as jest.MockedFunction<typeof useAcademyAccess>;
const useAvailableGuidesMock = useAvailableGuides as jest.MockedFunction<typeof useAvailableGuides>;

describe('App access', () => {
    beforeEach(() => {
        useAvailableGuidesMock.mockReturnValue({
            guides: [GUIDE_LIST[0]],
            disabledGuideIDs: [],
            canSeeAdminGuides: false,
            loading: false,
        });
        window.history.replaceState({}, '', '/academy');

        if (typeof IntersectionObserver === 'undefined') {
            // jsdom does not implement IntersectionObserver; the catalog header uses it.
            global.IntersectionObserver = class {
                observe() { /* test stub */ }
                unobserve() { /* test stub */ }
                disconnect() { /* test stub */ }
            } as unknown as typeof IntersectionObserver;
        }
    });

    it('shows access denied instead of the catalog when the user is not allowed', async () => {
        useAcademyAccessMock.mockReturnValue('denied');

        const view = await render(<App/>);

        expect(view.container.textContent).toContain('Academy is unavailable');
        expect(view.container.textContent).toContain('You do not have access to Mattermost Academy');
        expect(view.container.textContent).not.toContain(GUIDE_LIST[0].title);

        await view.unmount();
    });

    it('shows the catalog when the user is allowed', async () => {
        useAcademyAccessMock.mockReturnValue('allowed');

        const view = await render(<App/>);

        await waitFor(() => {
            expect(view.container.textContent).toContain('Mattermost Academy');
        });
        expect(view.container.textContent).toContain(GUIDE_LIST[0].title);
        expect(view.container.textContent).not.toContain('Academy is unavailable');

        await view.unmount();
    });
});
