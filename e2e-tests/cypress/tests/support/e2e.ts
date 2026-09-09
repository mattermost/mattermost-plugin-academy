// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/// <reference path="./index.d.ts" />

import './commands';

// Mattermost's webapp throws during navigation; do not fail the suite on that.
Cypress.on('uncaught:exception', () => false);

before(() => {
    // Cypress 15 only applies Set-Cookie / cy.setCookie to the current origin.
    cy.visit('/login', {failOnStatusCode: false});
    cy.apiLogin();
    cy.apiEnsureTeam();
});
