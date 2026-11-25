// One-off seed for the Contact page at /contact.
// Idempotent: safe to re-run. FORCE=1 overwrites the stored HTML.
//
// Usage:
//   node scripts/seed-contact-page.mjs
//   FORCE=1 node scripts/seed-contact-page.mjs
//
// Emails are set to placeholders you can edit in Admin → Pages or by editing
// this script and re-running with FORCE=1.

import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync('/app/.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* ignore */ }

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) { console.error('MONGO_URL is not set.'); process.exit(1); }
const DB_NAME = (!process.env.DB_NAME || process.env.DB_NAME === 'your_database_name') ? 'osc_db' : process.env.DB_NAME;

// Placeholders — edit these once your inboxes are set up, or update via Admin → Pages.
const contactEmail  = 'onlinespiritsclub@gmail.com';
const privacyEmail  = 'onlinespiritsclub@gmail.com';
const supportEmail  = 'onlinespiritsclub@gmail.com';
const contentEmail  = 'onlinespiritsclub@gmail.com';

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
const lastUpdated = new Date().toISOString().slice(0, 10);

const contentHtml = `
<p><em>Last updated: ${lastUpdated}</em></p>

<p><strong>Online Spirits Club</strong> is a free educational platform for bartenders, waiters, sommeliers, hospitality students and anyone curious about spirits, cocktails, beer, wine and service. We teach evidence-based lessons — active recall, flashcards, spaced repetition — in 3–5 minute sessions. No ads, no tracking, no paywall.</p>

<p>The best way to reach us is by email. We're a small team based in Ireland, so please allow a couple of working days for a reply. We read every message.</p>

<h2>Get in touch</h2>
<ul>
  <li><strong>General questions and partnerships</strong> — <a href="mailto:${contactEmail}">${contactEmail}</a></li>
  <li><strong>Technical support and bug reports</strong> — <a href="mailto:${supportEmail}">${supportEmail}</a></li>
  <li><strong>Data protection and GDPR requests</strong> — <a href="mailto:${privacyEmail}">${privacyEmail}</a></li>
  <li><strong>Content corrections and course feedback</strong> — <a href="mailto:${contentEmail}">${contentEmail}</a></li>
</ul>
<p>If in doubt, write to <a href="mailto:${contactEmail}">${contactEmail}</a> and we'll route your message to the right person.</p>

<h2>Frequently asked questions</h2>

<h3>Technical issues</h3>
<p><strong>Something isn't working — what should I do?</strong></p>
<p>Sorry about that. Before writing to us, please try the usual quick fixes: refresh the page, sign out and back in, or clear your browser cache. If the problem persists, email <a href="mailto:${supportEmail}">${supportEmail}</a> with:</p>
<ul>
  <li>What you were trying to do.</li>
  <li>What happened instead (a screenshot really helps).</li>
  <li>Your device and browser (for example "iPhone 14, Safari 17").</li>
</ul>
<p>We'll get back to you as quickly as we can.</p>

<h3>Data requests</h3>
<p><strong>I want a copy of my data, to correct it, or to delete my account.</strong></p>
<p>You have full rights under the GDPR — access, rectification, erasure, portability and objection. Most fields you can update yourself from your profile page. For anything else, email <a href="mailto:${privacyEmail}">${privacyEmail}</a> from the email on your account and we'll respond within one month (usually within a few days).</p>
<p>For the full picture, see our <a href="/privacy">Privacy Policy</a>.</p>

<h3>Newsletter questions</h3>
<p><strong>How do I subscribe, unsubscribe, or change my email preferences?</strong></p>
<p>Our newsletter is opt-in only. You can turn it on or off any time from your profile page, or click the unsubscribe link at the bottom of any newsletter email. If you have trouble, email <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>

<h3>Content corrections</h3>
<p><strong>I spotted a mistake in a lesson — how do I report it?</strong></p>
<p>Thank you — this really helps. Email <a href="mailto:${contentEmail}">${contentEmail}</a> and include:</p>
<ul>
  <li>The course and lesson title (or link).</li>
  <li>What you think is wrong and why.</li>
  <li>A source or reference, if you have one.</li>
</ul>
<p>Our editors review every submission. If we agree, we update the lesson (usually within a week) and credit you if you'd like.</p>

<h2>What we can't do</h2>
<p>We're an educational platform, not a legal, medical or financial advice service. We can't:</p>
<ul>
  <li>Give personalised advice about alcohol consumption or health.</li>
  <li>Certify professional qualifications.</li>
  <li>Recommend or endorse specific brands, bars, or employers.</li>
</ul>

<h2>Something else?</h2>
<p>If your question doesn't fit above, just email <a href="mailto:${contactEmail}">${contactEmail}</a>. We'd love to hear from you — praise, criticism, feature requests, weird bugs, all welcome.</p>

<p>See also our <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms of Service</a> and <a href="/cookies">Cookie Policy</a>.</p>
`.trim();

const doc = {
  id: randomUUID(),
  title: 'Contact',
  slug: 'contact',
  seoTitle: 'Contact · Online Spirits Club',
  seoDescription: 'Get in touch with Online Spirits Club — the free educational platform for spirits, cocktails, beer, wine and hospitality. Support, data requests, newsletter and content corrections.',
  contentHtml,
  published: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const force = process.env.FORCE === '1';
const client = new MongoClient(MONGO_URL);
try {
  await client.connect();
  const db = client.db(DB_NAME);
  const existing = await db.collection('pages').findOne({ slug: 'contact' });
  if (existing && !force) {
    console.log(`ℹ  A page with slug "contact" already exists (id=${existing.id}). Skipping.`);
    console.log('   Run with FORCE=1 to overwrite the stored HTML.');
  } else if (existing && force) {
    await db.collection('pages').updateOne(
      { slug: 'contact' },
      { $set: { ...doc, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } }
    );
    console.log(`✔  Updated contact page (id=${existing.id}) in database "${DB_NAME}".`);
  } else {
    await db.collection('pages').insertOne(doc);
    console.log(`✔  Inserted contact page (id=${doc.id}) into database "${DB_NAME}".`);
  }
  console.log(`   Visible at: ${siteUrl}/contact`);
} catch (e) {
  console.error('✖  Failed:', e.message);
  process.exit(1);
} finally {
  await client.close();
}
