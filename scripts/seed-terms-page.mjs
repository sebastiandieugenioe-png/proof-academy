// One-off seed for the Terms of Service at /terms.
// Idempotent: safe to re-run. FORCE=1 overwrites the stored HTML if the page
// already exists (useful after editing this file).
//
// Usage:
//   node scripts/seed-terms-page.mjs           # only create if missing
//   FORCE=1 node scripts/seed-terms-page.mjs   # overwrite existing content
//
// After insertion the page is:
//   - Live at /terms
//   - SEO indexable (title, description, canonical, OG, Twitter)
//   - Editable from Admin → Pages

import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Load .env manually.
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

const contactEmail = 'onlinespiritsclub@gmail.com';
const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
const lastUpdated = new Date().toISOString().slice(0, 10);

const contentHtml = `
<p><em>Last updated: ${lastUpdated}</em></p>

<p>Welcome to <strong>Online Spirits Club</strong>. These Terms of Service (“Terms”) govern your access to and use of our website ${siteUrl} and any related services (together, the “Service”). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, please do not use the Service.</p>

<h2>1. Who we are</h2>
<p>The Service is operated by Online Spirits Club, based in Ireland. In these Terms, “we”, “us” and “our” refer to Online Spirits Club, and “you” refers to the user of the Service.</p>
<p>Contact: <a href="mailto:${contactEmail}">${contactEmail}</a></p>

<h2>2. Age and eligibility</h2>
<p>The Service is intended for adults working in, studying, or interested in the hospitality industry. To use the Service you must:</p>
<ul>
  <li>Be at least <strong>18 years old</strong>, OR the legal drinking age in your country of residence, whichever is higher.</li>
  <li>Have the legal capacity to enter into these Terms.</li>
  <li>Not be barred from using the Service under the laws of Ireland, the European Union, or your country of residence.</li>
</ul>
<p>By creating an account, you confirm that you meet these requirements. We reserve the right to suspend or delete any account we reasonably believe does not meet them.</p>

<h2>3. Educational purpose only</h2>
<p>Online Spirits Club is an <strong>educational platform</strong>. Our courses, lessons, flashcards and quizzes cover spirits, cocktails, beer, wine and hospitality. The content is provided for informational and professional-development purposes only.</p>
<p>Nothing on the Service:</p>
<ul>
  <li>Encourages or promotes the excessive or irresponsible consumption of alcohol.</li>
  <li>Constitutes medical, legal, or professional advice.</li>
  <li>Guarantees any specific career, employment, or certification outcome.</li>
</ul>

<h2>4. Responsible consumption</h2>
<p>Alcohol should be enjoyed responsibly, and only where legal. You are solely responsible for how you apply what you learn on the Service. In particular:</p>
<ul>
  <li>Never drink and drive.</li>
  <li>Do not consume alcohol if you are pregnant, taking incompatible medication, or have a health condition made worse by alcohol.</li>
  <li>Respect the drinking age and licensing laws of your country and any country you visit.</li>
  <li>If you or someone you know is struggling with alcohol, seek help from a qualified health professional or a recognised organisation such as <a href="https://www.who.int/health-topics/alcohol" target="_blank" rel="noopener noreferrer">the World Health Organization</a>.</li>
</ul>
<p><strong>We accept no responsibility for the physical or legal consequences of decisions you make about consuming or serving alcohol.</strong></p>

<h2>5. Your account</h2>
<ul>
  <li>You must provide accurate registration information (email, password, country, city, professional role).</li>
  <li>You are responsible for keeping your password confidential. Do not share it with anyone.</li>
  <li>You are responsible for all activity that takes place under your account.</li>
  <li>Notify us immediately at <a href="mailto:${contactEmail}">${contactEmail}</a> if you suspect any unauthorised use of your account.</li>
  <li>One account per person. Do not create multiple accounts, transfer your account, or let anyone else use it.</li>
</ul>

<h2>6. Acceptable use</h2>
<p>When using the Service, you agree not to:</p>
<ul>
  <li>Break any law, regulation, or third-party right.</li>
  <li>Post content that is unlawful, defamatory, obscene, threatening, discriminatory or infringes intellectual property.</li>
  <li>Promote irresponsible drinking, drink-driving, or the sale of alcohol to minors.</li>
  <li>Attempt to bypass, disable, or interfere with any security or authentication mechanism.</li>
  <li>Reverse-engineer, scrape, spider, or automate access without our written permission.</li>
  <li>Use the Service to send spam, malware, or unsolicited communications.</li>
  <li>Impersonate any person or misrepresent your affiliation with a person or entity.</li>
</ul>

<h2>7. User-generated content (comments)</h2>
<p>The Service lets you post comments on lessons. You keep ownership of what you post, but by submitting a comment you grant us a <strong>non-exclusive, royalty-free, worldwide, transferable licence</strong> to host, display, reproduce, adapt and distribute that comment for the purpose of operating and promoting the Service.</p>
<p>You are responsible for the comments you post. You confirm that:</p>
<ul>
  <li>You have the right to post the content.</li>
  <li>The content does not violate any law or third-party right.</li>
  <li>The content complies with Section 6 (Acceptable use).</li>
</ul>
<p>We may — but are not obliged to — moderate, edit, hide, or remove any comment at our discretion. We are not liable for content posted by users.</p>

<h2>8. Intellectual property</h2>
<p>All content we provide — including course text, lesson structure, flashcards, quizzes, images, videos, logos, and the visual design of the Service — is owned by Online Spirits Club or our licensors and is protected by copyright, trademark and other intellectual-property laws.</p>
<p>Subject to your compliance with these Terms, we grant you a limited, personal, non-transferable, non-exclusive, revocable licence to access and use the Service for your own educational and professional development.</p>
<p>You may <strong>not</strong>:</p>
<ul>
  <li>Copy, redistribute, republish or sell any part of the Service without our written permission.</li>
  <li>Use our brand, name or logos in a way that suggests endorsement without permission.</li>
  <li>Remove or alter any copyright, trademark or attribution notices.</li>
</ul>
<p>If you believe your intellectual-property rights have been infringed on the Service, email <a href="mailto:${contactEmail}">${contactEmail}</a> with details and we will investigate.</p>

<h2>9. Fees</h2>
<p>The Service is currently free to use. If we introduce paid features in the future, we will publish the pricing and terms in advance and will never charge you without your explicit consent.</p>

<h2>10. Termination</h2>
<p>You may stop using the Service and delete your account at any time. See our <a href="/privacy">Privacy Policy</a> for how deletion is handled.</p>
<p>We may suspend or terminate your access, without notice, if we reasonably believe you have:</p>
<ul>
  <li>Breached these Terms;</li>
  <li>Created a security, legal or reputational risk for the Service or its users;</li>
  <li>Provided false registration information;</li>
  <li>Used the Service for a purpose that is fraudulent, illegal, or contrary to public order.</li>
</ul>
<p>On termination, your right to use the Service ends immediately. Sections that by their nature survive termination (for example intellectual property, disclaimers, limitation of liability, governing law) will remain in force.</p>

<h2>11. Availability, changes and beta features</h2>
<p>We aim to keep the Service available and up to date, but we do not guarantee that it will always be available, uninterrupted, or error-free. We may add, modify, replace or discontinue features at any time. Where a change materially affects your rights, we will give you reasonable notice.</p>

<h2>12. Disclaimer of warranties</h2>
<p>To the fullest extent permitted by law, the Service is provided <strong>“as is” and “as available”</strong>. We make no warranties, express or implied, about the accuracy, completeness, reliability, or fitness for a particular purpose of the Service or its content.</p>
<p>Nothing in this section limits or excludes any statutory rights that cannot be limited or excluded — including, where applicable, your rights as a consumer under EU consumer law.</p>

<h2>13. Limitation of liability</h2>
<p>To the maximum extent permitted by law:</p>
<ul>
  <li>We are not liable for any indirect, incidental, special, punitive or consequential loss or damage arising out of your use of the Service.</li>
  <li>We are not liable for loss of profits, revenue, business opportunity, data, goodwill, or any harm resulting from your consumption or service of alcohol.</li>
  <li>Our total aggregate liability to you for all claims arising out of or in connection with the Service is limited to <strong>EUR 100</strong> or the amount you paid us in the 12 months before the claim (whichever is greater).</li>
</ul>
<p>Nothing in these Terms excludes or limits liability for death or personal injury caused by our negligence, for fraud, or for any other liability that cannot be excluded or limited under Irish or EU consumer law. If you are a consumer resident in the EU or UK, you retain all mandatory consumer rights.</p>

<h2>14. Indemnity</h2>
<p>You agree to indemnify and hold us harmless from any claim, loss, liability or expense (including reasonable legal fees) arising from your breach of these Terms, your misuse of the Service, or your violation of any law or third-party right.</p>

<h2>15. Changes to these Terms</h2>
<p>We may update these Terms from time to time. When we make material changes we will update the “Last updated” date at the top and, where appropriate, notify you by email or by a notice on the Service. If you continue to use the Service after the updated Terms take effect, you accept the changes. If you do not accept them, you must stop using the Service and may delete your account.</p>

<h2>16. Governing law and dispute resolution</h2>
<p>These Terms are governed by the laws of <strong>Ireland</strong>, without regard to conflict-of-law rules. The courts of Ireland have exclusive jurisdiction to resolve any dispute arising out of or relating to these Terms, subject to the following:</p>
<ul>
  <li><strong>If you are a consumer</strong> resident in the EU, you retain the protection of the mandatory provisions of the consumer-protection laws of your country of habitual residence, and you may bring proceedings in the courts of that country.</li>
  <li>You may also use the European Commission's online dispute-resolution platform at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</li>
</ul>

<h2>17. Miscellaneous</h2>
<ul>
  <li><strong>Entire agreement:</strong> these Terms, together with our <a href="/privacy">Privacy Policy</a>, form the entire agreement between you and us.</li>
  <li><strong>Severability:</strong> if any provision is held invalid or unenforceable, the remaining provisions remain in full effect.</li>
  <li><strong>No waiver:</strong> our failure to enforce any right or provision is not a waiver of that right or provision.</li>
  <li><strong>Assignment:</strong> you may not assign these Terms without our written consent. We may assign them to an affiliate or in connection with a merger, acquisition or sale of assets.</li>
</ul>

<h2>18. Contact</h2>
<p>Questions or notices about these Terms? Reach us at:</p>
<ul>
  <li>Email: <a href="mailto:${contactEmail}">${contactEmail}</a></li>
  <li>Online Spirits Club, Ireland</li>
</ul>
`.trim();

const doc = {
  id: randomUUID(),
  title: 'Terms of Service',
  slug: 'terms',
  seoTitle: 'Terms of Service · Online Spirits Club',
  seoDescription: 'The terms that govern your use of Online Spirits Club — a free educational platform about spirits, cocktails, beer, wine and hospitality. Ireland-based, GDPR-aligned.',
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
  const existing = await db.collection('pages').findOne({ slug: 'terms' });
  if (existing && !force) {
    console.log(`ℹ  A page with slug "terms" already exists (id=${existing.id}). Skipping.`);
    console.log('   Run with FORCE=1 to overwrite the stored HTML.');
  } else if (existing && force) {
    await db.collection('pages').updateOne(
      { slug: 'terms' },
      { $set: { ...doc, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date() } }
    );
    console.log(`✔  Updated terms page (id=${existing.id}) in database "${DB_NAME}".`);
  } else {
    await db.collection('pages').insertOne(doc);
    console.log(`✔  Inserted terms page (id=${doc.id}) into database "${DB_NAME}".`);
  }
  console.log(`   Visible at: ${siteUrl}/terms`);
} catch (e) {
  console.error('✖  Failed:', e.message);
  process.exit(1);
} finally {
  await client.close();
}
