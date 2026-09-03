// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

/** Host-provided at runtime; Jest has no Mattermost webapp bundle. */
export function BrowserRouter({children}: {children?: React.ReactNode}) {
    return <>{children}</>;
}

export function Switch({children}: {children?: React.ReactNode}) {
    const list = React.Children.toArray(children);
    return <>{list[0] || null}</>;
}

export function Route({
    component: Component,
    render,
    children,
}: {
    component?: React.ComponentType;
    render?: (props: {match: {params: Record<string, string>}}) => React.ReactNode;
    children?: React.ReactNode;
}) {
    if (Component) {
        return <Component/>;
    }
    if (render) {
        return <>{render({match: {params: {}}})}</>;
    }
    return <>{children || null}</>;
}

export function Redirect() {
    return null;
}

export function Link({children}: {children?: React.ReactNode}) {
    return <a>{children}</a>;
}

export function NavLink({children}: {children?: React.ReactNode}) {
    return <a>{children}</a>;
}

export function useHistory() {
    return {push: jest.fn(), replace: jest.fn()};
}

export function useParams() {
    return {};
}

export function useLocation() {
    return {pathname: '/academy'};
}

export function useRouteMatch() {
    return {url: '/academy', path: '/', params: {}};
}
