// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Thin Mattermost API client for seeding capture fixtures.
 *
 * Deliberately plain `fetch` rather than @mattermost/client: this runs standalone under `node`
 * with no build step, and everything needed here is a handful of v4 endpoints.
 *
 * Every helper is idempotent — re-running the seed against an already-seeded server must not
 * create duplicates, or shot content drifts between runs.
 */

export class MM {
    constructor(siteURL) {
        this.siteURL = siteURL.replace(/\/$/, '');
        this.token = null;
    }

    async req(method, path, body, {expectStatus} = {}) {
        const res = await fetch(`${this.siteURL}/api/v4${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token ? {Authorization: `Bearer ${this.token}`} : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            if (expectStatus && expectStatus.includes(res.status)) {
                return {status: res.status, error: text};
            }
            throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
        }

        if (res.status === 204) {
            return null;
        }
        return res.json();
    }

    /**
     * Authenticates with a personal access token instead of a password.
     *
     * Preferred: the token is revocable, scoped to one account, and never has to be typed into a
     * shell or pasted anywhere. Mirrors pluginctl's own MM_ADMIN_TOKEN convention.
     */
    async useToken(token) {
        this.token = token;
        try {
            this.me = await this.req('GET', '/users/me');
        } catch (err) {
            throw new Error(
                `MM_ADMIN_TOKEN was rejected: ${err.message}\n` +
                '  Generate one at Profile → Security → Personal Access Tokens. If the section is\n' +
                '  missing, enable System Console → Integrations → Personal Access Tokens first.',
            );
        }
        return this.me;
    }

    /** Logs in and keeps the session token for both API calls and the browser cookie. */
    async login(loginId, password) {
        const res = await fetch(`${this.siteURL}/api/v4/users/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({login_id: loginId, password}),
        });

        if (!res.ok) {
            const detail = (await res.text()).slice(0, 300);
            const hint = res.status === 401 ?
                `\n  Check the account exists on ${this.siteURL} and is a system admin. The username is the` +
                '\n  one you log in with, not your email, unless email login is what you use.' :
                '';
            throw new Error(`login failed (${res.status}) for "${loginId}": ${detail}${hint}`);
        }

        this.token = res.headers.get('token');
        if (!this.token) {
            throw new Error('login succeeded but no token header was returned');
        }
        this.me = await res.json();
        return this.me;
    }

    async serverVersion() {
        const res = await fetch(`${this.siteURL}/api/v4/system/ping?get_server_status=true`);
        return {
            version: res.headers.get('X-Version-Id') || 'unknown',
            body: res.ok ? await res.json() : null,
        };
    }

    async activePlugins() {
        const res = await this.req('GET', '/plugins', undefined, {expectStatus: [403]});
        if (res?.error) {
            return [];
        }
        return (res.active || []).map((p) => p.id);
    }

    /* ---------------- idempotent fixture helpers ---------------- */

    async ensureTeam({name, displayName}) {
        const existing = await this.req('GET', `/teams/name/${name}`, undefined, {expectStatus: [404]});
        if (existing && !existing.error) {
            return existing;
        }
        return this.req('POST', '/teams', {name, display_name: displayName, type: 'O'});
    }

    async ensureUser({username, password, email, firstName, lastName, nickname, position}) {
        const existing = await this.req('GET', `/users/username/${username}`, undefined, {expectStatus: [404]});
        if (existing && !existing.error) {
            return existing;
        }
        return this.req('POST', '/users', {
            username,
            password,
            email,
            first_name: firstName,
            last_name: lastName,
            nickname,
            position,
        });
    }

    async addToTeam(teamId, userId) {
        return this.req('POST', `/teams/${teamId}/members`, {team_id: teamId, user_id: userId}, {expectStatus: [201, 400, 409]});
    }

    async ensureChannel(teamId, {name, displayName, purpose, type = 'O'}) {
        const existing = await this.req('GET', `/teams/${teamId}/channels/name/${name}`, undefined, {expectStatus: [404]});
        if (existing && !existing.error) {
            return existing;
        }
        return this.req('POST', '/channels', {
            team_id: teamId,
            name,
            display_name: displayName,
            purpose,
            type,
        });
    }

    async addToChannel(channelId, userId) {
        return this.req('POST', `/channels/${channelId}/members`, {user_id: userId}, {expectStatus: [201, 400, 409]});
    }

    /**
     * Posts `message` only if an identical message is not already the channel's recent history.
     * Keeps re-runs from stacking duplicates, which would shift every shot's layout.
     */
    async ensurePost(channelId, message, {rootId} = {}) {
        const match = await this.findPost(channelId, message, {rootId});
        if (match) {
            return match;
        }
        return this.req('POST', '/posts', {channel_id: channelId, message, root_id: rootId || ''});
    }

    /** The most recent post in `channelId` whose body is exactly `message`, or null. */
    async findPost(channelId, message, {rootId} = {}) {
        const page = await this.req('GET', `/channels/${channelId}/posts?per_page=60`);
        return Object.values(page.posts || {}).find(
            (p) => p.message === message && (rootId ? p.root_id === rootId : !p.root_id),
        ) || null;
    }

    async deletePost(postId) {
        return this.req('DELETE', `/posts/${postId}`, undefined, {expectStatus: [403, 404]});
    }

    /**
     * Removes the join/add system messages from a channel.
     *
     * These name whoever created the channel and added people to it — that is the *admin*
     * running the harness, so "@your-admin added you to the channel" would ship inside the
     * plugin. Any shot showing the top of a channel's history picks them up.
     */
    async deleteSystemPosts(channelId) {
        const page = await this.req('GET', `/channels/${channelId}/posts?per_page=200`);
        const system = Object.values(page.posts || {}).filter((p) => p.type?.startsWith('system_'));
        let removed = 0;
        for (const p of system) {
            const res = await this.deletePost(p.id);
            if (!res?.error) {
                removed++;
            }
        }
        return removed;
    }

    async listDrafts(userId, teamId) {
        const res = await this.req('GET', `/users/${userId}/teams/${teamId}/drafts`, undefined, {expectStatus: [404, 501]});
        return Array.isArray(res) ? res : [];
    }

    async deleteDraft(userId, channelId) {
        return this.req('DELETE', `/users/${userId}/channels/${channelId}/drafts`, undefined, {expectStatus: [404, 501]});
    }

    /**
     * Guarantees `message` exists in `channelId` and is authored by `author`.
     *
     * Author matters more than it looks. Message menus, hover toolbars and thread affordances
     * all differ on your own posts — a post that ends up owned by the capturing account grows
     * Edit and Delete items and photographs the wrong menu entirely. Because `ensurePost`
     * matches on body text alone, a fixture whose author changed in the shot list would
     * otherwise keep silently resolving to the original, wrongly-owned post from an earlier
     * run. `adminClient` is needed because only an admin can remove someone else's post.
     */
    async ensurePostBy(author, adminClient, channelId, message, {rootId} = {}) {
        const existing = await adminClient.findPost(channelId, message, {rootId});
        if (existing) {
            if (existing.user_id === author.me.id) {
                return existing;
            }
            await adminClient.deletePost(existing.id);
        }
        return author.ensurePost(channelId, message, {rootId});
    }

    /** The DM channel between two users. The endpoint returns the existing one if there is one. */
    async ensureDirectChannel(userIdA, userIdB) {
        return this.req('POST', '/channels/direct', [userIdA, userIdB]);
    }

    /** Pinning an already-pinned post is a no-op server-side, so this needs no check. */
    async pinPost(postId) {
        return this.req('POST', `/posts/${postId}/pin`);
    }

    async unpinPost(postId) {
        return this.req('POST', `/posts/${postId}/unpin`, undefined, {expectStatus: [403, 404]});
    }

    async unsavePost(userId, postId) {
        return this.req('POST', `/users/${userId}/preferences/delete`, [{
            user_id: userId,
            category: 'flagged_post',
            name: postId,
        }], {expectStatus: [400, 404]});
    }

    async removeReaction(userId, postId, emojiName) {
        return this.req('DELETE', `/users/${userId}/posts/${postId}/reactions/${emojiName}`, undefined, {expectStatus: [403, 404]});
    }

    /** Saved ("flagged") posts are stored as a preference, so re-running just rewrites it. */
    async savePost(userId, postId) {
        return this.setPreferences(userId, [{
            user_id: userId,
            category: 'flagged_post',
            name: postId,
            value: 'true',
        }]);
    }

    /**
     * Drafts are upserted by channel + root, so this is naturally idempotent.
     *
     * The route is `/drafts`, not `/users/me/drafts` — the server takes the owner from the
     * session, so this must be called on the draft owner's own client.
     */
    async ensureDraft(channelId, message, {rootId = ''} = {}) {
        return this.req('POST', '/drafts', {
            channel_id: channelId,
            message,
            root_id: rootId,
        });
    }

    /**
     * Makes `userId` follow a thread.
     *
     * Without this the Threads view is empty: you only see threads you started, replied to, or
     * were mentioned in, and the capturing user did none of those to the seeded conversation.
     */
    async followThread(userId, teamId, rootPostId) {
        return this.req('PUT', `/users/${userId}/teams/${teamId}/threads/${rootPostId}/following`);
    }

    /** 409 means the reaction is already there, which is the desired end state. */
    async ensureReaction(userId, postId, emojiName) {
        return this.req('POST', '/reactions', {
            user_id: userId,
            post_id: postId,
            emoji_name: emojiName,
        }, {expectStatus: [409]});
    }

    /**
     * Pins the account's availability.
     *
     * Presence is derived from activity, so it drifts on its own — the account goes online while
     * the browser drives it and away or offline afterwards. The availability menu puts a check
     * mark next to the current status, so that drift moves the check between runs and the
     * status-menu shot never reproduces.
     */
    async setStatus(userId, status = 'online') {
        return this.req('PUT', `/users/${userId}/status`, {user_id: userId, status});
    }

    /** Marks a channel read up to now, so unread state in shots is deliberate rather than leftover. */
    async markChannelRead(userId, channelId) {
        return this.req('POST', `/channels/members/${userId}/view`, {channel_id: channelId});
    }

    async setPreferences(userId, prefs) {
        return this.req('PUT', `/users/${userId}/preferences`, prefs);
    }

    /** Applies a built-in theme by name for the capturing user. */
    async setTheme(userId, themeName) {
        return this.setPreferences(userId, [{
            user_id: userId,
            category: 'theme',
            name: '',
            value: JSON.stringify({type: titleCase(themeName)}),
        }]);
    }

    async favoriteChannel(userId, channelId) {
        return this.setPreferences(userId, [{
            user_id: userId,
            category: 'favorite_channel',
            name: channelId,
            value: 'true',
        }]);
    }

    /**
     * Pins the sidebar preferences the shots depend on.
     *
     * `show_unread_section` is the important one: channel_navigator.tsx renders the unreads
     * *filter* only when the unreads *category* is off, so leaving this to whatever the
     * account happens to have set makes the unreads-filter shot pass or fail by accident.
     */
    async setSidebarPreferences(userId) {
        return this.setPreferences(userId, [
            {user_id: userId, category: 'sidebar_settings', name: 'show_unread_section', value: 'false'},
            {user_id: userId, category: 'sidebar_settings', name: 'group_channels_by_type', value: 'false'},
        ]);
    }

    /** Turns off onboarding/tour prompts that would otherwise cover the UI in every shot. */
    async suppressOnboarding(userId) {
        const off = (category, name) => ({user_id: userId, category, name, value: '999'});
        return this.setPreferences(userId, [
            off('tutorial_step', userId),
            {user_id: userId, category: 'onboarding_task_list', name: 'onboarding_task_list_open', value: 'false'},
            {user_id: userId, category: 'onboarding_task_list', name: 'onboarding_task_list_show', value: 'false'},
            {user_id: userId, category: 'drafts', name: 'drafts_tour_tip_showed', value: JSON.stringify({drafts_tour_tip_showed: true})},
            {user_id: userId, category: 'crt_thread_pane_step', name: userId, value: '999'},
            {user_id: userId, category: 'crt_tutorial_triggered', name: userId, value: '999'},
        ]);
    }
}

function titleCase(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
