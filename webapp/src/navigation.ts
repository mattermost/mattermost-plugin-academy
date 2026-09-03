// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ACADEMY_BASE_PATH, academyPath, guidePath, modulePath} from 'content';

type BrowserHistory = {
    push: (path: string) => void;
    replace?: (path: string) => void;
};

type ProductStore = {
    getState: () => unknown;
    subscribe: (listener: () => void) => () => void;
};

declare global {
    interface Window {
        WebappUtils?: {
            browserHistory?: BrowserHistory;
        };
    }
}

/** Session key for the Academy URL to reopen after a plugin reload. */
const RESTORE_PATH_KEY = 'academy:restore-path';

/** Client-side product navigation when available; avoids a full webapp reload. */
function navigate(path: string, replace = false) {
    const history = window.WebappUtils?.browserHistory;
    if (replace && history?.replace) {
        history.replace(path);
        return;
    }
    if (history?.push) {
        history.push(path);
        return;
    }
    if (replace) {
        window.location.replace(path);
        return;
    }
    window.location.assign(path);
}

/** Navigate into the Academy product (full-screen). */
export function navigateToAcademy(path = '') {
    navigate(academyPath(path));
}

/** Leave Academy for the Channels product. */
export function navigateToChannels() {
    navigate('/');
}

export function navigateToGuide(guideId: string) {
    navigate(guidePath(guideId));
}

export function navigateToModule(guideId: string, moduleId: string) {
    navigate(modulePath(guideId, moduleId));
}

export function isAcademyLocation(pathname = window.location.pathname) {
    return pathname === ACADEMY_BASE_PATH || pathname.startsWith(`${ACADEMY_BASE_PATH}/`);
}

function academyProductRegistered(store: ProductStore, pluginId: string) {
    const state = store.getState() as {
        plugins?: {
            components?: {
                Product?: Array<{pluginId?: string}>;
            };
        };
    };
    const products = state.plugins?.components?.Product;
    return Boolean(products?.some((product) => product.pluginId === pluginId));
}

/**
 * Mattermost treats `/academy` as a team name when this product is
 * unregistered during plugin reload, which lands on
 * `/error?type=team_not_found`. Leave Academy immediately and restore
 * after the product is registered again.
 */
export function watchAcademyReload(store: ProductStore, pluginId: string) {
    return store.subscribe(() => {
        if (!academyProductRegistered(store, pluginId)) {
            leaveAcademyForReload();
        }
    });
}

export function leaveAcademyForReload() {
    if (!isAcademyLocation()) {
        return;
    }
    sessionStorage.setItem(RESTORE_PATH_KEY, window.location.pathname);
    navigate('/', true);
}

export function restoreAcademyAfterReload() {
    const path = sessionStorage.getItem(RESTORE_PATH_KEY);
    sessionStorage.removeItem(RESTORE_PATH_KEY);
    if (!path || !isAcademyLocation(path)) {
        return;
    }
    navigate(path);
}

export function discardAcademyRestore() {
    sessionStorage.removeItem(RESTORE_PATH_KEY);
}
