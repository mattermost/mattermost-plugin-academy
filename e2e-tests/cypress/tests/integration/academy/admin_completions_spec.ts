// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BASICS_MODULES, PLUGIN_ID} from '../../support/commands';

const FORMULA_LAST = "=cmd|' /C calc'!A0";

describe('Academy admin completions', () => {
    it('loads the chart and exports a CSV with formula cells sanitized', () => {
        cy.apiLogin();
        cy.apiMe().then((me) => {
            cy.request({
                method: 'PUT',
                url: `/api/v4/users/${me.id}/patch`,
                body: {last_name: FORMULA_LAST},
            });
        });
        cy.apiCompleteGuide('mattermost-basics', BASICS_MODULES);

        cy.visit(`/admin_console/plugins/plugin_${PLUGIN_ID}`);
        cy.contains('Guide completions', {timeout: 20000}).should('be.visible');
        cy.get('.AcademyAdminCompletions canvas, .AcademyAdminCompletions__chart').should('exist');

        cy.intercept('GET', `**/plugins/${PLUGIN_ID}/api/v1/admin/stats/completions.csv**`).as('exportCsv');
        cy.get('.AcademyAdminCompletions__export').click();
        cy.wait('@exportCsv').then((interception) => {
            expect(interception.response?.statusCode).to.eq(200);
            const body = String(interception.response?.body || '');
            expect(body).to.contain('last_name');
            expect(body).to.contain(`'${FORMULA_LAST}`);
        });

        cy.apiMe().then((me) => {
            cy.request({
                method: 'PUT',
                url: `/api/v4/users/${me.id}/patch`,
                body: {last_name: ''},
            });
        });
    });
});
