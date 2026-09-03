// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4 as Client4Class} from '@mattermost/client';
import type {NotPagedTeamSearchOpts, Team} from '@mattermost/types/teams';
import type {UserProfile} from '@mattermost/types/users';

const Client4 = new Client4Class();

export function setClientSiteURL(siteURL: string) {
    Client4.setUrl(siteURL);
}

export function getProfilePictureUrl(userId: string, lastIconUpdate: number) {
    return Client4.getProfilePictureUrl(userId, lastIconUpdate);
}

export function getTeamIconUrl(teamId: string, lastTeamIconUpdate: number) {
    return Client4.getTeamIconUrl(teamId, lastTeamIconUpdate);
}

export async function getAutocompleteAllUsers(name: string) {
    return Client4.autocompleteUsers(name, '', '');
}

export async function getProfilesByIds(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) {
        return [];
    }
    return Client4.getProfilesByIds(userIds);
}

export async function getTeamsByIds(teamIds: string[]): Promise<Team[]> {
    if (teamIds.length === 0) {
        return [];
    }
    return Promise.all(teamIds.map((id) => Client4.getTeam(id)));
}

export async function searchTeams(term: string): Promise<Team[]> {
    const opts: NotPagedTeamSearchOpts = {};
    return Client4.searchTeams(term, opts) as unknown as Promise<Team[]>;
}
