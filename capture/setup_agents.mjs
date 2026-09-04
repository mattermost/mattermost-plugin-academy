// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * One-time setup of the Agents plugin on a local dev server, pointed at the mock LLM.
 *
 *   MM_ADMIN_TOKEN=... node setup_agents.mjs
 *
 * Why this is a script and not a config write: Agents 2.7.0 keeps its service configuration in
 * the plugin's own store, not in `PluginSettings.Plugins["mattermost-ai"]`. Writing that key
 * through the Mattermost config API is silently ignored — the System Console still reports "No
 * AI services added yet" — so the only way in is the console UI. Agents themselves moved even
 * further out: "AI bot configuration has moved: create and manage AI agents from the Agents
 * page", so the bot is created through the product, and no amount of config will conjure one.
 *
 * Two non-obvious things about that form, both of which cost time to find:
 *   - "Add an AI Service" appends a *collapsed* row. Clicking the service-name text expands it;
 *     the fields do not exist in the DOM until it is open.
 *   - The API URL field only appears once the service type is `openaicompatible`.
 *
 * Idempotent: re-running finds the existing service by name and leaves it alone.
 */

import process from 'node:process';

import {chromium} from 'playwright';

import {startMockLLM, MOCK_MODEL, MOCK_PORT} from './fixture_ai.js';
import {MM} from './mm.js';

const SITE = process.env.MM_SERVICESETTINGS_SITEURL || 'http://localhost:8065';
const TOKEN = process.env.MM_ADMIN_TOKEN;
const SERVICE_NAME = 'Academy capture stub';
const AGENT_NAME = 'academy-agent';
const AGENT_DISPLAY = 'Academy Agent';

function fail(message) {
    console.error(`\n✗ ${message}\n`);
    process.exit(1);
}

async function main() {
    if (!TOKEN) {
        fail('MM_ADMIN_TOKEN is required (a system-admin personal access token).');
    }

    const host = new URL(SITE).hostname;
    if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
        fail(`Refusing to configure ${host}. This changes plugin settings, so it is local only.`);
    }

    const mm = new MM(SITE);
    await mm.useToken(TOKEN);
    if (!mm.me.roles?.includes('system_admin')) {
        fail(`@${mm.me.username} is not a system admin.`);
    }

    if (!(await mm.activePlugins()).includes('mattermost-ai')) {
        fail('The Agents plugin (mattermost-ai) is not active. Install and enable it first.');
    }

    // The plugin talks to this while the form is saved and while captures run.
    const mock = await startMockLLM();
    console.log(`\nMock LLM listening on ${mock.url}`);

    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.addCookies([
        {name: 'MMAUTHTOKEN', value: mm.token, domain: host, path: '/', httpOnly: true, sameSite: 'Lax'},
        {name: 'MMUSERID', value: mm.me.id, domain: host, path: '/', sameSite: 'Lax'},
    ]);
    await context.addInitScript(([siteURL]) => {
        try {
            window.localStorage.setItem('__landingPageSeen__', 'true');
            window.localStorage.setItem(`__landing-preference__${siteURL}`, 'browser');
        } catch {
            // Only a slowdown.
        }
    }, [SITE]);

    const page = await context.newPage();

    try {
        await configureService(page);
        await createAgent(page, mm);
    } finally {
        await browser.close();
        await mock.close();
    }

    const bots = await mm.req('GET', '/bots?per_page=100');
    const bot = bots.find((b) => b.username === AGENT_NAME);
    console.log(bot ?
        `\n✓ Agent bot @${bot.username} exists. Start the mock LLM before capturing AI shots.` :
        '\n✗ No agent bot was created — open the Agents page and add one by hand.');
}

async function configureService(page) {
    await page.goto(`${SITE}/admin_console/plugins/plugin_mattermost-ai`, {waitUntil: 'domcontentloaded'});

    const addButton = page.getByRole('button', {name: /Add an AI Service/i});
    await addButton.waitFor({state: 'visible', timeout: 60000});

    if (await page.getByText(SERVICE_NAME, {exact: true}).count()) {
        console.log(`  service "${SERVICE_NAME}" already configured`);
        return;
    }

    await addButton.click();
    await page.waitForTimeout(2500);

    // Expand the row that was just appended. Clicking its name is what opens it.
    await page.getByText('OpenAI Service', {exact: true}).last().click();

    const typeSelect = page.locator('select').filter({has: page.locator('option[value="openaicompatible"]')}).first();
    await typeSelect.waitFor({state: 'visible', timeout: 30000});
    await typeSelect.selectOption('openaicompatible');

    // The API URL field only exists for this service type.
    await page.getByPlaceholder('API URL').waitFor({state: 'visible', timeout: 30000});

    const set = async (placeholder, value) => {
        const field = page.getByPlaceholder(placeholder).first();
        if (await field.count()) {
            await field.fill(String(value));
        }
    };
    await set('Service name', SERVICE_NAME);
    await set('API URL', `http://127.0.0.1:${MOCK_PORT}/v1`);
    await set('API Key', 'academy-capture');
    await set('Default model', MOCK_MODEL);
    await set('Input token limit', 8000);
    await set('Streaming Timeout Seconds', 30);

    await page.getByRole('button', {name: 'Save'}).first().click();
    await page.waitForTimeout(6000);
    console.log(`  service "${SERVICE_NAME}" saved`);
}

async function createAgent(page, mm) {
    const bots = await mm.req('GET', '/bots?per_page=100');
    if (bots.some((b) => b.username === AGENT_NAME)) {
        console.log(`  agent @${AGENT_NAME} already exists`);
        return;
    }

    // The Agents product page. This route is not guessable — `/<team>/agents` silently falls
    // back to a channel — and "Open Agents" in the console only renders once a service exists,
    // which is why this runs after the save.
    await page.goto(`${SITE}/plug/mattermost-ai/agents`, {waitUntil: 'domcontentloaded'});

    const create = page.getByRole('button', {name: 'Create agent'});
    await create.waitFor({state: 'visible', timeout: 60000});
    await create.click();

    // The form's AI-service dropdown is pre-filled with the service saved above.
    await page.getByPlaceholder('Agent username').waitFor({state: 'visible', timeout: 30000});
    await page.getByPlaceholder('e.g. Sales Assistant').fill(AGENT_DISPLAY);
    await page.getByPlaceholder('Agent username').fill(AGENT_NAME);

    const instructions = page.getByPlaceholder('How would you like the agent to respond?');
    if (await instructions.count()) {
        await instructions.fill('Answer briefly and concretely, in full sentences.');
    }

    await page.getByRole('button', {name: 'Save'}).last().click();
    await page.waitForTimeout(8000);
    console.log(`  agent @${AGENT_NAME} submitted`);
}

main().catch((err) => fail(err.stack || err.message));
