// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

declare namespace Cypress {
    interface Chainable {
        apiLogin(username?: string, password?: string): Chainable<Cypress.Response<unknown>>;
        apiMe(): Chainable<{id: string; username: string}>;
        apiEnsureTeam(): Chainable<{id: string; name: string}>;
        apiCreateUserAndLogin(): Chainable<{id: string; username: string}>;
        apiCompleteGuide(guideId: string, moduleIds?: string[]): Chainable<void>;
        visitAcademy(path?: string): Chainable<void>;
        visitTownSquare(): Chainable<void>;
    }
}
