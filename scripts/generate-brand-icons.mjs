#!/usr/bin/env node
// Generate PNG app-icons and social OpenGraph image from the master SVGs.
// Uses sharp (already installed). Idempotent \u2014 safe to re-run.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const iconsDir = path.join(root, 'public', 'icons');
const appDir = path.join(root, 'app');
await fs.mkdir(iconsDir, { recursive: true });

// --- 1) The master symbol SVG (on white background) ---
const symbol = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FFFFFF"/>
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

// --- 2) Maskable variant \u2014 the mark shrunk to ~60% of a navy rounded square,
// so it survives Android home-screen mask cropping.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="90" fill="#1E3A8A"/>
  <g transform="translate(96 96) scale(5)">
    <g stroke="#FFFFFF" stroke-width="3" stroke-linecap="round">
      <line x1="32" y1="23" x2="32" y2="14" />
      <line x1="41" y1="32" x2="50" y2="32" />
      <line x1="32" y1="41" x2="32" y2="50" />
      <line x1="23" y1="32" x2="14" y2="32" />
    </g>
    <g fill="#FFFFFF">
      <circle cx="32" cy="10" r="4" />
      <circle cx="54" cy="32" r="4" />
      <circle cx="32" cy="54" r="4" />
      <circle cx="10" cy="32" r="4" />
    </g>
    <circle cx="32" cy="32" r="8" fill="#FFFFFF" />
    <circle cx="32" cy="32" r="2" fill="#C8A44D" />
  </g>
</svg>`;

// --- 3) Open Graph image \u2014 1200x630, brand mark centered + wordmark + tagline
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
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

async function render(svg, out, size, opts = {}) {
  const dest = path.join(root, out);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(svg);
  const img = sharp(buf, { density: 400 });
  if (size) img.resize(size, opts.height || size, { fit: 'contain', background: opts.bg || '#FFFFFF' });
  await img.png().toFile(dest);
  const stat = await fs.stat(dest);
  console.log(`  ${out}  ${size ? size + 'px' : ''}  ${(stat.size / 1024).toFixed(1)}KB`);
}

console.log('Rendering PWA + Apple + OG PNGs from master SVGs...');
await render(symbol,   'public/icons/icon-192.png',           192);
await render(symbol,   'public/icons/icon-512.png',           512);
await render(maskable, 'public/icons/icon-maskable-512.png',  512, { bg: '#1E3A8A' });
await render(symbol,   'public/icons/apple-touch-icon.png',   180);
// OG image \u2014 wide aspect ratio 1200x630
{
  const dest = path.join(root, 'public', 'og-image.png');
  await sharp(Buffer.from(og), { density: 200 })
    .resize(1200, 630, { fit: 'contain', background: '#F8FAFC' })
    .png()
    .toFile(dest);
  const stat = await fs.stat(dest);
  console.log(`  public/og-image.png  1200x630  ${(stat.size / 1024).toFixed(1)}KB`);
}
console.log('Done.');
