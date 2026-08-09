#!/usr/bin/env node
/**
 * Renders images/icon.svg to images/icon.png (256x256, the size the VS Code
 * Marketplace recommends; 128x128 is the minimum).
 *
 * The SVG is the source of truth — edit that, run this, commit both. The PNG
 * is committed because `vsce package` needs it and the Marketplace does not
 * accept SVG icons.
 *
 * Usage:  npm run build:icon      (needs `npm i -D sharp` — not a runtime dep)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = resolve(root, 'images', 'icon.svg');
const pngPath = resolve(root, 'images', 'icon.png');

let sharp;
try {
	sharp = (await import('sharp')).default;
} catch {
	console.error(
		'sharp is not installed. It is only needed to regenerate the icon:\n' +
		'  npm install --no-save sharp && npm run build:icon'
	);
	process.exit(1);
}

const png = await sharp(readFileSync(svgPath), { density: 384 })
	.resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
	.png({ compressionLevel: 9 })
	.toBuffer();

writeFileSync(pngPath, png);
console.log(`Wrote ${pngPath} (${png.length} bytes)`);
