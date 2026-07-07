#!/usr/bin/env node
// Export canonical brand file set to /public/brand/ using the industry-standard
// filenames (favicon.ico, apple-touch-icon.png, android-chrome-*.png, og-image.png).
// Idempotent \u2014 safe to re-run. Overwrites existing files.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const brand = path.join(root, 'public', 'brand');
await fs.mkdir(brand, { recursive: true });

// ============================================================================
// SOURCE SVGs (single source of truth for the export set)
// ============================================================================

// Symbol only \u2014 5-node mark with gold core
const symbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="OSC">
  <g stroke="#1E3A8A" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="23" x2="32" y2="14" />
    <line x1="41" y1="32" x2="50" y2="32" />
    <line x1="32" y1="41" x2="32" y2="50" />
    <line x1="23" y1="32" x2="14" y2="32" />
  </g>
  <g fill="#1E3A8A">
    <circle cx="32" cy="10" r="4" />
    <circle cx="54" cy="32" r="4" />
    <circle cx="32" cy="54" r="4" />
    <circle cx="10" cy="32" r="4" />
  </g>
  <circle cx="32" cy="32" r="8" fill="#1E3A8A" />
  <circle cx="32" cy="32" r="2" fill="#C8A44D" />
</svg>`;

// Favicon SVG \u2014 32x32 viewBox, thicker strokes, no gold (would be sub-pixel)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="OSC">
  <g stroke="#1E3A8A" stroke-width="2.5" stroke-linecap="round">
    <line x1="16" y1="12" x2="16" y2="7" />
    <line x1="20" y1="16" x2="25" y2="16" />
    <line x1="16" y1="20" x2="16" y2="25" />
    <line x1="12" y1="16" x2="7" y2="16" />
  </g>
  <g fill="#1E3A8A">
    <circle cx="16" cy="5" r="2.2" />
    <circle cx="27" cy="16" r="2.2" />
    <circle cx="16" cy="27" r="2.2" />
    <circle cx="5" cy="16" r="2.2" />
  </g>
  <circle cx="16" cy="16" r="4" fill="#1E3A8A" />
</svg>`;

// Horizontal lockup \u2014 symbol + "Online Spirits Club" in Manrope Bold
const horizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" role="img" aria-label="Online Spirits Club">
  <g stroke="#1E3A8A" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="23" x2="32" y2="14" />
    <line x1="41" y1="32" x2="50" y2="32" />
    <line x1="32" y1="41" x2="32" y2="50" />
    <line x1="23" y1="32" x2="14" y2="32" />
  </g>
  <g fill="#1E3A8A">
    <circle cx="32" cy="10" r="4" />
    <circle cx="54" cy="32" r="4" />
    <circle cx="32" cy="54" r="4" />
    <circle cx="10" cy="32" r="4" />
  </g>
  <circle cx="32" cy="32" r="8" fill="#1E3A8A" />
  <circle cx="32" cy="32" r="2" fill="#C8A44D" />
  <text x="76" y="41" font-family="Manrope, 'Inter', -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="22" fill="#0F172A" letter-spacing="-0.5">Online Spirits Club</text>
</svg>`;

// Compact lockup \u2014 symbol + "OSC" ExtraBold monogram
const compactSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 64" role="img" aria-label="OSC">
  <g stroke="#1E3A8A" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="23" x2="32" y2="14" />
    <line x1="41" y1="32" x2="50" y2="32" />
    <line x1="32" y1="41" x2="32" y2="50" />
    <line x1="23" y1="32" x2="14" y2="32" />
  </g>
  <g fill="#1E3A8A">
    <circle cx="32" cy="10" r="4" />
    <circle cx="54" cy="32" r="4" />
    <circle cx="32" cy="54" r="4" />
    <circle cx="10" cy="32" r="4" />
  </g>
  <circle cx="32" cy="32" r="8" fill="#1E3A8A" />
  <circle cx="32" cy="32" r="2" fill="#C8A44D" />
  <text x="76" y="43" font-family="Manrope, 'Inter', -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="28" fill="#0F172A" letter-spacing="1">OSC</text>
</svg>`;

// OG image \u2014 1200x630 social preview
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#F8FAFC"/>
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
  <g transform="translate(500 130) scale(3.1)">
    <g stroke="#1E3A8A" stroke-width="3" stroke-linecap="round">
      <line x1="32" y1="23" x2="32" y2="14" />
      <line x1="41" y1="32" x2="50" y2="32" />
      <line x1="32" y1="41" x2="32" y2="50" />
      <line x1="23" y1="32" x2="14" y2="32" />
    </g>
    <g fill="#1E3A8A">
      <circle cx="32" cy="10" r="4" />
      <circle cx="54" cy="32" r="4" />
      <circle cx="32" cy="54" r="4" />
      <circle cx="10" cy="32" r="4" />
    </g>
    <circle cx="32" cy="32" r="8" fill="#1E3A8A" />
    <circle cx="32" cy="32" r="2" fill="#C8A44D" />
  </g>
  <text x="600" y="420" text-anchor="middle" font-family="Manrope, 'Inter', sans-serif" font-weight="700" font-size="56" fill="#0F172A" letter-spacing="-1.5">Online Spirits Club</text>
  <text x="600" y="470" text-anchor="middle" font-family="Manrope, 'Inter', sans-serif" font-weight="500" font-size="26" fill="#475569">Learn spirits, cocktails, beer &amp; hospitality</text>
  <text x="600" y="530" text-anchor="middle" font-family="Manrope, 'Inter', sans-serif" font-weight="600" font-size="18" fill="#94A3B8" letter-spacing="4">EVIDENCE\u2011BASED \u00b7 FREE \u00b7 IRELAND</text>
</svg>`;

// ============================================================================
// EXPORT
// ============================================================================

async function writeText(name, content) {
  const dest = path.join(brand, name);
  await fs.writeFile(dest, content);
  const stat = await fs.stat(dest);
  console.log(`  ${name.padEnd(32)}  ${(stat.size / 1024).toFixed(1)}KB`);
}

async function writePng(name, svg, size, opts = {}) {
  const dest = path.join(brand, name);
  await sharp(Buffer.from(svg), { density: 400 })
    .resize(size, opts.height || size, { fit: 'contain', background: opts.bg || '#FFFFFF' })
    .png()
    .toFile(dest);
  const stat = await fs.stat(dest);
  console.log(`  ${name.padEnd(32)}  ${size}x${opts.height || size}  ${(stat.size / 1024).toFixed(1)}KB`);
}

console.log('Exporting canonical brand set to /public/brand/ ...\n');

// SVGs
await writeText('logo-horizontal.svg', horizontalSvg);
await writeText('logo-compact.svg', compactSvg);
await writeText('logo-symbol.svg', symbolSvg);
await writeText('favicon.svg', faviconSvg);

// PNGs
await writePng('apple-touch-icon.png', symbolSvg, 180);
await writePng('android-chrome-192x192.png', symbolSvg, 192);
await writePng('android-chrome-512x512.png', symbolSvg, 512);
await writePng('og-image.png', ogSvg, 1200, { height: 630, bg: '#F8FAFC' });

// favicon.ico \u2014 multi-size (16, 32, 48) built from PNGs, using the favicon SVG
// (thicker strokes, no gold) as source.
console.log('\nBuilding multi-size favicon.ico from favicon.svg ...');
const icoSizes = [16, 32, 48];
const icoBuffers = await Promise.all(
  icoSizes.map((s) => sharp(Buffer.from(faviconSvg), { density: 400 })
    .resize(s, s, { fit: 'contain', background: '#FFFFFF' })
    .png()
    .toBuffer())
);
const icoData = await pngToIco(icoBuffers);
const icoPath = path.join(brand, 'favicon.ico');
await fs.writeFile(icoPath, icoData);
const icoStat = await fs.stat(icoPath);
console.log(`  favicon.ico${' '.repeat(21)}  ${icoSizes.join('/')}px  ${(icoStat.size / 1024).toFixed(1)}KB`);

// Also mirror favicon.ico to /public root so /favicon.ico works without prefix
await fs.copyFile(icoPath, path.join(root, 'public', 'favicon.ico'));
console.log('  \u2192 mirrored to /public/favicon.ico');

// Update /public/icons/* (used by the Next.js manifest.json) to keep the PWA
// icons in sync with the fresh canonical set.
const legacyIcons = path.join(root, 'public', 'icons');
await fs.mkdir(legacyIcons, { recursive: true });
await fs.copyFile(path.join(brand, 'apple-touch-icon.png'),        path.join(legacyIcons, 'apple-touch-icon.png'));
await fs.copyFile(path.join(brand, 'android-chrome-192x192.png'),  path.join(legacyIcons, 'icon-192.png'));
await fs.copyFile(path.join(brand, 'android-chrome-512x512.png'),  path.join(legacyIcons, 'icon-512.png'));
// og-image.png also at /public root for the current metadata paths
await fs.copyFile(path.join(brand, 'og-image.png'), path.join(root, 'public', 'og-image.png'));
console.log('  \u2192 mirrored to /public/icons/* + /public/og-image.png');

console.log('\nDone. Complete export lives under /public/brand/');
