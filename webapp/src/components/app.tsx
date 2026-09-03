// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ACADEMY_BASE_PATH, getGuide, routes} from 'content';
import {useAcademyAccess} from 'hooks/use_academy_access';
import {useAvailableGuides} from 'hooks/use_available_guides';
import React from 'react';
import {BrowserRouter, Redirect, Route, Switch} from 'react-router-dom';

import CatalogPage from 'components/academy/catalog_page';
import CompletionPage from 'components/academy/completion_page';
import GuideLayout from 'components/academy/guide_layout';
import GuideRedirect from 'components/academy/guide_redirect';
import ModulePage from 'components/academy/module_page';
import AcademyAccessDenied from 'components/academy_access_denied';
import {LOADING_TEXTURE_URL} from 'components/icons';

import './app.scss';

function GuideRoutes() {
    return (
        <GuideLayout>
            <Switch>
                <Route
                    exact={true}
                    path='/guides/:guideId'
                    component={GuideRedirect}
                />
                <Route
                    exact={true}
                    path='/guides/:guideId/modules/:moduleId'
                    component={ModulePage}
                />
                <Route
                    exact={true}
                    path='/guides/:guideId/done'
                    component={CompletionPage}
                />
                <Redirect to={routes.catalog}/>
            </Switch>
        </GuideLayout>
    );
}

function GuideGate({
    children,
    availableGuideIDs,
    loading,
}: {
    children: React.ReactNode;
    availableGuideIDs: Set<string>;
    loading: boolean;
}) {
    return (
        <Route
            path='/guides/:guideId'
            render={({match}) => {
                const guideID = match.params.guideId;
                if (!getGuide(guideID)) {
                    return <Redirect to={routes.catalog}/>;
                }
                if (loading) {
                    return null;
                }

                // Covers admin-disabled guides and guides whose required
                // plugins are not running, so a direct URL cannot bypass
                // the catalog.
                if (!availableGuideIDs.has(guideID)) {
                    return <Redirect to={routes.catalog}/>;
                }
                return children;
            }}
        />
    );
}

// React 18 + @types/react-router-dom@5 omit `children` on router components.
const ProductRouter = BrowserRouter as unknown as React.ComponentType<{
    basename?: string;
    children?: React.ReactNode;
}>;

export default function App() {
    const access = useAcademyAccess();
    const {guides, loading: guidesLoading} = useAvailableGuides();
    const availableGuideIDs = React.useMemo(
        () => new Set(guides.map((guide) => guide.id)),
        [guides],
    );

    if (access === 'denied') {
        return (
            <div className='academy-app'>
                <AcademyAccessDenied/>
            </div>
        );
    }

    if (access === 'loading') {
        return <div className='academy-app'/>;
    }

    return (
        <div
            className='academy-app'
            style={{['--academy-loading-texture' as string]: `url(${LOADING_TEXTURE_URL})`}}
        >
            <ProductRouter basename={ACADEMY_BASE_PATH}>
                <Switch>
                    <Route
                        exact={true}
                        path='/'
                        component={CatalogPage}
                    />
                    <GuideGate
                        availableGuideIDs={availableGuideIDs}
                        loading={guidesLoading}
                    >
                        <GuideRoutes/>
                    </GuideGate>
                    <Redirect to={routes.catalog}/>
                </Switch>
            </ProductRouter>
        </div>
    );
}
