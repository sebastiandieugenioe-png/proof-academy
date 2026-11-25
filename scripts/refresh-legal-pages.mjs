// One-shot maintenance: force-refresh all legal page content in the DB
// to match the current lib/legal-pages.js source. Used after unifying
// contact emails to onlinespiritsclub@gmail.com. Safe to re-run — only
// touches the 6 legal slugs from getLegalPages() and preserves ids.
//
// Usage:  node scripts/refresh-legal-pages.mjs
//
// Reads MONGO_URL from .env.

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

// Load .env manually
const envRaw = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const { getLegalPages } = await import('../lib/legal-pages.js');
const { sanitizeContentHtml } = await import('../lib/sanitize.js');

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'osc';
if (!MONGO_URL) { console.error('MONGO_URL missing'); process.exit(1); }

const client = new MongoClient(MONGO_URL);
await client.connect();
const db = client.db(DB_NAME);
const now = new Date();

const legal = getLegalPages();
let updated = 0, created = 0;

for (const p of legal) {
  const existing = await db.collection('pages').findOne({ slug: p.slug });
  const doc = {
    title: p.title,
    seoTitle: p.seoTitle || '',
    seoDescription: p.seoDescription || '',
    contentHtml: sanitizeContentHtml(p.contentHtml),
    updatedAt: now,
  };
  if (existing) {
    await db.collection('pages').updateOne({ slug: p.slug }, { $set: doc });
    updated += 1;
    console.log(`  [updated] /${p.slug}`);
  } else {
    await db.collection('pages').insertOne({
      id: (await import('uuid')).v4(),
      slug: p.slug,
      published: true,
      createdAt: now,
      ...doc,
    });
    created += 1;
    console.log(`  [created] /${p.slug}`);
  }
}

console.log(`\nDone. Updated: ${updated}, Created: ${created}`);
await client.close();
