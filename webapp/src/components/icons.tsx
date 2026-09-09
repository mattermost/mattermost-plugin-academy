// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import manifest from 'manifest';
import React from 'react';

import AccountMultipleOutlineIcon from '@mattermost/compass-icons/components/account-multiple-outline';
import AccountOutlineIcon from '@mattermost/compass-icons/components/account-outline';
import AiSummarizeIcon from '@mattermost/compass-icons/components/ai-summarize';
import AlertOutlineIcon from '@mattermost/compass-icons/components/alert-outline';
import ArrowLeftIcon from '@mattermost/compass-icons/components/arrow-left';
import AtIcon from '@mattermost/compass-icons/components/at';
import BellOutlineIcon from '@mattermost/compass-icons/components/bell-outline';
import BookOutlineIcon from '@mattermost/compass-icons/components/book-outline';
import BookmarkOutlineIcon from '@mattermost/compass-icons/components/bookmark-outline';
import CalendarOutlineIcon from '@mattermost/compass-icons/components/calendar-outline';
import CellphoneIcon from '@mattermost/compass-icons/components/cellphone';
import ChartLineIcon from '@mattermost/compass-icons/components/chart-line';
import CheckIcon from '@mattermost/compass-icons/components/check';
import CheckCircleIcon from '@mattermost/compass-icons/components/check-circle';
import CheckCircleOutlineIcon from '@mattermost/compass-icons/components/check-circle-outline';
import ChevronRightIcon from '@mattermost/compass-icons/components/chevron-right';
import ClockOutlineIcon from '@mattermost/compass-icons/components/clock-outline';
import ClockSendOutlineIcon from '@mattermost/compass-icons/components/clock-send-outline';
import CodeTagsIcon from '@mattermost/compass-icons/components/code-tags';
import CogOutlineIcon from '@mattermost/compass-icons/components/cog-outline';
import ConsoleIcon from '@mattermost/compass-icons/components/console';
import ContentCopyIcon from '@mattermost/compass-icons/components/content-copy';
import CreationOutlineIcon from '@mattermost/compass-icons/components/creation-outline';
import DownloadOutlineIcon from '@mattermost/compass-icons/components/download-outline';
import DrawIcon from '@mattermost/compass-icons/components/draw';
import FilterVariantIcon from '@mattermost/compass-icons/components/filter-variant';
import FlagOutlineIcon from '@mattermost/compass-icons/components/flag-outline';
import FolderOutlineIcon from '@mattermost/compass-icons/components/folder-outline';
import FormatListBulletedIcon from '@mattermost/compass-icons/components/format-list-bulleted';
import GlobeIcon from '@mattermost/compass-icons/components/globe';
import KeyVariantIcon from '@mattermost/compass-icons/components/key-variant';
import LightningBoltOutlineIcon from '@mattermost/compass-icons/components/lightning-bolt-outline';
import LinkVariantIcon from '@mattermost/compass-icons/components/link-variant';
import LockOutlineIcon from '@mattermost/compass-icons/components/lock-outline';
import MagnifyIcon from '@mattermost/compass-icons/components/magnify';
import MessageTextOutlineIcon from '@mattermost/compass-icons/components/message-text-outline';
import OpenInNewIcon from '@mattermost/compass-icons/components/open-in-new';
import PinOutlineIcon from '@mattermost/compass-icons/components/pin-outline';
import PlaylistCheckIcon from '@mattermost/compass-icons/components/playlist-check';
import ProductBoardsIcon from '@mattermost/compass-icons/components/product-boards';
import ProductPlaybooksIcon from '@mattermost/compass-icons/components/product-playbooks';
import RefreshIcon from '@mattermost/compass-icons/components/refresh';
import RobotHappyIcon from '@mattermost/compass-icons/components/robot-happy';
import SearchListIcon from '@mattermost/compass-icons/components/search-list';
import ServerVariantIcon from '@mattermost/compass-icons/components/server-variant';
import ShieldOutlineIcon from '@mattermost/compass-icons/components/shield-outline';
import StarIcon from '@mattermost/compass-icons/components/star';
import StarOutlineIcon from '@mattermost/compass-icons/components/star-outline';
import SyncIcon from '@mattermost/compass-icons/components/sync';
import TableLargeIcon from '@mattermost/compass-icons/components/table-large';
import TextBoxOutlineIcon from '@mattermost/compass-icons/components/text-box-outline';
import TuneIcon from '@mattermost/compass-icons/components/tune';
import UpdateIcon from '@mattermost/compass-icons/components/update';
import VideoOutlineIcon from '@mattermost/compass-icons/components/video-outline';

type IconComponent = React.ComponentType<{
    size?: number | string;
    color?: string;
    className?: string;
}>;

type IconProps = {
    name: string;
    className?: string;
    size?: number;
};

/** Maps guide/UI icon keys to Compass Icons components. */
const ICONS: Record<string, IconComponent> = {
    'robot-happy': RobotHappyIcon,
    'ai-summarize': AiSummarizeIcon,
    'message-text-outline': MessageTextOutlineIcon,
    'video-outline': VideoOutlineIcon,
    'search-list': SearchListIcon,
    draw: DrawIcon,
    tune: TuneIcon,
    console: ConsoleIcon,
    'creation-outline': CreationOutlineIcon,
    'format-list-bulleted': FormatListBulletedIcon,
    'clock-outline': ClockOutlineIcon,
    'clock-send-outline': ClockSendOutlineIcon,
    'playlist-check': PlaylistCheckIcon,
    'product-boards': ProductBoardsIcon,
    'product-playbooks': ProductPlaybooksIcon,
    'lightning-bolt-outline': LightningBoltOutlineIcon,
    'arrow-left': ArrowLeftIcon,
    refresh: RefreshIcon,
    'open-in-new': OpenInNewIcon,
    'content-copy': ContentCopyIcon,
    'check-circle-outline': CheckCircleOutlineIcon,
    'check-circle': CheckCircleIcon,
    check: CheckIcon,
    'book-outline': BookOutlineIcon,
    'chevron-right': ChevronRightIcon,
    'account-multiple-outline': AccountMultipleOutlineIcon,
    'account-outline': AccountOutlineIcon,
    'alert-outline': AlertOutlineIcon,
    at: AtIcon,
    'bell-outline': BellOutlineIcon,
    'bookmark-outline': BookmarkOutlineIcon,
    'calendar-outline': CalendarOutlineIcon,
    cellphone: CellphoneIcon,
    'chart-line': ChartLineIcon,
    'code-tags': CodeTagsIcon,
    'cog-outline': CogOutlineIcon,
    'download-outline': DownloadOutlineIcon,
    'filter-variant': FilterVariantIcon,
    'flag-outline': FlagOutlineIcon,
    'folder-outline': FolderOutlineIcon,
    globe: GlobeIcon,
    'key-variant': KeyVariantIcon,
    'link-variant': LinkVariantIcon,
    'lock-outline': LockOutlineIcon,
    magnify: MagnifyIcon,
    'pin-outline': PinOutlineIcon,
    'server-variant': ServerVariantIcon,
    'shield-outline': ShieldOutlineIcon,
    star: StarIcon,
    'star-outline': StarOutlineIcon,
    sync: SyncIcon,
    'table-large': TableLargeIcon,
    'text-box-outline': TextBoxOutlineIcon,
    update: UpdateIcon,
};

/** Names AcademyIcon can resolve. Anything else silently renders as a book. */
export const ICON_NAMES = Object.keys(ICONS);

export function AcademyIcon({name, className, size = 20}: IconProps) {
    const Icon = ICONS[name] || BookOutlineIcon;
    return (
        <Icon
            className={className}
            size={size}
            aria-hidden={true}
        />
    );
}

/** Product switcher icon — Academy graduation cap. */
export function AcademyProductIcon({size = 24, className}: {size?: number; className?: string} = {}) {
    const classes = className ? `academy-product-icon ${className}` : 'academy-product-icon';

    return (
        <svg
            className={classes}
            width={size}
            height={size}
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
            aria-hidden={true}
            focusable='false'
        >
            <path
                d='M18 16.0001C18 18.0001 15.5 20.0001 12 20.0001C8.50003 20.0001 6.00003 18 6 16.0001V12.6172L11.3291 15.2823C11.7514 15.4934 12.2486 15.4934 12.6709 15.2823L18 12.6172V16.0001ZM11.7764 4.61139C11.917 4.54109 12.0829 4.54113 12.2236 4.61139L21.1055 9.0528C21.474 9.23706 21.474 9.76306 21.1055 9.94733L20.4453 10.2764C20.4793 10.3439 20.5 10.4194 20.5 10.5001V14.1348C20.7987 14.3078 21 14.6301 21 15.0001V16.2501C21 16.6643 20.6642 17.0001 20.25 17.0001H19.75C19.3358 17 19 16.6643 19 16.2501V15.0001C19 14.6301 19.2014 14.3078 19.5 14.1348V10.7491L18 11.4991L12.2236 14.3887L12.1143 14.4278C12.0809 14.4356 12.0468 14.4386 12.0127 14.4395C12.0006 14.4398 11.9886 14.4391 11.9766 14.4385C11.9516 14.4374 11.927 14.4346 11.9023 14.4297C11.8942 14.4281 11.886 14.4269 11.8779 14.4249C11.8433 14.4162 11.809 14.405 11.7764 14.3887L6 11.5001V11.4991L2.89453 9.94733C2.52601 9.76306 2.52601 9.23706 2.89453 9.0528L11.7764 4.61139Z'
                fill='currentColor'
            />
        </svg>
    );
}

export const ACADEMY_ICON_URL = `/plugins/${manifest.id}/public/academy-icon.png`;

/** Mattermost initial-loading-screen chevron texture (used as a CSS mask). */
export const LOADING_TEXTURE_URL = `/plugins/${manifest.id}/public/loading-texture.svg`;
