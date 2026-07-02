// One-off seed for the GDPR-compliant Privacy Policy at /privacy.
// Idempotent: run this any number of times — it upserts by slug. Safe to re-run
// after editing the HTML below; existing DB edits made via Admin → Pages are
// preserved unless you pass FORCE=1 as an env var.
//
// Usage:
//   node scripts/seed-privacy-page.mjs           # only create if missing
//   FORCE=1 node scripts/seed-privacy-page.mjs   # overwrite existing content
//
// This script requires MONGO_URL (from /app/.env). The page will be immediately
// visible at /privacy after insertion (SSR + admin-editable).

import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Load .env manually (no dotenv dep required).
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

const contactEmail = 'privacy@onlinespiritsclub.com';
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
const lastUpdated = new Date().toISOString().slice(0, 10);

const contentHtml = `
<p><em>Last updated: ${lastUpdated}</em></p>

<p>This Privacy Policy explains how <strong>Online Spirits Club</strong> (“we”, “us”, “our”) collects, uses and protects your personal data. We are based in Ireland and serve learners primarily across the European Union and the United Kingdom. We take your privacy seriously and comply with the EU General Data Protection Regulation (GDPR) and the UK GDPR.</p>

<h2>1. Who we are</h2>
<p>Online Spirits Club is a free educational platform about spirits, cocktails, beer, wine and hospitality. We operate the website ${siteUrl} and the associated learning tools. For the purposes of GDPR, we are the <strong>data controller</strong> of the personal data described in this policy.</p>
<p>If you have questions or want to exercise any of your rights, contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>

<h2>2. Data we collect</h2>
<h3>Data you give us</h3>
<ul>
  <li><strong>Account details:</strong> email address, password (stored as a bcrypt hash — we never see it), display name.</li>
  <li><strong>Profile:</strong> country, city and professional role (for example bartender, waiter, sommelier, student).</li>
  <li><strong>Newsletter status:</strong> whether you opted in to our email newsletter. This is always optional.</li>
  <li><strong>Learning activity:</strong> lesson progress, flashcard reviews, quiz scores and minutes studied.</li>
  <li><strong>Comments:</strong> anything you post publicly on lesson pages.</li>
  <li><strong>Support messages:</strong> the content of any email or message you send us.</li>
</ul>
<h3>Data we collect automatically</h3>
<ul>
  <li><strong>Technical data:</strong> a rough IP address (used only for security rate-limiting), browser type and basic device information.</li>
  <li><strong>Session cookie:</strong> a signed <code>osc_user</code> HTTP-only cookie that keeps you logged in.</li>
</ul>
<p>We do <strong>not</strong> use advertising cookies, third-party trackers, or behavioural profiling.</p>

<h2>3. Why we process your data (purpose)</h2>
<ul>
  <li><strong>Provide the service:</strong> create your account, save your progress, deliver lessons and study reviews.</li>
  <li><strong>Personalise learning:</strong> show you the right cards at the right time using spaced repetition.</li>
  <li><strong>Security:</strong> detect abuse, rate-limit login attempts, protect accounts.</li>
  <li><strong>Communicate:</strong> send transactional emails (password resets, essential account notices) and — <em>only if you opt in</em> — our newsletter.</li>
  <li><strong>Improve the platform:</strong> understand aggregate usage patterns to improve courses and features.</li>
  <li><strong>Legal compliance:</strong> comply with legal obligations we are subject to.</li>
</ul>

<h2>4. Legal basis under GDPR</h2>
<p>We rely on the following legal bases (Article 6 GDPR):</p>
<ul>
  <li><strong>Contract (Art. 6(1)(b)):</strong> to create and manage your account and deliver the learning service you signed up for.</li>
  <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> to keep the platform secure, prevent fraud and abuse, and improve our courses. We balance these interests against your rights.</li>
  <li><strong>Consent (Art. 6(1)(a)):</strong> for the newsletter and any other optional communications. You can withdraw consent at any time without affecting past processing.</li>
  <li><strong>Legal obligation (Art. 6(1)(c)):</strong> when we must retain records or respond to lawful requests.</li>
</ul>

<h2>5. Sharing your data</h2>
<p>We do not sell your personal data. We only share it with:</p>
<ul>
  <li><strong>Infrastructure providers</strong> who host the platform on our behalf (databases, hosting, email delivery). They act as processors under contract and may only process data on our instructions.</li>
  <li><strong>Authorities</strong> where required by law or valid legal process.</li>
</ul>
<p>Where any processor is located outside the EEA or UK, we use appropriate safeguards such as Standard Contractual Clauses to protect your data.</p>

<h2>6. Data retention</h2>
<ul>
  <li><strong>Account data</strong> is kept while your account is active.</li>
  <li><strong>Learning progress, flashcards, quiz results and comments</strong> are kept while your account is active so we can continue delivering personalised study.</li>
  <li><strong>Newsletter subscriptions</strong> are kept until you unsubscribe.</li>
  <li><strong>Security logs</strong> (IP addresses used for rate-limiting) are kept for a maximum of 30 days.</li>
  <li><strong>After account deletion</strong> we remove your personal data within 30 days, except where we are legally required to keep certain records (for example basic proof of consent).</li>
</ul>

<h2>7. Your rights</h2>
<p>Under the GDPR you have the following rights:</p>
<ul>
  <li><strong>Right of access</strong> — request a copy of the personal data we hold about you.</li>
  <li><strong>Right to rectification</strong> — ask us to correct inaccurate or incomplete data. You can update most fields yourself from your profile page.</li>
  <li><strong>Right to erasure (“right to be forgotten”)</strong> — ask us to delete your account and personal data.</li>
  <li><strong>Right to data portability</strong> — request a machine-readable export of the data you provided to us.</li>
  <li><strong>Right to object</strong> — object to processing based on legitimate interests, including for direct marketing at any time.</li>
  <li><strong>Right to restrict processing</strong> — ask us to pause processing while a dispute is resolved.</li>
  <li><strong>Right to withdraw consent</strong> — for anything we do on the basis of your consent (for example the newsletter).</li>
  <li><strong>Right to lodge a complaint</strong> — with the Irish Data Protection Commission (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">dataprotection.ie</a>) or your local supervisory authority.</li>
</ul>
<p>To exercise any of these rights, email <a href="mailto:${contactEmail}">${contactEmail}</a>. We aim to respond within one month, as required by the GDPR.</p>

<h2>8. Cookies</h2>
<p>We use the minimum cookies required to operate the site:</p>
<ul>
  <li><strong>osc_user</strong> — a signed HTTP-only cookie that keeps you logged in. Expires after 30 days. Strictly necessary; no consent banner required.</li>
  <li><strong>osc_admin</strong> — a signed HTTP-only cookie used only when an administrator is logged in to the admin dashboard.</li>
</ul>
<p>We do not use analytics, advertising, or third-party tracking cookies. If we ever add any, we will ask for your consent before setting them.</p>

<h2>9. Newsletter</h2>
<p>Our newsletter is strictly optional. It is only sent to people who explicitly ticked the newsletter box during registration or later opted in from their profile. Every email includes an <strong>unsubscribe link</strong>. You can also unsubscribe at any time by emailing <a href="mailto:${contactEmail}">${contactEmail}</a> or by turning the newsletter setting off from your profile page.</p>

<h2>10. Security</h2>
<p>We take security seriously. We protect your data with:</p>
<ul>
  <li>HTTPS/TLS on all connections between your browser and our servers.</li>
  <li>Passwords hashed with bcrypt — even our engineers cannot read them.</li>
  <li>HTTP-only, SameSite-Lax, Secure signed session cookies (no session data in localStorage).</li>
  <li>Strict Content Security Policy, X-Frame-Options, HSTS and other security headers.</li>
  <li>Server-side authorisation on every user-scoped endpoint (session identity is never trusted from client input).</li>
  <li>Rate limiting on login, registration and password endpoints to prevent brute force.</li>
  <li>Input validation to prevent database injection and cross-site scripting.</li>
  <li>Least-privilege access controls for administrators.</li>
</ul>
<p>No system can be 100% secure, but we continually review and improve our controls. If you suspect a security issue, please email <a href="mailto:${contactEmail}">${contactEmail}</a> and we will investigate promptly.</p>

<h2>11. Children</h2>
<p>Online Spirits Club is intended for adults working in or studying hospitality. We do not knowingly collect data from anyone under 16. If you believe a child has created an account, please contact us and we will remove it.</p>

<h2>12. International users</h2>
<p>The service is provided from Ireland (EU). If you access it from outside the EU or UK, you understand that your data will be processed in the EU. We rely on adequacy decisions or Standard Contractual Clauses when necessary.</p>

<h2>13. Changes to this policy</h2>
<p>We may update this policy from time to time. When we make material changes we will update the “Last updated” date at the top and, where appropriate, notify you by email. Continued use of the service after changes take effect means you accept the updated policy.</p>

<h2>14. Contact</h2>
<p>Questions, requests or complaints about privacy? Contact us at:</p>
<ul>
  <li>Email: <a href="mailto:${contactEmail}">${contactEmail}</a></li>
  <li>Data controller: Online Spirits Club, Ireland</li>
</ul>
<p>You always have the right to lodge a complaint with the Irish Data Protection Commission (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">dataprotection.ie</a>) or the supervisory authority in your country.</p>
`.trim();

const doc = {
  id: randomUUID(),
  title: 'Privacy Policy',
  slug: 'privacy',
  seoTitle: 'Privacy Policy · Online Spirits Club',
  seoDescription: 'How Online Spirits Club collects, uses and protects your personal data. GDPR-compliant. Data controller based in Ireland.',
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
  const existing = await db.collection('pages').findOne({ slug: 'privacy' });
  if (existing && !force) {
    console.log(`ℹ  A page with slug "privacy" already exists (id=${existing.id}). Skipping.`);
    console.log('   Run with FORCE=1 to overwrite the stored HTML.');
  } else if (existing && force) {
    await db.collection('pages').updateOne(
      { slug: 'privacy' },
      { $set: { ...doc, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } }
    );
    console.log(`✔  Updated privacy page (id=${existing.id}) in database "${DB_NAME}".`);
  } else {
    await db.collection('pages').insertOne(doc);
    console.log(`✔  Inserted privacy page (id=${doc.id}) into database "${DB_NAME}".`);
  }
  console.log(`   Visible at: ${siteUrl}/privacy`);
} catch (e) {
  console.error('✖  Failed:', e.message);
  process.exit(1);
} finally {
  await client.close();
}
