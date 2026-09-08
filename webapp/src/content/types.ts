// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Fields commented "Rich" render through RichText and accept <strong>, <code>,
 * and <a href="...">, with hrefs limited to https and in-app paths. Every other
 * field renders literally, so a tag written there shows as angle brackets.
 */
export type Audience = 'end-user' | 'admin';

export type StepMedia = {
    type: 'svg' | 'image';
    file: string;
    alt: string;
};

export type Step = {
    title: string;

    /** Rich. */
    description: string;

    /** Rich. */
    tip?: string;
    media?: StepMedia;
};

export type CommandItem = {
    command: string;
    description: string;
};

export type CommandGroup = {
    label: string;
    items: CommandItem[];
};

export type CommandHeaders = {
    command: string;
    description: string;
};

export type TierItem = {
    name: string;

    /** Rich. */
    description: string;

    /** Shown as a badge, e.g. 'Enterprise'. */
    edition?: string;
};

/** A level of a graded model, such as a security maturity tier. */
export type Tier = {
    label: string;

    /** Rich. */
    summary: string;
    items: TierItem[];
};

/** One of several alternative paths through the same task, e.g. per platform. */
export type Variant = {
    label: string;
    steps: Step[];
};

export type ChecklistItem = {
    title: string;

    /** Rich. */
    description: string;
};

/**
 * Content blocks render in a fixed order: tiers, steps, variants, checklist,
 * commandGroups. Modules use whichever subset fits; not everything is a
 * numbered procedure.
 */
export type Module = {
    id: string;
    navTitle: string;
    icon: string;
    minutes: number;
    title: string;

    /** Rich. */
    summary: string;
    steps: Step[];
    tiers?: Tier[];
    variants?: Variant[];
    checklist?: ChecklistItem[];
    commandGroups?: CommandGroup[];
    commandHeaders?: CommandHeaders;

    /** Plugin IDs that must all be active for this module to be shown. */
    requiresPlugins?: string[];
};

export type DoneLink = {
    label: string;
    href: string;
};

export type Guide = {
    id: string;
    title: string;
    heroTitle: string;

    /** Rich. */
    subtitle: string;

    /** Plain: renders inside the catalog card, which is itself a link. */
    description: string;
    icon: string;
    audiences: Audience[];
    modules: Module[];
    doneTitle: string;

    /** Rich. */
    doneSummary: string;
    doneLinks: DoneLink[];

    /** Plugin IDs that must all be active for this guide to be shown. */
    requiresPlugins?: string[];
};
