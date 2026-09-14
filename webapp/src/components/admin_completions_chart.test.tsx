/**
 * @jest-environment jsdom
 */

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import AdminCompletionsChart from './admin_completions_chart';

import {act, render, waitFor} from '../../tests/render';

jest.mock('chart.js', () => {
    const Chart = Object.assign(
        jest.fn().mockImplementation(() => ({
            destroy: jest.fn(),
        })),
        {register: jest.fn()},
    );
    return {
        Chart,
        CategoryScale: {},
        Filler: {},
        Legend: {},
        LinearScale: {},
        LineController: {},
        LineElement: {},
        PointElement: {},
        Tooltip: {},
    };
});

describe('AdminCompletionsChart', () => {
    const originalFetch = global.fetch;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
        global.fetch = jest.fn().mockImplementation((url: string) => {
            const href = String(url);
            if (href.includes('completions-over-time')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        bucket: 'day',
                        to: 1,
                        points: [{start: 1, count: 2}],
                        guides: [],
                    }),
                });
            }
            if (href.includes('completions.csv')) {
                return Promise.resolve({
                    ok: true,
                    blob: async () => new Blob(['csv']),
                    headers: {get: () => 'attachment; filename="academy-completions.csv"'},
                });
            }
            return Promise.reject(new Error(`unexpected fetch ${href}`));
        });
        URL.createObjectURL = jest.fn(() => 'blob:mock');
        URL.revokeObjectURL = jest.fn();
        HTMLAnchorElement.prototype.click = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('loads the completions chart and exports CSV from the admin stats URLs', async () => {
        const view = await render(<AdminCompletionsChart/>);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        const chartURL = String((global.fetch as jest.Mock).mock.calls[0][0]);
        expect(chartURL).toContain('/plugins/com.mattermost.academy/api/v1/admin/stats/completions-over-time?');
        expect(chartURL).toContain('bucket=day');
        expect(chartURL).toMatch(/from=\d+/);
        expect(chartURL).toMatch(/to=\d+/);
        expect(chartURL).not.toContain('guides=');

        const exportButton = view.container.querySelector('.AcademyAdminCompletions__export') as HTMLButtonElement;
        expect(exportButton).not.toBeNull();

        await act(async () => {
            exportButton.click();
        });

        await waitFor(() => {
            expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(1);
        });

        const exportCall = (global.fetch as jest.Mock).mock.calls.find(([url]: [string]) => (
            String(url).includes('completions.csv')
        ));
        expect(exportCall).toBeDefined();
        const exportURL = String(exportCall[0]);
        expect(exportURL).toContain('/plugins/com.mattermost.academy/api/v1/admin/stats/completions.csv?');
        expect(exportURL).toMatch(/from=\d+/);
        expect(exportURL).toMatch(/to=\d+/);

        await view.unmount();
    });

    it('requests coarser buckets for longer duration presets', async () => {
        const view = await render(<AdminCompletionsChart/>);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        const pickDuration = async (label: string) => {
            const trigger = view.container.querySelector('[aria-label="Open menu to select duration"]') as HTMLElement;
            expect(trigger).not.toBeNull();
            await act(async () => {
                trigger.click();
            });
            const item = Array.from(view.container.querySelectorAll('[role="menuitem"]')).find((el) => (
                el.textContent?.includes(label)
            ));
            expect(item).toBeDefined();
            await act(async () => {
                (item as HTMLElement).click();
            });
        };

        const lastChartURL = () => {
            const calls = (global.fetch as jest.Mock).mock.calls as Array<[string]>;
            const chartCalls = calls.filter(([url]) => String(url).includes('completions-over-time'));
            return String(chartCalls[chartCalls.length - 1][0]);
        };

        expect(lastChartURL()).toContain('bucket=day');

        await pickDuration('Last 6 months');
        await waitFor(() => {
            expect(lastChartURL()).toContain('bucket=week');
        });

        await pickDuration('Last year');
        await waitFor(() => {
            expect(lastChartURL()).toContain('bucket=month');
        });

        await pickDuration('All time');
        await waitFor(() => {
            const url = lastChartURL();
            expect(url).toContain('bucket=auto');
            expect(url).not.toMatch(/[?&]from=/);
        });

        await view.unmount();
    });
});
