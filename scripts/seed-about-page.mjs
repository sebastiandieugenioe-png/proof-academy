// One-off seed for the About page at /about.
// Idempotent: safe to re-run. FORCE=1 overwrites the stored HTML.
//
// Usage:
//   node scripts/seed-about-page.mjs
//   FORCE=1 node scripts/seed-about-page.mjs

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

const contactEmail = 'hello@onlinespiritsclub.com';
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
const lastUpdated = new Date().toISOString().slice(0, 10);

const contentHtml = `
<p><em>Last updated: ${lastUpdated}</em></p>

<p><strong>Online Spirits Club</strong> is a free educational platform for people who make hospitality happen — bartenders, waiters, sommeliers, baristas, students, home enthusiasts. We teach the essentials of spirits, cocktails, beer, wine and service in short, focused lessons you can finish on a break.</p>

<h2>Why we exist</h2>
<p>Great hospitality is built on knowledge — where a spirit comes from, why a cocktail works, how to describe a wine to a guest without pretence. That knowledge is scattered across expensive courses, dense books, and word of mouth. We wanted to make it accessible to anyone with a phone and five minutes.</p>

<p>So we built Online Spirits Club: a place where you can learn something real about your craft, for free, without ads or paywalls, whenever you have a moment.</p>

<h2>How we teach</h2>
<p>Every lesson is built on three principles from cognitive science that quietly make learning stick:</p>
<ul>
  <li><strong>Active recall</strong> — you don't just read; you answer questions and retrieve what you've learned. That's what moves knowledge from short-term to long-term memory.</li>
  <li><strong>Spaced repetition</strong> — flashcards return at the right moment, just before you'd forget them. Ten minutes a day beats an hour once a week.</li>
  <li><strong>Microlearning</strong> — each lesson is 3–5 minutes with a clear goal. Big enough to matter; small enough to actually finish.</li>
</ul>
<p>You'll find these baked into every course: three clear objectives, a short theory read, embedded questions, mandatory flashcards, and a 5-question quiz.</p>

<h2>What you'll find</h2>
<ul>
  <li>Structured courses across spirits, cocktails, beer, wine and hospitality.</li>
  <li>Infinite "Study" mode that surfaces exactly the flashcards you need next.</li>
  <li>Progress tracking, quiz history, and a simple profile — nothing more, no leaderboards, no streak pressure.</li>
  <li>Free lessons on the public web at <a href="${siteUrl}">${siteUrl}</a>, so anything you learn can be shared and cited.</li>
</ul>

<h2>What we don't do</h2>
<ul>
  <li>No ads. No third-party tracking. No selling your data.</li>
  <li>No gamification for the sake of it — no coins, no XP, no fake achievements.</li>
  <li>No AI-generated content in lessons. Everything is written and reviewed by people who care.</li>
  <li>No paywall. If we ever add a paid feature, it will be optional, and the core learning will always be free.</li>
</ul>

<h2>Where we're based</h2>
<p>We're a small, Ireland-based team serving learners across the European Union, the United Kingdom, and beyond. As the data controller for your account information, we operate under Irish and EU data-protection law. See our <a href="/privacy">Privacy Policy</a> and <a href="/data-rights">Data Rights</a> page for what that means for you in practice.</p>

<h2>Responsible drinking</h2>
<p>Alcohol is part of our craft, but it comes with responsibility. Online Spirits Club is an educational platform — nothing on it encourages excessive or irresponsible consumption. Drink responsibly, know your limits, respect the law, and never drink and drive. If you or someone you know is struggling with alcohol, please reach out to a qualified health professional.</p>

<h2>Get in touch</h2>
<p>Questions, feedback, partnership ideas, corrections? We read every message.</p>
<ul>
  <li>Email: <a href="mailto:${contactEmail}">${contactEmail}</a></li>
  <li><a href="/contact">Contact page</a> — with dedicated addresses for support, data requests and content corrections.</li>
</ul>

<p>Thanks for being here — and for taking your craft seriously enough to keep learning.</p>
`.trim();

const doc = {
  id: randomUUID(),
  title: 'About Online Spirits Club',
  slug: 'about',
  seoTitle: 'About · Online Spirits Club',
  seoDescription: 'A free educational platform for spirits, cocktails, beer, wine and hospitality. Evidence-based learning — active recall, spaced repetition, microlearning. No ads. Ireland-based.',
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
  const existing = await db.collection('pages').findOne({ slug: 'about' });
  if (existing && !force) {
    console.log(`ℹ  A page with slug "about" already exists (id=${existing.id}). Skipping.`);
    console.log('   Run with FORCE=1 to overwrite the stored HTML.');
  } else if (existing && force) {
    await db.collection('pages').updateOne(
      { slug: 'about' },
      { $set: { ...doc, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } }
    );
    console.log(`✔  Updated about page (id=${existing.id}) in database "${DB_NAME}".`);
  } else {
    await db.collection('pages').insertOne(doc);
    console.log(`✔  Inserted about page (id=${doc.id}) into database "${DB_NAME}".`);
  }
  console.log(`   Visible at: ${siteUrl}/about`);
} catch (e) {
  console.error('✖  Failed:', e.message);
  process.exit(1);
} finally {
  await client.close();
}
