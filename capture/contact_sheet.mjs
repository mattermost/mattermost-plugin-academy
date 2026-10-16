// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Contact sheets of captures at the size the guide actually renders them.
 *
 *   node contact_sheet.mjs [--per=8] [shot-id ...]      # reads capture/png/, from --keep-png
 *
 * Review happens here, not at full resolution. A capture can pass every check in capture.js and
 * still be wrong in place: shrunk to 0.7x by an over-wide frame, or carrying a badge, a banner or
 * half a row that is not the step. Those are only visible at rendered size, and only obvious when
 * a guide's shots sit side by side.
 *
 * Rendered size follows the guide's rules: step art is 2x density (a `2x` srcset, so a pixel is
 * half a CSS pixel), inside an 840px column, capped at 480px tall — whichever binds first, and
 * never enlarged. Each tile is labelled with that scale; below about 0.7x text starts to go.
 *
 * The label is the scale of the file as shipped. A shot with its own `scale` (dialogs ship at
 * three-quarters) was shrunk before it was written, so its label reads 1.00x at three-quarter UI
 * size — deliberately, since that is the size the guides' author asked for.
 */

import {mkdirSync, readdirSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PNG_DIR = path.join(HERE, 'png');
const OUT_DIR = path.join(HERE, 'png', 'sheets');

const COLUMN = 840;
const MAX_HEIGHT = 480;
const DENSITY = 2;
const PAD = 24;
const LABEL = 28;

const args = process.argv.slice(2);
const per = Number(args.find((a) => a.startsWith('--per='))?.split('=')[1] || 8);
let ids = args.filter((a) => !a.startsWith('--'));
if (!ids.length) {
    ids = readdirSync(PNG_DIR).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')).sort();
}

const tiles = [];
for (const id of ids) {
    const src = path.join(PNG_DIR, `${id}.png`);
    const meta = await sharp(src).metadata();
    const cssW = meta.width / DENSITY;
    const cssH = meta.height / DENSITY;
    const scale = Math.min(1, COLUMN / cssW, MAX_HEIGHT / cssH);
    const w = Math.round(cssW * scale);
    const h = Math.round(cssH * scale);
    tiles.push({id, w, h, scale, buf: await sharp(src).resize(w, h).png().toBuffer()});
}

mkdirSync(OUT_DIR, {recursive: true});
const width = (COLUMN * 2) + (PAD * 3);
for (let i = 0; i < tiles.length; i += per) {
    const group = tiles.slice(i, i + per);
    const rows = [];
    for (let r = 0; r < group.length; r += 2) {
        rows.push(group.slice(r, r + 2));
    }
    const rowHeights = rows.map((row) => Math.max(...row.map((t) => t.h)) + LABEL + PAD);
    const height = rowHeights.reduce((a, b) => a + b, PAD);

    const layers = [];
    let y = PAD;
    rows.forEach((row, r) => {
        row.forEach((t, c) => {
            const x = PAD + (c * (COLUMN + PAD));
            const warn = t.scale < 0.7 ? '#c00' : '#555';
            layers.push({
                input: Buffer.from(`<svg width="${COLUMN}" height="${LABEL}"><text x="0" y="20" font-family="Helvetica" font-size="18" fill="${warn}">${t.id}  ${t.w}x${t.h}  ${t.scale.toFixed(2)}x</text></svg>`),
                left: x,
                top: y,
            });
            layers.push({input: t.buf, left: x, top: y + LABEL});
            layers.push({
                input: Buffer.from(`<svg width="${t.w}" height="${t.h}"><rect x="0.5" y="0.5" width="${t.w - 1}" height="${t.h - 1}" fill="none" stroke="#bbb"/></svg>`),
                left: x,
                top: y + LABEL,
            });
        });
        y += rowHeights[r];
    });

    const file = path.join(OUT_DIR, `sheet-${String((i / per) + 1).padStart(2, '0')}.png`);
    await sharp({create: {width, height, channels: 3, background: '#f4f4f4'}}).composite(layers).png().toFile(file);
    console.log(`${path.relative(process.cwd(), file)}  ${group.map((t) => t.id).join(' ')}`);
}
