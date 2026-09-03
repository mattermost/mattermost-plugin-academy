// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineConfig} from 'cypress';

export default defineConfig({
    chromeWebSecurity: false,
    defaultCommandTimeout: 20000,
    downloadsFolder: 'tests/downloads',
    fixturesFolder: false,
    numTestsKeptInMemory: 0,
    screenshotsFolder: 'tests/screenshots',
    video: false,
    viewportWidth: 1300,
    env: {
        adminEmail: 'sysadmin@sample.mattermost.com',
        adminUsername: process.env.MM_ADMIN_USERNAME || 'sysadmin',
        adminPassword: process.env.MM_ADMIN_PASSWORD || 'Sys@dmin-sample1',
    },
    e2e: {
        baseUrl: process.env.MM_SERVICESETTINGS_SITEURL || 'http://localhost:8065',
        excludeSpecPattern: '**/node_modules/**/*',
        specPattern: 'tests/integration/**/*_spec.{js,ts}',
        supportFile: 'tests/support/e2e.ts',
        testIsolation: false,
    },
    retries: {
        openMode: 0,
        runMode: 2,
    },
});
