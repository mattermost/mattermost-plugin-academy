// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

const TOKEN = /(<\/?strong>|<\/?code>|<a\s+href="[^"]*"\s*>|<\/a>)/i;
const OPEN_LINK = /^<a\s+href="([^"]*)"\s*>$/i;

/**
 * Content is authored in this repo, but keep the accepted shapes narrow so a
 * typo cannot produce a javascript: or data: link. Root-relative paths stay
 * in the app; anything else must be https.
 */
export function safeHref(href: string): string | null {
    const trimmed = href.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }
    if ((/^https:\/\/[^\s]+$/i).test(trimmed)) {
        return trimmed;
    }
    return null;
}

/**
 * Renders guide copy that may include <strong>, <code>, and <a href="...">.
 * Unrecognised or unsafe markup degrades to plain text rather than throwing.
 */
export default function RichText({text}: {text: string}) {
    const nodes: React.ReactNode[] = [];
    let bold = false;
    let code = false;
    let href: string | null = null;

    text.split(TOKEN).forEach((part, index) => {
        if (!part) {
            return;
        }
        if ((/^<strong>$/i).test(part)) {
            bold = true;
            return;
        }
        if ((/^<\/strong>$/i).test(part)) {
            bold = false;
            return;
        }
        if ((/^<code>$/i).test(part)) {
            code = true;
            return;
        }
        if ((/^<\/code>$/i).test(part)) {
            code = false;
            return;
        }

        const open = part.match(OPEN_LINK);
        if (open) {
            href = safeHref(open[1]);
            return;
        }
        if ((/^<\/a>$/i).test(part)) {
            href = null;
            return;
        }

        let content: React.ReactNode = part;
        if (code) {
            content = <code>{content}</code>;
        }
        if (bold) {
            content = <strong>{content}</strong>;
        }
        if (href === null) {
            nodes.push(<React.Fragment key={index}>{content}</React.Fragment>);
            return;
        }

        const external = href.startsWith('https:');
        nodes.push(
            <a
                key={index}
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
            >
                {content}
            </a>,
        );
    });

    return <>{nodes}</>;
}
