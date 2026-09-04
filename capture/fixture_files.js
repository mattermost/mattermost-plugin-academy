// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Attachments for the file-search shots, generated rather than checked in.
 *
 * The File Search module needs real files in a real channel: extension filters, category
 * filters and the Files tab all have nothing to show otherwise. Building the bytes here keeps
 * binaries out of the repo and keeps the content invented, same rule as the messages.
 */

import sharp from 'sharp';

/** A plain-text checklist. Extension `.txt`, category "Documents". */
function checklist() {
    return Buffer.from([
        'Deploy checklist — Northwind platform',
        '',
        '1. Freeze deploys and announce in Ops Bridge',
        '2. Take a database snapshot (about 4 minutes)',
        '3. Run smoke tests against staging',
        '4. Drain the job queue',
        '5. Roll forward, or run `make rollback` if smoke tests fail',
        '',
        'On-call owns steps 2 and 5.',
        '',
    ].join('\n'), 'utf8');
}

/**
 * A small bar chart, so the Images category and a `.png` extension filter both have a hit.
 * Rasterised from SVG through sharp, which is already a dependency for the WebP conversion.
 */
async function errorRateChart() {
    const bars = [38, 52, 46, 61, 24, 12, 9];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="240">
        <rect width="440" height="240" fill="#ffffff"/>
        <text x="20" y="28" font-family="Helvetica" font-size="15" fill="#3f4350">Error rate by hour</text>
        ${bars.map((h, i) => `<rect x="${28 + (i * 56)}" y="${210 - (h * 2)}" width="34" height="${h * 2}" fill="#1c58d9"/>`).join('')}
        <line x1="20" y1="210" x2="420" y2="210" stroke="#c9ccd3"/>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * A minimal one-page PDF, hand-assembled.
 *
 * Written out byte by byte because the alternative is adding a PDF library for a single
 * fixture. The xref offsets have to match the actual byte positions, so the objects are
 * measured as they are concatenated rather than hard-coded.
 */
function rollbackPdf() {
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    const text = 'BT /F1 16 Tf 72 700 Td (Rollback plan - Northwind platform) Tj ET';
    const stream = `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
    objects.push(stream);

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((body, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
        pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    return Buffer.from(pdf, 'latin1');
}

/** The post that carries the attachments, and the attachments themselves. */
export const FILE_POST = {
    channel: 'ops-bridge',
    message: 'Attaching the rollback plan, the deploy checklist, and this hour\'s error rates.',
};

export async function fixtureFiles() {
    return [
        {name: 'rollback-plan.pdf', type: 'application/pdf', buffer: rollbackPdf()},
        {name: 'deploy-checklist.txt', type: 'text/plain', buffer: checklist()},
        {name: 'error-rates.png', type: 'image/png', buffer: await errorRateChart()},
    ];
}
