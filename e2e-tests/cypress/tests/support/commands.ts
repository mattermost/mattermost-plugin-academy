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

function firstHeader(headers: Record<string, unknown>, name: string): string {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
    if (!key) {
        return '';
    }
    const value = headers[key];
    if (Array.isArray(value)) {
        return String(value[0] || '');
    }
    return value == null ? '' : String(value);
}

function csrfFromSetCookie(headers: Record<string, unknown>): string {
    const setCookie = headers['set-cookie'] ?? headers['Set-Cookie'];
    const lines = Array.isArray(setCookie) ? setCookie.map(String) : setCookie ? [String(setCookie)] : [];
    for (const line of lines) {
        const match = /(?:^|,\s*)MMCSRF=([^;]+)/i.exec(line);
        if (match) {
            return decodeURIComponent(match[1]);
        }
    }
    return '';
}

let mmAuthToken = '';

function persistSession(userId: string, headers: Record<string, unknown>) {
    const token = firstHeader(headers, 'token');
    expect(token, 'Mattermost login Token header').to.not.equal('');
    mmAuthToken = token;

    const opts: Partial<Cypress.SetCookieOptions> = {path: '/', sameSite: 'lax'};
    cy.setCookie('MMAUTHTOKEN', token, opts);
    cy.setCookie('MMUSERID', userId, opts);
    const csrf = csrfFromSetCookie(headers);
    if (csrf) {
        cy.setCookie('MMCSRF', csrf, opts);
    }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
        'X-Requested-With': 'XMLHttpRequest',
        ...(mmAuthToken ? {Authorization: `Bearer ${mmAuthToken}`} : {}),
        ...extra,
    };
}

Cypress.Commands.add('apiRequest', (options) => {
    return cy.request({
        ...options,
        headers: authHeaders(options.headers as Record<string, string> | undefined),
    });
});

function hideOnboarding(userId: string) {
    return cy.apiRequest({
        method: 'PUT',
        url: `/api/v4/users/${userId}/preferences`,
        failOnStatusCode: false,
        body: [
            {user_id: userId, category: 'recommended_next_steps', name: 'hide', value: 'true'},
            {user_id: userId, category: 'onboarding_task_list', name: 'onboarding_task_list_show', value: 'false'},
            {user_id: userId, category: 'onboarding_task_list', name: 'onboarding_task_list_open', value: 'false'},
        ],
    });
}

function dismissOnboarding() {
    cy.get('body').then(($body) => {
        const skip = [...$body[0].querySelectorAll('a, button')].find((el) => /no thanks|figure it out/i.test(el.textContent || ''));
        if (skip) {
            cy.wrap(skip).click();
        }
    });
}

Cypress.Commands.add('apiLogin', (username?: string, password?: string) => {
    const loginId = username || Cypress.env('adminUsername');
    const pass = password || Cypress.env('adminPassword');

    return cy.request({
        method: 'POST',
        url: '/api/v4/users/login',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        body: {login_id: loginId, password: pass},
    }).then((response) => {
        expect(response.status, `login as ${loginId}`).to.eq(200);
        const user = response.body as UserProfile;
        persistSession(user.id, response.headers as Record<string, unknown>);
        hideOnboarding(user.id);
        return cy.wrap(response);
    });
});

Cypress.Commands.add('apiMe', () => {
    return cy.apiRequest({url: '/api/v4/users/me'}).its('body');
});

Cypress.Commands.add('apiEnsureTeam', () => {
    return cy.apiRequest({url: '/api/v4/users/me/teams'}).then((res) => {
        const teams = res.body as Team[];
        if (teams.length > 0) {
            return cy.wrap(teams[0]);
        }
        return cy.apiRequest({
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
        return cy.apiRequest({
            method: 'POST',
            url: '/api/v4/users',
            body: {
                email: `${username}@sample.mattermost.com`,
                username,
                password,
            },
        }).then((created) => {
            const user = created.body as UserProfile;
            cy.apiRequest({
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
    cy.apiRequest({
        method: 'PUT',
        url: `/plugins/${PLUGIN_ID}/api/v1/progress/${encodeURIComponent(guideId)}`,
        body: {completedModuleIds: moduleIds, moduleIds},
    }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.everCompleted).to.eq(true);
    });
});

Cypress.Commands.add('visitAcademy', (path = '') => {
    const suffix = path && path !== '/' ? (path.startsWith('/') ? path : `/${path}`) : '';

    cy.visit(`/academy${suffix}`);
    dismissOnboarding();
});

Cypress.Commands.add('visitTownSquare', () => {
    cy.apiEnsureTeam().then((team) => {
        cy.visit(`/${team.name}/channels/town-square`);
    });
});

export {BASICS_MODULES, PLUGIN_ID};
