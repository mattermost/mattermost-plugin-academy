// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    boundsForInclusiveLocalDays,
    boundsForPreset,
    bucketForPreset,
    formatLocalDay,
    formatLocalMonthYear,
    formatPresetSublabel,
    localDayWindowForPreset,
} from './date_range';

describe('boundsForPreset', () => {
    const now = new Date(2026, 6, 20, 15, 30, 0); // Jul 20, 2026 local

    it('resolves last 30 days', () => {
        const bounds = boundsForPreset('last_30_days', now);
        expect(bounds.to).toBe(Math.floor(now.getTime() / 1000));
        expect(bounds.from).toBe(Math.floor(new Date(2026, 5, 20).getTime() / 1000));
    });

    it('resolves previous month as the prior calendar month', () => {
        expect(boundsForPreset('previous_month', now)).toEqual({
            from: Math.floor(new Date(2026, 5, 1).getTime() / 1000),
            to: Math.floor(new Date(2026, 6, 1).getTime() / 1000),
        });
    });

    it('resolves last 6 months', () => {
        const bounds = boundsForPreset('last_6_months', now);
        expect(bounds.to).toBe(Math.floor(now.getTime() / 1000));
        expect(bounds.from).toBe(Math.floor(new Date(2026, 0, 20).getTime() / 1000));
    });

    it('resolves last year', () => {
        const bounds = boundsForPreset('last_year', now);
        expect(bounds.to).toBe(Math.floor(now.getTime() / 1000));
        expect(bounds.from).toBe(Math.floor(new Date(2025, 6, 20).getTime() / 1000));
    });

    it('resolves all time without a from bound', () => {
        expect(boundsForPreset('all_time', now)).toEqual({
            to: Math.floor(now.getTime() / 1000),
        });
    });
});

describe('localDayWindowForPreset', () => {
    const now = new Date(2026, 6, 20);

    it('returns null for all time', () => {
        expect(localDayWindowForPreset('all_time', now)).toBeNull();
    });

    it('matches Users page windows and formats', () => {
        const thirty = localDayWindowForPreset('last_30_days', now)!;
        expect(formatPresetSublabel(thirty)).toBe(
            `${formatLocalDay(new Date(2026, 5, 20))} - ${formatLocalDay(new Date(2026, 6, 20))}`,
        );

        const prev = localDayWindowForPreset('previous_month', now)!;
        expect(formatPresetSublabel(prev)).toBe(
            `${formatLocalDay(new Date(2026, 5, 1))} - ${formatLocalDay(new Date(2026, 5, 30))}`,
        );

        const six = localDayWindowForPreset('last_6_months', now)!;
        expect(formatPresetSublabel(six)).toBe(
            `${formatLocalMonthYear(new Date(2026, 0, 20))} - ${formatLocalDay(new Date(2026, 6, 20))}`,
        );

        const year = localDayWindowForPreset('last_year', now)!;
        expect(formatPresetSublabel(year)).toBe(
            `${formatLocalMonthYear(new Date(2025, 6, 20))} - ${formatLocalDay(new Date(2026, 6, 20))}`,
        );
    });
});

describe('bucketForPreset', () => {
    it('scales with duration so long ranges stay readable', () => {
        expect(bucketForPreset('last_30_days')).toBe('day');
        expect(bucketForPreset('previous_month')).toBe('day');
        expect(bucketForPreset('last_6_months')).toBe('week');
        expect(bucketForPreset('last_year')).toBe('month');
        expect(bucketForPreset('all_time')).toBe('auto');
    });
});

describe('boundsForInclusiveLocalDays', () => {
    it('uses inclusive calendar days with exclusive end bound', () => {
        const start = new Date(2026, 6, 1, 15, 30);
        const end = new Date(2026, 6, 7, 9, 0);
        const bounds = boundsForInclusiveLocalDays(start, end);

        expect(bounds).toEqual({
            from: Math.floor(new Date(2026, 6, 1).getTime() / 1000),
            to: Math.floor(new Date(2026, 6, 8).getTime() / 1000),
        });
    });
});
