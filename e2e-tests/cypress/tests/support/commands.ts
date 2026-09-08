// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const PLUGIN_ID = 'com.mattermost.academy';

const BASICS_MODULES = [
    'channels-and-sidebar',
    'composing',
    'formatting',
    'threads',
];

type UserProfile = {
    id: string;
    username: string;
};

type Team = {
    id: string;
    name: string;
};

Cypress.Commands.add('apiLogin', (username?: string, password?: string) => {
    const loginId = username || Cypress.env('adminUsername');
    const pass = password || Cypress.env('adminPassword');

    return cy.request({
        method: 'POST',
        url: '/api/v4/users/login',
        body: {login_id: loginId, password: pass},
    });
});

Cypress.Commands.add('apiMe', () => {
    return cy.request('/api/v4/users/me').its('body');
});

Cypress.Commands.add('apiEnsureTeam', () => {
    return cy.request('/api/v4/users/me/teams').then((res) => {
        const teams = res.body as Team[];
        if (teams.length > 0) {
            return cy.wrap(teams[0]);
        }
        return cy.request({
            method: 'POST',
            url: '/api/v4/teams',
            body: {name: 'e2e', display_name: 'E2E', type: 'O'},
        }).its('body');
    });
});

Cypress.Commands.add('apiCreateUserAndLogin', () => {
    const suffix = Date.now();
    const username = `user${suffix}`;
    const password = 'Passw0rd!';

    cy.apiLogin();
    return cy.apiEnsureTeam().then((team) => {
        return cy.request({
            method: 'POST',
            url: '/api/v4/users',
            body: {
                email: `${username}@sample.mattermost.com`,
                username,
                password,
            },
        }).then((created) => {
            const user = created.body as UserProfile;
            cy.request({
                method: 'POST',
                url: `/api/v4/teams/${team.id}/members`,
                body: {team_id: team.id, user_id: user.id},
            });
            cy.apiLogin(username, password);
            return cy.wrap(user);
        });
    });
});

Cypress.Commands.add('apiCompleteGuide', (guideId: string, moduleIds: string[] = BASICS_MODULES) => {
    cy.request({
        method: 'PUT',
        url: `/plugins/${PLUGIN_ID}/api/v1/progress/${encodeURIComponent(guideId)}`,
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        body: {completedModuleIds: moduleIds, moduleIds},
    }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.everCompleted).to.eq(true);
    });
});

Cypress.Commands.add('visitAcademy', (path = '') => {
    const suffix = path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '';
    cy.visit(`/academy${suffix}`);
});

Cypress.Commands.add('visitTownSquare', () => {
    cy.apiEnsureTeam().then((team) => {
        cy.visit(`/${team.name}/channels/town-square`);
    });
});

export {BASICS_MODULES, PLUGIN_ID};
