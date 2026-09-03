// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

import RichText, {safeHref} from 'components/academy/rich_text';

function html(text: string) {
    return renderToStaticMarkup(<RichText text={text}/>);
}

describe('safeHref', () => {
    it('accepts https and root-relative paths', () => {
        expect(safeHref('https://docs.mattermost.com/')).toBe('https://docs.mattermost.com/');
        expect(safeHref('/admin_console/plugins')).toBe('/admin_console/plugins');
    });

    it('rejects anything that could execute or leave the origin implicitly', () => {
        // eslint-disable-next-line no-script-url -- asserting that javascript: hrefs are rejected
        expect(safeHref('javascript:alert(1)')).toBeNull();
        expect(safeHref('data:text/html,hi')).toBeNull();
        expect(safeHref('http://example.com')).toBeNull();
        expect(safeHref('//example.com')).toBeNull();
    });
});

describe('RichText', () => {
    it('renders plain text unchanged', () => {
        expect(html('Open the channel')).toBe('Open the channel');
    });

    it('renders strong emphasis', () => {
        expect(html('Press <strong>Enter</strong> to send')).
            toBe('Press <strong>Enter</strong> to send');
    });

    it('opens external links in a new tab', () => {
        expect(html('See <a href="https://docs.mattermost.com/">the docs</a>')).
            toBe('See <a href="https://docs.mattermost.com/" target="_blank" rel="noopener noreferrer">the docs</a>');
    });

    it('keeps in-app links in the same tab', () => {
        expect(html('Go to <a href="/admin_console/plugins">plugins</a>')).
            toBe('Go to <a href="/admin_console/plugins">plugins</a>');
    });

    it('drops the anchor but keeps the text for an unsafe href', () => {
        expect(html('Try <a href="javascript:alert(1)">this</a>')).toBe('Try this');
    });

    it('supports emphasis inside a link', () => {
        expect(html('<a href="https://mattermost.com/"><strong>Mattermost</strong></a>')).
            toBe('<a href="https://mattermost.com/" target="_blank" rel="noopener noreferrer"><strong>Mattermost</strong></a>');
    });
});
