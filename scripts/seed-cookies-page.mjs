// One-off seed for the Cookie Policy at /cookies. GDPR + ePrivacy compliant.
// Idempotent: safe to re-run. FORCE=1 overwrites the stored HTML.
//
// Usage:
//   node scripts/seed-cookies-page.mjs
//   FORCE=1 node scripts/seed-cookies-page.mjs

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

const contactEmail = 'privacy@onlinespiritsclub.com';
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
const lastUpdated = new Date().toISOString().slice(0, 10);

const contentHtml = `
<p><em>Last updated: ${lastUpdated}</em></p>

<p>This Cookie Policy explains what cookies are, how <strong>Online Spirits Club</strong> uses them, what your rights are, and how you can change your choices at any time. It sits alongside our <a href="/privacy">Privacy Policy</a> and covers the ${siteUrl} website and any related learning tools (together, the “Service”).</p>

<p>We aim to comply with the EU ePrivacy Directive as implemented in Ireland (S.I. No. 336/2011), the EU General Data Protection Regulation (GDPR), and the UK equivalents.</p>

<h2>1. What are cookies?</h2>
<p>Cookies are small text files that a website places on your device. They are used for many things — keeping you signed in, remembering settings, measuring how a site is used, or delivering advertising. Similar technologies (such as local storage, session storage, pixels and SDKs) work in comparable ways; whenever we refer to “cookies” in this policy, we mean cookies and any of those similar technologies.</p>

<h2>2. Cookie categories</h2>
<p>Cookies are usually grouped into four categories. We only set cookies you have consented to, except for the strictly necessary ones which the law lets us set without consent.</p>

<h3>Essential cookies (strictly necessary)</h3>
<p>These cookies are required for the Service to work. Without them, you could not log in, keep your session, or securely browse. Under EU/UK law we do <strong>not</strong> need your consent to set them, but we still explain them clearly here.</p>
<ul>
  <li><strong>osc_user</strong> — a signed HTTP-only cookie that keeps you logged in after registering or signing in. Expires 30 days after your last visit.</li>
  <li><strong>osc_admin</strong> — a signed HTTP-only cookie used only while an administrator is logged in to the admin dashboard.</li>
</ul>

<h3>Preference cookies</h3>
<p>These cookies remember your choices — for example that you dismissed a banner or preferred a language. We currently do not use any preference cookies. If we add any (for example a cookie-banner "you've accepted the choices" flag), we will list them here.</p>

<h3>Analytics cookies</h3>
<p>Analytics cookies help us understand how visitors use the Service — which pages are popular, how long people stay, and where they get stuck — so we can improve the courses and the app. They are <strong>not</strong> essential; we only set them if you consent.</p>
<p>We do <strong>not currently</strong> use any analytics cookies. If we later add privacy-friendly analytics, for example <strong>Google Analytics 4</strong>, we will:</p>
<ul>
  <li>Ask for your consent through a cookie banner before setting any analytics cookie.</li>
  <li>List each analytics cookie here with its name, purpose, provider and lifetime.</li>
  <li>Anonymise IP addresses where the provider supports it and enable IP-anonymisation by default.</li>
  <li>Give you the ability to opt out at any time from a link in the footer.</li>
</ul>

<h3>Marketing / advertising cookies</h3>
<p>Marketing cookies build a profile of your interests so third parties (typically ad networks) can show you relevant advertising elsewhere on the internet. They are <strong>not</strong> essential; we only set them if you consent.</p>
<p>We do <strong>not currently</strong> use any marketing cookies. If we later add advertising tools, for example <strong>Google Ads</strong>, Meta Pixel, or similar, we will:</p>
<ul>
  <li>Ask for your explicit opt-in through the cookie banner before setting any marketing cookie.</li>
  <li>List each cookie here with its name, purpose, provider, and lifetime.</li>
  <li>Never bundle marketing consent with essential functionality — you will always be able to use the Service without accepting marketing cookies.</li>
</ul>

<h2>3. Newsletter and email integrations</h2>
<p>Our newsletter is <strong>opt-in only</strong>. You are only added if you tick the newsletter box during registration or later turn it on from your profile page. Every email includes an unsubscribe link.</p>
<p>We may in the future use an email-marketing provider such as <strong>Beehiiv</strong> to deliver our newsletter and measure whether emails are opened or clicked. If we do:</p>
<ul>
  <li>Only email addresses of people who explicitly opted in will be shared with the provider.</li>
  <li>Emails may contain a small tracking pixel and links wrapped for click measurement. These are set by the newsletter provider — not by our website — and only run <em>when you open the email</em>, not while you browse ${siteUrl}.</li>
  <li>You can unsubscribe at any time by clicking the link in any email, changing the newsletter setting on your profile, or emailing <a href="mailto:${contactEmail}">${contactEmail}</a>.</li>
  <li>We will keep this policy updated with the specific provider we use and its data-processing terms.</li>
</ul>

<h2>4. Your choices and rights</h2>
<p>When we introduce non-essential cookies, you will see a cookie banner where you can:</p>
<ul>
  <li><strong>Accept all</strong> — allow analytics and marketing cookies (if enabled).</li>
  <li><strong>Reject non-essential</strong> — keep only the strictly necessary cookies.</li>
  <li><strong>Manage preferences</strong> — enable or disable individual categories.</li>
</ul>
<p>You have the following rights in respect of cookies and any related personal data:</p>
<ul>
  <li><strong>Right to consent freely</strong> — refusing non-essential cookies will not degrade essential functionality.</li>
  <li><strong>Right to withdraw consent at any time</strong> — see Section 5 below.</li>
  <li><strong>Right to access, rectification, erasure, portability, objection and restriction</strong> — as described in our <a href="/privacy">Privacy Policy</a>.</li>
  <li><strong>Right to lodge a complaint</strong> — with the Irish Data Protection Commission (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">dataprotection.ie</a>) or your local supervisory authority.</li>
</ul>

<h2>5. How to withdraw consent or change your choices</h2>
<p>You can change your mind at any time. Here are the ways to do it:</p>
<ul>
  <li><strong>From the cookie banner</strong> — once non-essential cookies are introduced, a "Cookie preferences" link will appear in the footer of every page. Click it to reopen the banner and change your choices.</li>
  <li><strong>From your browser</strong> — most browsers let you block or delete cookies at any time (Chrome, Safari, Firefox, Edge, Brave, Opera). Doing this will not sign you out immediately, but it may sign you out when the session cookie expires.</li>
  <li><strong>By emailing us</strong> — write to <a href="mailto:${contactEmail}">${contactEmail}</a> and we will process your request.</li>
</ul>
<p>Withdrawing consent does not affect the lawfulness of processing carried out before you withdrew it.</p>

<h2>6. Third-party cookies</h2>
<p>The essential cookies listed above are set by us (first-party). If in the future we add analytics or advertising tools, the corresponding cookies may be set by third parties (Google, Meta, Beehiiv, etc.) on their own domains. In that case:</p>
<ul>
  <li>The third party acts as either a data controller (for its own purposes) or a processor (on our instructions), depending on the tool. We will make this clear when we introduce each provider.</li>
  <li>You will always be able to review — and reject — those cookies via our cookie banner.</li>
  <li>Where the provider is located outside the EEA or UK, we will rely on adequacy decisions or Standard Contractual Clauses to protect your data.</li>
</ul>

<h2>7. Do Not Track and Global Privacy Control</h2>
<p>Some browsers send a "Do Not Track" (DNT) or "Global Privacy Control" (GPC) signal. There is no common industry standard for interpreting DNT, but we will not set analytics or marketing cookies unless you have given consent — regardless of your browser signal. Where the GPC signal is present we will treat it as an opt-out request for the purposes of any applicable law.</p>

<h2>8. Retention</h2>
<ul>
  <li><strong>osc_user</strong> — up to 30 days after your last visit; deleted when you log out.</li>
  <li><strong>osc_admin</strong> — up to 12 hours; deleted when the admin logs out.</li>
  <li>Any future analytics / marketing cookies — retention will be listed alongside the cookie in this policy before they are set.</li>
</ul>

<h2>9. Changes to this Cookie Policy</h2>
<p>We may update this policy when we add or remove cookies, when a provider changes its terms, or when the law changes. The "Last updated" date at the top always shows the latest revision. Where the change is material — for example we start using analytics or advertising cookies — we will also show a cookie banner asking for your consent before setting them.</p>

<h2>10. Contact</h2>
<p>Questions about cookies or how we use them? Contact us at:</p>
<ul>
  <li>Email: <a href="mailto:${contactEmail}">${contactEmail}</a></li>
  <li>Data controller: Online Spirits Club, Ireland</li>
</ul>
<p>See also our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.</p>
`.trim();

const doc = {
  id: randomUUID(),
  title: 'Cookie Policy',
  slug: 'cookies',
  seoTitle: 'Cookie Policy · Online Spirits Club',
  seoDescription: 'How Online Spirits Club uses cookies and similar technologies. GDPR and ePrivacy compliant. Essential, analytics and marketing cookies explained in plain English.',
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
  const existing = await db.collection('pages').findOne({ slug: 'cookies' });
  if (existing && !force) {
    console.log(`ℹ  A page with slug "cookies" already exists (id=${existing.id}). Skipping.`);
    console.log('   Run with FORCE=1 to overwrite the stored HTML.');
  } else if (existing && force) {
    await db.collection('pages').updateOne(
      { slug: 'cookies' },
      { $set: { ...doc, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } }
    );
    console.log(`✔  Updated cookies page (id=${existing.id}) in database "${DB_NAME}".`);
  } else {
    await db.collection('pages').insertOne(doc);
    console.log(`✔  Inserted cookies page (id=${doc.id}) into database "${DB_NAME}".`);
  }
  console.log(`   Visible at: ${siteUrl}/cookies`);
} catch (e) {
  console.error('✖  Failed:', e.message);
  process.exit(1);
} finally {
  await client.close();
}
