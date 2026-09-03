// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {PluginSettings} from 'client/settings';
import type {ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {act} from 'react-dom/test-utils';

export function pluginSettings(overrides: Partial<PluginSettings> = {}): PluginSettings {
    return {
        enableProfileBadges: true,
        userAllowed: true,
        disabledGuideIDs: [],
        isAdmin: false,
        testMode: false,
        ...overrides,
    };
}

export function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
        resolve = res;
    });
    return {promise, resolve};
}

type Rendered = {
    container: HTMLDivElement;
    unmount: () => Promise<void>;
};

export async function render(ui: ReactElement): Promise<Rendered> {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    await act(async () => {
        root.render(ui);
    });

    return {
        container,
        unmount: async () => {
            await act(async () => {
                root.unmount();
            });
            container.remove();
        },
    };
}

export {act};

export async function waitFor(assert: () => void, timeoutMs = 2000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    const attempt = async (): Promise<void> => {
        try {
            assert();
        } catch (err) {
            if (Date.now() >= deadline) {
                throw err;
            }
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 15));
            });
            await attempt();
        }
    };

    await attempt();
}
