// One-off seed for the Data Rights page at /data-rights.
// Idempotent: safe to re-run. FORCE=1 overwrites the stored HTML.
//
// Usage:
//   node scripts/seed-data-rights-page.mjs
//   FORCE=1 node scripts/seed-data-rights-page.mjs

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

const privacyEmail = 'privacy@onlinespiritsclub.com';
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
const lastUpdated = new Date().toISOString().slice(0, 10);

const contentHtml = `
<p><em>Last updated: ${lastUpdated}</em></p>

<p>Your data belongs to you. This page explains — in plain English — the rights you have over the personal data <strong>Online Spirits Club</strong> holds about you, and exactly how to exercise them. We are based in Ireland, so these rights are grounded in the EU General Data Protection Regulation (GDPR). If you're in the UK, the equivalent rights apply under the UK GDPR.</p>

<h2>The rights you have</h2>
<p>Under the GDPR (Articles 15–22) you have the right to:</p>
<ul>
  <li><strong>Access</strong> — get a copy of the personal data we hold about you.</li>
  <li><strong>Rectification</strong> — correct anything that's wrong or incomplete.</li>
  <li><strong>Erasure</strong> — ask us to delete your account and personal data (“right to be forgotten”).</li>
  <li><strong>Portability</strong> — receive your data in a common, machine-readable format so you can take it elsewhere.</li>
  <li><strong>Objection</strong> — object to processing that relies on our legitimate interests, including direct marketing.</li>
  <li><strong>Restriction</strong> — ask us to pause processing while a dispute is being resolved.</li>
  <li><strong>Withdraw consent</strong> — turn off anything that runs on consent (for example the newsletter) at any time.</li>
  <li><strong>Complain to a supervisory authority</strong> — see "If you're not happy" below.</li>
</ul>

<h2>How to use each right</h2>

<h3>Access — see everything we hold</h3>
<p>Most of your data is already visible when you're logged in — your profile, progress, flashcards, quiz scores and comments. If you want a full copy in one export, email <a href="mailto:${privacyEmail}">${privacyEmail}</a> from the address on your account with the subject line <strong>“Data access request”</strong>. We'll reply with a JSON or CSV file within one calendar month.</p>

<h3>Rectification — correct your data</h3>
<p>Log in and open your profile page. From there you can update your name, country, city, professional role and newsletter preference yourself — no email needed.</p>
<p>If something isn't editable from the profile (for example a typo in your email, or a spelling of your name in a comment), email <a href="mailto:${privacyEmail}">${privacyEmail}</a> and we'll correct it, usually within a few working days.</p>

<h3>Erasure — delete your account</h3>
<p>To close your account and delete your personal data, email <a href="mailto:${privacyEmail}">${privacyEmail}</a> from the address on your account with the subject line <strong>“Delete my account”</strong>. We'll:</p>
<ul>
  <li>Confirm your request within a few working days.</li>
  <li>Delete your account, learning progress, flashcards, quiz results, comments and profile within <strong>30 days</strong>.</li>
  <li>Keep a minimal record (for example an anonymised note of the deletion date) only where the law requires it, and only for as long as required.</li>
</ul>
<p>Once deleted, data can't be restored — please export anything you want to keep first.</p>

<h3>Portability — export your data</h3>
<p>Ask for an export by emailing <a href="mailto:${privacyEmail}">${privacyEmail}</a> with the subject line <strong>“Data export request”</strong>. You'll receive a file (JSON or CSV, your choice) that includes:</p>
<ul>
  <li>Profile details.</li>
  <li>Lesson progress and flashcard review history.</li>
  <li>Quiz scores.</li>
  <li>Your public comments.</li>
  <li>Newsletter opt-in status and history.</li>
</ul>
<p>Data you provided <em>to us</em> (as opposed to data we generated) is portable under Article 20. We aim to deliver the export within one calendar month.</p>

<h3>Objection — object to processing</h3>
<p>You can object at any time to processing that relies on our legitimate interests — for example anti-abuse monitoring or aggregate usage analysis. Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> explaining what you're objecting to. We'll either stop the processing or explain why we can't (for example if it's necessary to protect the platform).</p>
<p>For direct marketing (our newsletter), there is <strong>no need to explain why</strong> — see below.</p>

<h3>Withdraw newsletter consent</h3>
<p>Our newsletter is opt-in only. You can withdraw consent at any time in three ways:</p>
<ul>
  <li><strong>Fastest:</strong> click the <strong>unsubscribe link</strong> at the bottom of any newsletter email. Takes effect immediately.</li>
  <li>Log in, open your profile page, and turn the newsletter toggle off.</li>
  <li>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> and we'll remove you.</li>
</ul>
<p>Withdrawing consent does not affect the lawfulness of any sending before you withdrew it, and it does not affect essential account emails (like password resets).</p>

<h3>Restriction of processing</h3>
<p>If you think your data is inaccurate, or you've objected to our processing and we're still assessing, you can ask us to pause processing while we work it out. Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> with the subject line <strong>“Restrict processing”</strong>.</p>

<h2>How long we take to respond</h2>
<ul>
  <li><strong>Acknowledgement:</strong> usually within a few working days.</li>
  <li><strong>Full response:</strong> within <strong>one calendar month</strong> of receiving your request, as required by the GDPR.</li>
  <li><strong>Complex or high-volume requests:</strong> we may extend by up to two further months. If we need to, we will tell you within the first month, along with the reason.</li>
  <li><strong>Newsletter unsubscribe:</strong> takes effect immediately when you click the link in an email.</li>
</ul>
<p>All requests are free of charge, except in rare cases of manifestly unfounded or excessive requests (for example clearly repetitive ones), where the law allows us to charge a reasonable fee or refuse.</p>

<h2>Proving it's really you</h2>
<p>To protect your account we may need to verify your identity before we act on a request — for example by asking you to reply from the email on your account, or to answer a security question. We won't ask for anything more than we need.</p>

<h2>How to contact us</h2>
<ul>
  <li>Email: <a href="mailto:${privacyEmail}">${privacyEmail}</a></li>
  <li>Data controller: Online Spirits Club, Ireland</li>
</ul>
<p>Please email us from the address on your account whenever possible — it speeds up verification.</p>

<h2>If you're not happy</h2>
<p>If we haven't handled your request the way you expected, first please reply to us so we can put it right. You also have the right to complain to a data-protection supervisory authority at any time:</p>
<ul>
  <li>Ireland (our lead authority): <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">Data Protection Commission — dataprotection.ie</a></li>
  <li>UK: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">Information Commissioner's Office — ico.org.uk</a></li>
  <li>Other EU countries: your national supervisory authority — see the <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer">list on the European Data Protection Board website</a>.</li>
</ul>

<p>For the full picture of how we handle personal data, see our <a href="/privacy">Privacy Policy</a>. For the rules that govern using the Service, see our <a href="/terms">Terms of Service</a>. For cookies, see our <a href="/cookies">Cookie Policy</a>.</p>
`.trim();

const doc = {
  id: randomUUID(),
  title: 'Data Rights',
  slug: 'data-rights',
  seoTitle: 'Data Rights · Online Spirits Club',
  seoDescription: 'Your GDPR rights at Online Spirits Club — access, correct, delete, export your data, withdraw newsletter consent. Plain-English instructions and response times.',
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
  const existing = await db.collection('pages').findOne({ slug: 'data-rights' });
  if (existing && !force) {
    console.log(`ℹ  A page with slug "data-rights" already exists (id=${existing.id}). Skipping.`);
    console.log('   Run with FORCE=1 to overwrite the stored HTML.');
  } else if (existing && force) {
    await db.collection('pages').updateOne(
      { slug: 'data-rights' },
      { $set: { ...doc, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } }
    );
    console.log(`✔  Updated data-rights page (id=${existing.id}) in database "${DB_NAME}".`);
  } else {
    await db.collection('pages').insertOne(doc);
    console.log(`✔  Inserted data-rights page (id=${doc.id}) into database "${DB_NAME}".`);
  }
  console.log(`   Visible at: ${siteUrl}/data-rights`);
} catch (e) {
  console.error('✖  Failed:', e.message);
  process.exit(1);
} finally {
  await client.close();
}
