// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getAutocompleteAllUsers,
    getProfilesByIds,
    getProfilePictureUrl,
    getTeamIconUrl,
    getTeamsByIds,
    searchTeams,
} from 'client/mm_client';
import React, {useCallback, useEffect, useState} from 'react';
import type {MultiValue, StylesConfig} from 'react-select';
import AsyncSelect from 'react-select/async';

import type {UserProfile} from '@mattermost/types/users';

import './select_user.scss';

type Option = {
    value: string;
    label: string;
};

type TeamOption = Option & {
    isTeam: true;
    displayName: string;
    icon?: string;
};

type UserOption = Option & {
    isTeam?: false;
    avatar: string;
};

type UserOrTeamOption = UserOption | TeamOption;

type Props = {
    userIDs: string[];
    teamIDs: string[];
    onChangeIDs: (userIds: string[], teamIds: string[]) => void;
    disabled?: boolean;
};

const selectStyles: StylesConfig<UserOrTeamOption, true> = {
    multiValue: (base) => ({
        ...base,
        backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
        borderRadius: '16px',
    }),
    multiValueRemove: (base) => ({
        ...base,
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        cursor: 'pointer',
        borderRadius: '50%',
        padding: '0',
        margin: '5px',
        '&:hover': {
            backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
            color: 'rgba(var(--center-channel-color-rgb), 0.72)',
        },
    }),
    menu: (base) => ({
        ...base,
        zIndex: 9999,
    }),
    menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
    }),
};

function TeamOptionLabel({option}: {option: TeamOption}) {
    const [showAvatar, setShowAvatar] = useState(Boolean(option.icon));

    const handleImageError = useCallback(() => {
        setShowAvatar(false);
    }, []);

    return (
        <div className='AcademySelectUser__label'>
            {showAvatar && option.icon && (
                <img
                    className='AcademySelectUser__avatar'
                    src={option.icon}
                    onError={handleImageError}
                    alt=''
                />
            )}
            <span>{option.displayName}</span>
            <span className='AcademySelectUser__teamBadge'>{'TEAM'}</span>
        </div>
    );
}

export default function SelectUser(props: Props) {
    const [selectedOptions, setSelectedOptions] = useState<UserOrTeamOption[]>([]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const [users, teams] = await Promise.all([
                getProfilesByIds(props.userIDs),
                getTeamsByIds(props.teamIDs).then((list) => list.filter(Boolean)),
            ]);

            if (cancelled) {
                return;
            }

            const userOptions: UserOption[] = users.map((user: UserProfile) => ({
                value: user.id,
                label: user.username,
                avatar: getProfilePictureUrl(user.id, user.last_picture_update),
                isTeam: false as const,
            }));

            const teamOptions: TeamOption[] = teams.map((team) => ({
                value: team.id,
                label: team.name,
                displayName: team.display_name,
                icon: getTeamIconUrl(team.id, team.update_at),
                isTeam: true as const,
            }));

            setSelectedOptions([...userOptions, ...teamOptions]);
        })();

        return () => {
            cancelled = true;
        };
    }, [props.userIDs, props.teamIDs]);

    const loadOptions = async (inputValue: string): Promise<UserOrTeamOption[]> => {
        const [users, teams] = await Promise.all([
            getAutocompleteAllUsers(inputValue),
            searchTeams(inputValue),
        ]);

        const userOptions: UserOption[] = users.users.
            filter((user: UserProfile) => !user.is_bot).
            map((user: UserProfile) => ({
                value: user.id,
                label: user.username,
                avatar: getProfilePictureUrl(user.id, user.last_picture_update),
                isTeam: false as const,
            }));

        const teamOptions: TeamOption[] = teams.map((team) => ({
            value: team.id,
            label: team.name,
            displayName: team.display_name,
            icon: getTeamIconUrl(team.id, team.update_at),
            isTeam: true as const,
        }));

        return [...userOptions, ...teamOptions];
    };

    const formatOptionLabel = (option: UserOrTeamOption) => {
        if (option.isTeam) {
            return <TeamOptionLabel option={option}/>;
        }

        return (
            <div className='AcademySelectUser__label'>
                <img
                    className='AcademySelectUser__avatar'
                    src={option.avatar}
                    alt=''
                />
                {option.label}
            </div>
        );
    };

    const handleChange = (newValue: MultiValue<UserOrTeamOption>) => {
        const userIds: string[] = [];
        const teamIds: string[] = [];

        newValue.forEach((option) => {
            if (option.isTeam) {
                teamIds.push(option.value);
            } else {
                userIds.push(option.value);
            }
        });

        props.onChangeIDs(userIds, teamIds);
    };

    return (
        <div className='AcademySelectUser'>
            <AsyncSelect<UserOrTeamOption, true>
                isMulti={true}
                isClearable={false}
                isDisabled={props.disabled}
                value={selectedOptions}
                onChange={handleChange}
                loadOptions={loadOptions}
                formatOptionLabel={formatOptionLabel}
                placeholder='Search for people or teams'
                styles={selectStyles}
                defaultOptions={true}
                menuPortalTarget={typeof document === 'undefined' ? null : document.body}
                menuPosition='fixed'
            />
        </div>
    );
}
