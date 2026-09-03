// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    DEFAULT_USER_ACCESS_CONFIG,
    normalizeUserAccessConfig,
    UserAccessLevel,
    type UserAccessConfig,
} from 'admin/user_access';
import {GUIDE_LIST} from 'content';
import {pluginLabel} from 'content/plugins';
import type {Guide} from 'content/types';
import {useActivePluginIDs} from 'hooks/use_active_plugins';
import React, {useMemo} from 'react';

import EyeOffOutlineIcon from '@mattermost/compass-icons/components/eye-off-outline';

import type {PluginCustomSettingsComponentProps} from 'types/mattermost-webapp';

import SelectUser from './select_user';

import './admin_user_access_setting.scss';

type Props = PluginCustomSettingsComponentProps<UserAccessConfig | string | null | undefined>;

function forEditor(value: UserAccessConfig): UserAccessConfig {
    // Block/None are no longer offered; keep any saved list under Allow.
    if (value.userAccessLevel === UserAccessLevel.Block || value.userAccessLevel === UserAccessLevel.None) {
        return {...value, userAccessLevel: UserAccessLevel.Allow};
    }
    return value;
}

/**
 * Names the plugins a guide needs that are not currently running. Returns an
 * empty list while the active set is unknown, so a failed lookup does not
 * claim a guide is broken.
 */
function missingPlugins(guide: Guide, activePluginIDs: string[] | null): string[] {
    if (!guide.requiresPlugins || activePluginIDs === null) {
        return [];
    }
    return guide.requiresPlugins.filter((id) => !activePluginIDs.includes(id));
}

function missingPluginsMessage(pluginIDs: string[]): string {
    const names = pluginIDs.map(pluginLabel);
    if (names.length === 1) {
        return `Hidden: Needs ${names[0]} plugin enabled.`;
    }
    const last = names[names.length - 1];
    return `Hidden: Needs ${names.slice(0, -1).join(', ')} and ${last} plugins enabled.`;
}

export default function AdminUserAccessSetting(props: Props) {
    const {activePluginIDs} = useActivePluginIDs();
    const value = useMemo(
        () => forEditor(normalizeUserAccessConfig(props.value ?? DEFAULT_USER_ACCESS_CONFIG)),
        [props.value],
    );

    const update = (next: UserAccessConfig) => {
        props.onChange(props.id, next);
        props.setSaveNeeded();
    };

    const setGuideEnabled = (guideID: string, enabled: boolean) => {
        const disabled = new Set(value.disabledGuideIDs);
        if (enabled) {
            disabled.delete(guideID);
        } else {
            disabled.add(guideID);
        }
        update({...value, disabledGuideIDs: Array.from(disabled).sort()});
    };

    const endUserGuides = GUIDE_LIST.filter((guide) => guide.audiences.includes('end-user'));
    const adminGuides = GUIDE_LIST.filter((guide) => guide.audiences.includes('admin'));

    const renderGuideList = (guides: Guide[], listId: string) => (
        <div className='AcademyUserAccessSetting__guides'>
            {guides.map((guide) => {
                const enabled = !value.disabledGuideIDs.includes(guide.id);
                const inputId = `${props.id}-guide-${listId}-${guide.id}`;
                const missing = missingPlugins(guide, activePluginIDs);
                const hidden = missing.length > 0;
                return (
                    <React.Fragment key={guide.id}>
                        <input
                            type='checkbox'
                            id={inputId}
                            checked={enabled}
                            disabled={props.disabled || hidden}
                            onChange={(e) => setGuideEnabled(guide.id, e.target.checked)}
                        />
                        <label htmlFor={inputId}>
                            {guide.title}
                            <span className='AcademyUserAccessSetting__guideSummary'>
                                {guide.description}
                            </span>
                            {hidden && (
                                <span className='AcademyUserAccessSetting__requires'>
                                    <EyeOffOutlineIcon
                                        size={14}
                                        color='currentColor'
                                        aria-hidden={true}
                                    />
                                    {`${missingPluginsMessage(missing)} `}
                                    <a
                                        href='/admin_console/plugins/plugin_management'
                                        rel='noreferrer'
                                    >
                                        {'Manage plugins'}
                                    </a>
                                </span>
                            )}
                        </label>
                    </React.Fragment>
                );
            })}
        </div>
    );

    return (
        <div className='AcademyUserAccessSetting'>
            <div className='AcademyUserAccessSetting__label'>{'Users'}</div>
            <div className='AcademyUserAccessSetting__control'>
                <div className='AcademyUserAccessSetting__radios'>
                    <input
                        type='radio'
                        id={`${props.id}-all`}
                        name={`${props.id}-level`}
                        checked={value.userAccessLevel === UserAccessLevel.All}
                        disabled={props.disabled}
                        onChange={() => update({...value, userAccessLevel: UserAccessLevel.All})}
                    />
                    <label htmlFor={`${props.id}-all`}>{'Allow for all users'}</label>
                    <input
                        type='radio'
                        id={`${props.id}-allow`}
                        name={`${props.id}-level`}
                        checked={value.userAccessLevel === UserAccessLevel.Allow}
                        disabled={props.disabled}
                        onChange={() => update({...value, userAccessLevel: UserAccessLevel.Allow})}
                    />
                    <label htmlFor={`${props.id}-allow`}>{'Allow for selected users'}</label>
                </div>
                <div className='AcademyUserAccessSetting__help'>
                    {'Select who can open Academy and complete guides. Users who are not allowed will not see Academy in the product interface.'}
                </div>
                {value.userAccessLevel === UserAccessLevel.Allow && (
                    <div className='AcademyUserAccessSetting__list'>
                        <div className='AcademyUserAccessSetting__listLabel'>{'Allow list'}</div>
                        <SelectUser
                            userIDs={value.userIDs}
                            teamIDs={value.teamIDs}
                            disabled={props.disabled}
                            onChangeIDs={(userIDs, teamIDs) => update({...value, userIDs, teamIDs})}
                        />
                        <div className='AcademyUserAccessSetting__help'>
                            {'Enter users to allow for Academy'}
                        </div>
                    </div>
                )}
            </div>

            <div className='AcademyUserAccessSetting__label'>{'End-user Guides'}</div>
            <div className='AcademyUserAccessSetting__control'>
                {renderGuideList(endUserGuides, 'end-user')}
                <div className='AcademyUserAccessSetting__help'>
                    {'Choose which end-user guides are available in Academy.'}
                </div>
            </div>

            <div className='AcademyUserAccessSetting__label'>{'Admin Guides'}</div>
            <div className='AcademyUserAccessSetting__control'>
                {renderGuideList(adminGuides, 'admin')}
                <div className='AcademyUserAccessSetting__help'>
                    {'Choose which admin guides are available in Academy. Admin guides are hidden from end-users unless Test Mode is enabled.'}
                </div>
            </div>

            <div className='AcademyUserAccessSetting__label'>{'Test Mode'}</div>
            <div className='AcademyUserAccessSetting__control'>
                <div className='AcademyUserAccessSetting__bool'>
                    <label htmlFor={`${props.id}-test-mode-true`}>
                        <input
                            type='radio'
                            id={`${props.id}-test-mode-true`}
                            name={`${props.id}-test-mode`}
                            checked={value.testMode}
                            disabled={props.disabled}
                            onChange={() => update({...value, testMode: true})}
                        />
                        {'True'}
                    </label>
                    <label htmlFor={`${props.id}-test-mode-false`}>
                        <input
                            type='radio'
                            id={`${props.id}-test-mode-false`}
                            name={`${props.id}-test-mode`}
                            checked={!value.testMode}
                            disabled={props.disabled}
                            onChange={() => update({...value, testMode: false})}
                        />
                        {'False'}
                    </label>
                </div>
                <div className='AcademyUserAccessSetting__help'>
                    {'When enabled, Academy shows admin guides to everyone and does not hide guides whose required plugins are not running. Turn this off in production.'}
                </div>
            </div>
        </div>
    );
}
