// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BASICS_MODULES} from '../../support/commands';

describe('Academy profile badges', () => {
    it('shows a badge on the profile popover after finishing a guide', () => {
        cy.apiCreateUserAndLogin().then((user) => {
            cy.apiCompleteGuide('mattermost-basics', BASICS_MODULES);

            cy.visitAcademy();
            cy.contains('.academy-card', 'Collaboration Basics').should('contain', 'Review');

            cy.apiEnsureTeam().then((team) => {
                cy.apiRequest({url: `/api/v4/teams/${team.id}/channels/name/town-square`}).then((ch) => {
                    cy.apiRequest({
                        method: 'POST',
                        url: '/api/v4/posts',
                        body: {channel_id: (ch.body as {id: string}).id, message: `badge check ${user.username}`},
                    });
                });
                cy.visit(`/${team.name}/channels/town-square`);
            });
        });

        cy.contains('.post', 'badge check', {timeout: 20000}).
            find('.user-popover, button.user-popover, .post__header a').
            first().
            click({force: true});
        cy.contains('Academy Badges', {timeout: 15000}).should('be.visible');
        cy.get('.AcademyBadges__badge').should('have.length.at.least', 1);
    });
});
