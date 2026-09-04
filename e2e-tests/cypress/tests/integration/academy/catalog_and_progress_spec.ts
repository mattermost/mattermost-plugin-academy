// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

describe('Academy catalog and progress', () => {
    it('opens a guide, completes a module, and keeps progress after reload', () => {
        cy.apiCreateUserAndLogin();
        cy.visitAcademy();

        cy.contains('h1', 'Mattermost Academy').should('be.visible');
        cy.contains('.academy-card__title', 'Collaboration Basics').click();

        cy.contains('h2', 'Channels and your sidebar').should('be.visible');
        cy.contains('button', 'Complete & continue').click();

        cy.contains('h2', 'Threads').should('be.visible');
        cy.reload();
        cy.contains('h2', 'Threads').should('be.visible');

        cy.visitAcademy();
        cy.contains('.academy-card', 'Collaboration Basics').
            should('contain', 'Continue').
            and('contain', '1 / 8 Modules');
    });
});
