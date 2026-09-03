// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    appendRangeQuery,
    boundsForPreset,
    DATE_RANGE_PRESETS,
    formatPresetSublabel,
    labelForPreset,
    localDayWindowForPreset,
    type DateRangePresetId,
} from 'admin/date_range';
import {
    CategoryScale,
    Chart,
    Filler,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';
import {GUIDES} from 'guides';
import manifest from 'manifest';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import OutlinedFilterMenu from './outlined_filter_menu';

import './admin_completions_chart.scss';

Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler,
);

function themeColor(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function themeRgba(rgbVar: string, alpha: number) {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue(rgbVar).trim();
    return rgb ? `rgba(${rgb}, ${alpha})` : undefined;
}

type TimeBucket = {
    start: number;
    count: number;
};

type CompletionsOverTimeResponse = {
    from?: number;
    to: number;
    bucket: string;
    guides: string[];
    points: TimeBucket[];
};

type Props = {
    disabled?: boolean;
};

const ALL_GUIDE_IDS = Object.keys(GUIDES);

function formatBucketLabel(unixSeconds: number, bucket: string): string {
    const d = new Date(unixSeconds * 1000);
    if (bucket === 'month') {
        return d.toLocaleDateString(undefined, {year: 'numeric', month: 'short'});
    }
    return d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

async function fetchCompletionsOverTime(
    guideIds: string[],
    preset: DateRangePresetId,
): Promise<CompletionsOverTimeResponse> {
    const params = new URLSearchParams();
    if (guideIds.length > 0 && guideIds.length < ALL_GUIDE_IDS.length) {
        params.set('guides', guideIds.join(','));
    }
    params.set('bucket', 'day');
    appendRangeQuery(params, boundsForPreset(preset));

    const res = await fetch(
        `/plugins/${manifest.id}/api/v1/admin/stats/completions-over-time?${params.toString()}`,
        {
            credentials: 'same-origin',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
        },
    );
    if (!res.ok) {
        throw new Error(`failed to load completions (${res.status})`);
    }
    return res.json();
}

function buildExportParams(guideIds: string[], preset: DateRangePresetId): URLSearchParams {
    const params = new URLSearchParams();
    if (guideIds.length > 0 && guideIds.length < ALL_GUIDE_IDS.length) {
        params.set('guides', guideIds.join(','));
    }
    appendRangeQuery(params, boundsForPreset(preset));
    return params;
}

async function downloadCompletionsCSV(guideIds: string[], preset: DateRangePresetId): Promise<void> {
    const params = buildExportParams(guideIds, preset);
    const res = await fetch(
        `/plugins/${manifest.id}/api/v1/admin/stats/completions.csv?${params.toString()}`,
        {
            credentials: 'same-origin',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
        },
    );
    if (!res.ok) {
        throw new Error(`failed to export completions (${res.status})`);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = (/filename="?([^";]+)"?/i).exec(disposition);
    const filename = match?.[1] || `academy-completions-${new Date().toISOString().slice(0, 10)}.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/**
 * System Console custom setting: completions-over-time chart with Users-page
 * style Guides + Duration filter menus.
 */
export default function AdminCompletionsChart(props: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    const [selectedGuides, setSelectedGuides] = useState<string[]>(ALL_GUIDE_IDS);
    const [preset, setPreset] = useState<DateRangePresetId>('last_30_days');
    const [points, setPoints] = useState<TimeBucket[]>([]);
    const [bucket, setBucket] = useState('day');
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const guideOptions = useMemo(
        () => ALL_GUIDE_IDS.map((id) => ({id, title: GUIDES[id].title})),
        [],
    );

    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (selectedGuides.length === 0) {
                setPoints([]);
                setError(null);
                return;
            }

            setError(null);
            try {
                const data = await fetchCompletionsOverTime(selectedGuides, preset);
                if (cancelled) {
                    return;
                }
                setPoints(Array.isArray(data.points) ? data.points : []);
                setBucket(data.bucket || 'day');
            } catch (err) {
                if (cancelled) {
                    return;
                }
                setPoints([]);
                setError(err instanceof Error ? err.message : 'failed to load');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedGuides, preset]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return undefined;
        }

        const labels = points.map((p) => formatBucketLabel(p.start, bucket));
        const values = points.map((p) => p.count);

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const buttonColor = themeRgba('--button-bg-rgb', 1);
        const buttonFill = themeRgba('--button-bg-rgb', 0.12);
        const pointBorder = themeColor('--center-channel-bg');

        chartRef.current = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Completions',
                    data: values,
                    fill: true,
                    tension: 0.25,
                    borderColor: buttonColor,
                    backgroundColor: buttonFill,
                    pointBackgroundColor: buttonColor,
                    pointBorderColor: pointBorder,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {display: false},
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const idx = items[0]?.dataIndex;
                                if (idx == null || !points[idx]) {
                                    return '';
                                }
                                return formatBucketLabel(points[idx].start, bucket);
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {display: false},
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {precision: 0},
                        title: {
                            display: true,
                            text: 'Completions',
                        },
                    },
                },
            },
        });

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [points, bucket]);

    const toggleGuide = (guideId: string) => {
        setSelectedGuides((prev) => {
            if (prev.includes(guideId)) {
                return prev.filter((id) => id !== guideId);
            }
            return [...prev, guideId];
        });
    };

    const handleExport = async () => {
        if (selectedGuides.length === 0 || exporting) {
            return;
        }
        setExporting(true);
        setExportError(null);
        try {
            await downloadCompletionsCSV(selectedGuides, preset);
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'failed to export');
        } finally {
            setExporting(false);
        }
    };

    const durationItems = DATE_RANGE_PRESETS.map((p) => {
        const window = localDayWindowForPreset(p.id);
        return {
            id: p.id,
            label: p.label,
            sublabel: window ? formatPresetSublabel(window) : undefined,
            selected: preset === p.id,
            onClick: () => setPreset(p.id),
        };
    });

    const guideItems = guideOptions.map((g) => ({
        id: g.id,
        label: g.title,
        checked: selectedGuides.includes(g.id),
        onClick: () => toggleGuide(g.id),
    }));

    return (
        <div className={`AcademyAdminCompletions${props.disabled ? ' is-disabled' : ''}`}>
            <div className='AcademyAdminCompletions__toolbar'>
                <div className='AcademyAdminCompletions__filters'>
                    <OutlinedFilterMenu
                        label='Guides'
                        value={`${selectedGuides.length} selected`}
                        ariaLabel='Open menu to select guides'
                        menuAriaLabel='Guides visibility menu'
                        disabled={props.disabled}
                        wide={true}
                        items={guideItems}
                    />
                    <OutlinedFilterMenu
                        label='Duration'
                        value={labelForPreset(preset)}
                        ariaLabel='Open menu to select duration'
                        menuAriaLabel='Date range menu'
                        disabled={props.disabled}
                        menuWidth={250}
                        items={durationItems}
                    />
                </div>
                <button
                    type='button'
                    className='btn btn-md btn-tertiary AcademyAdminCompletions__export'
                    disabled={props.disabled || exporting || selectedGuides.length === 0}
                    onClick={handleExport}
                >
                    <span className='icon icon-download-outline'/>
                    {exporting ? 'Exporting…' : 'Export'}
                </button>
            </div>

            {(error || exportError) && (
                <div className='AcademyAdminCompletions__summary'>
                    {error || exportError}
                </div>
            )}

            <div className='AcademyAdminCompletions__chart'>
                {selectedGuides.length === 0 ? (
                    <div className='AcademyAdminCompletions__empty'>{'Select at least one guide.'}</div>
                ) : (
                    <canvas ref={canvasRef}/>
                )}
            </div>
        </div>
    );
}
