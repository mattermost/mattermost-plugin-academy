// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const ACADEMY_TRIGGER = 'academy';

function requestURL(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
        return input;
    }
    if (input instanceof URL) {
        return input.href;
    }
    return input.url;
}

export function isCommandAutocompleteRequest(input: RequestInfo | URL): boolean {
    return requestURL(input).includes('/commands/autocomplete');
}

function firstToken(value: string): string {
    return value.trim().replace(/^\//, '').split(/\s+/)[0]?.toLowerCase() ?? '';
}

function suggestionTrigger(item: unknown): string {
    if (typeof item === 'string') {
        return firstToken(item);
    }
    if (!item || typeof item !== 'object') {
        return '';
    }
    const record = item as Record<string, unknown>;
    for (const key of ['trigger', 'Complete', 'Suggestion', 'complete', 'suggestion']) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) {
            return firstToken(value);
        }
    }
    return '';
}

export function omitAcademyAutocomplete(data: unknown): unknown {
    if (!Array.isArray(data)) {
        return data;
    }
    return data.filter((item) => suggestionTrigger(item) !== ACADEMY_TRIGGER);
}

/**
 * Mattermost registers plugin slash commands for every user. Strip /academy
 * from this client's autocomplete responses so denied users never see it.
 */
function jsonResponse(source: Response, data: unknown): Response {
    const body = JSON.stringify(data);
    return {
        ok: source.ok,
        status: source.status,
        statusText: source.statusText,
        headers: source.headers,
        url: source.url,
        redirected: source.redirected,
        type: source.type,
        json: async () => data,
        text: async () => body,
        clone: () => jsonResponse(source, data),
    } as Response;
}

export function hideAcademyAutocomplete(): () => void {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await originalFetch(input, init);
        if (!isCommandAutocompleteRequest(input) || !response.ok) {
            return response;
        }
        try {
            const filtered = omitAcademyAutocomplete(await response.clone().json());
            return jsonResponse(response, filtered);
        } catch {
            return response;
        }
    };
    return () => {
        window.fetch = originalFetch;
    };
}
