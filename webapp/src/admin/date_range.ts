// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Flexible date-range helpers for admin stats.
 *
 * The API accepts absolute unix `from` / `to` bounds. UI presets (and a future
 * date picker) all resolve into this shape so the backend stays stable.
 *
 * Presets mirror System Console → Users Duration options, plus Last year.
 */

export type DateRangeBounds = {

    /** Inclusive lower bound (unix seconds). Omit for all-time start. */
    from?: number;

    /** Exclusive upper bound (unix seconds). Omit to mean "now" on the server. */
    to?: number;
};

export type DateRangePresetId =
    | 'all_time'
    | 'last_30_days'
    | 'previous_month'
    | 'last_6_months'
    | 'last_year';

export type DateRangePreset = {
    id: DateRangePresetId;
    label: string;
};

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
    {id: 'all_time', label: 'All time'},
    {id: 'last_30_days', label: 'Last 30 days'},
    {id: 'previous_month', label: 'Previous month'},
    {id: 'last_6_months', label: 'Last 6 months'},
    {id: 'last_year', label: 'Last year'},
];

export type DayWindow = {
    start: Date;
    end: Date;

    /** When true, format start as month/year only (Users page Last 6 months style). */
    startMonthYearOnly?: boolean;
};

function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toUnix(d: Date): number {
    return Math.floor(d.getTime() / 1000);
}

function get30DaysBack(now: Date): Date {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 30);
    return startOfLocalDay(prev);
}

function get6MonthsBack(now: Date): Date {
    const prev = new Date(now);
    prev.setMonth(prev.getMonth() - 6);
    return startOfLocalDay(prev);
}

function get1YearBack(now: Date): Date {
    const prev = new Date(now);
    prev.setFullYear(prev.getFullYear() - 1);
    return startOfLocalDay(prev);
}

function getBeginningOfLastMonth(now: Date): Date {
    const beginning = new Date(now);
    beginning.setMonth(beginning.getMonth() - 1);
    beginning.setDate(1);
    return startOfLocalDay(beginning);
}

function getEndOfLastMonth(now: Date): Date {
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return startOfLocalDay(end);
}

function getStartOfCurrentMonth(now: Date): Date {
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Resolve a named preset into API bounds.
 * Pass `now` for tests; defaults to current time.
 */
export function boundsForPreset(
    preset: DateRangePresetId,
    now: Date = new Date(),
): DateRangeBounds {
    const nowSeconds = Math.floor(now.getTime() / 1000);

    switch (preset) {
    case 'last_30_days':
        return {from: toUnix(get30DaysBack(now)), to: nowSeconds};
    case 'previous_month':
        return {
            from: toUnix(getBeginningOfLastMonth(now)),
            to: toUnix(getStartOfCurrentMonth(now)),
        };
    case 'last_6_months':
        return {from: toUnix(get6MonthsBack(now)), to: nowSeconds};
    case 'last_year':
        return {from: toUnix(get1YearBack(now)), to: nowSeconds};
    case 'all_time':
    default:
        return {to: nowSeconds};
    }
}

/** Inclusive calendar-day window for a preset (for Duration-style sublabels). */
export function localDayWindowForPreset(
    preset: DateRangePresetId,
    now: Date = new Date(),
): DayWindow | null {
    const end = startOfLocalDay(now);
    switch (preset) {
    case 'last_30_days':
        return {start: get30DaysBack(now), end};
    case 'previous_month':
        return {start: getBeginningOfLastMonth(now), end: getEndOfLastMonth(now)};
    case 'last_6_months':
        return {start: get6MonthsBack(now), end, startMonthYearOnly: true};
    case 'last_year':
        return {start: get1YearBack(now), end, startMonthYearOnly: true};
    case 'all_time':
    default:
        return null;
    }
}

export function formatLocalDay(d: Date): string {
    return d.toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
    });
}

export function formatLocalMonthYear(d: Date): string {
    return d.toLocaleDateString(undefined, {
        month: 'numeric',
        year: 'numeric',
    });
}

export function formatPresetSublabel(window: DayWindow): string {
    const start = window.startMonthYearOnly ? formatLocalMonthYear(window.start) : formatLocalDay(window.start);
    const end = formatLocalDay(window.end);
    return `${start} - ${end}`;
}

/**
 * Build bounds for a future custom date selector (inclusive calendar days in local time).
 * startDay / endDay are Date objects at any time of day; we normalize to local midnights.
 */
export function boundsForInclusiveLocalDays(startDay: Date, endDay: Date): DateRangeBounds {
    const from = startOfLocalDay(startDay);
    const toExclusive = startOfLocalDay(endDay);
    toExclusive.setDate(toExclusive.getDate() + 1);
    return {
        from: toUnix(from),
        to: toUnix(toExclusive),
    };
}

export function appendRangeQuery(
    params: URLSearchParams,
    bounds: DateRangeBounds,
): void {
    if (bounds.from != null) {
        params.set('from', String(bounds.from));
    }
    if (bounds.to != null) {
        params.set('to', String(bounds.to));
    }
}

export function labelForPreset(preset: DateRangePresetId): string {
    return DATE_RANGE_PRESETS.find((p) => p.id === preset)?.label ?? 'All time';
}
