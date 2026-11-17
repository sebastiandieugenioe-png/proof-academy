// Central data module for all legal / info pages.
// Used by:
//   - Individual seed scripts (scripts/seed-*.mjs) [kept for local backfill]
//   - The admin-only bulk-seed endpoint (POST /api/admin/seed-legal-pages)
//     which lets an admin populate a fresh production database in one click.
//
// To edit copy: edit the strings in `PAGES` below OR edit any page via
// Admin → Pages after seeding (the endpoint upserts by slug so a re-run
// with FORCE=1 overwrites, and Admin edits are preserved otherwise).

const contactEmail   = 'hello@onlinespiritsclub.com';
const privacyEmail   = 'hello@onlinespiritsclub.com';
const supportEmail   = 'hello@onlinespiritsclub.com';
const contentEmail   = 'hello@onlinespiritsclub.com';

function siteUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
}
function today() { return new Date().toISOString().slice(0, 10); }

// -- Privacy --------------------------------------------------------------
function privacyHtml() {
  const site = siteUrl(); const d = today();
  return `<p><em>Last updated: ${d}</em></p>
<p>This Privacy Policy explains how <strong>Online Spirits Club</strong> ("we", "us", "our") collects, uses and protects your personal data. We are based in Ireland and serve learners primarily across the European Union and the United Kingdom. We comply with the EU General Data Protection Regulation (GDPR) and the UK GDPR.</p>
<h2>1. Who we are</h2><p>Online Spirits Club operates ${site} and the associated learning tools. For the purposes of GDPR, we are the <strong>data controller</strong>. Contact: <a href="mailto:${privacyEmail}">${privacyEmail}</a>.</p>
<h2>2. Data we collect</h2><h3>Data you give us</h3><ul><li><strong>Account details:</strong> email, password (bcrypt hash — never plaintext), display name.</li><li><strong>Profile:</strong> country, city, professional role.</li><li><strong>Newsletter status:</strong> whether you opted in. Always optional.</li><li><strong>Learning activity:</strong> lesson progress, flashcard reviews, quiz scores, minutes studied.</li><li><strong>Comments:</strong> anything you post publicly on lesson pages.</li><li><strong>Support messages:</strong> the content of emails you send us.</li></ul><h3>Data we collect automatically</h3><ul><li><strong>Technical:</strong> rough IP (rate-limiting only), browser and basic device info.</li><li><strong>Session cookie:</strong> signed <code>osc_user</code> HTTP-only cookie.</li></ul><h3>Advertising</h3><p>The Service is free and funded by ads served by <strong>Google AdSense</strong>. Google and its partners use cookies to serve and measure ads, including ads based on your previous visits to this and other websites. In the EU/EEA and UK these cookies are only set after you give consent in our cookie banner, and you can change your choice at any time. Google acts as an independent controller for this data. See <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">How Google uses information from sites that use its services</a>. You can turn off personalised ads at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ad Settings</a>.</p>
<h2>3. Why we process your data</h2><ul><li>Provide the service and personalise learning with spaced repetition.</li><li>Security: detect abuse, rate-limit logins, protect accounts.</li><li>Communicate: transactional emails and — <em>only if you opt in</em> — the newsletter.</li><li>Improve the platform using aggregate usage patterns.</li><li>Comply with legal obligations.</li></ul>
<h2>4. Legal basis under GDPR</h2><ul><li><strong>Contract (Art. 6(1)(b)):</strong> to run your account and deliver the service.</li><li><strong>Legitimate interests (Art. 6(1)(f)):</strong> security, fraud prevention, improvements.</li><li><strong>Consent (Art. 6(1)(a)):</strong> newsletter and other optional comms — withdraw any time.</li><li><strong>Legal obligation (Art. 6(1)(c)):</strong> where required.</li></ul>
<h2>5. Sharing your data</h2><p>We never sell your data. We share only with infrastructure/email processors under contract (SCCs where non-EEA), with Google for advertising as described in Section 2 (only with your consent where required), or with authorities where legally required.</p>
<h2>6. Data retention</h2><ul><li>Account, progress, flashcards, quiz results, comments — while your account is active.</li><li>Newsletter — until you unsubscribe.</li><li>Security logs — max 30 days.</li><li>After account deletion — removed within 30 days (except minimal records required by law).</li></ul>
<h2>7. Your rights</h2><p>Under the GDPR you have the right to <strong>access</strong>, <strong>rectification</strong>, <strong>erasure</strong>, <strong>portability</strong>, <strong>objection</strong>, <strong>restrict processing</strong>, <strong>withdraw consent</strong>, and to <strong>lodge a complaint</strong> with the Irish Data Protection Commission (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">dataprotection.ie</a>). See <a href="/data-rights">Data Rights</a> for step-by-step instructions. Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> — we reply within one month.</p>
<h2>8. Cookies</h2><ul><li><strong>osc_user</strong> — signed HTTP-only session, 30 days.</li><li><strong>osc_admin</strong> — signed admin session while an admin is logged in.</li><li><strong>osc_vid, osc_sid, osc_ft, osc_lt</strong> — first-party cookies that record which link or campaign brought you to the site (no personal profile). Set only if you consent in the cookie banner.</li><li><strong>osc_consent</strong> — remembers that you gave that consent (180 days).</li><li><strong>Google advertising cookies</strong> — set by Google AdSense, only with your consent.</li></ul><p>Full details in our <a href="/cookies">Cookie Policy</a>.</p>
<h2>9. Newsletter</h2><p>Strictly opt-in. Every email includes an unsubscribe link. You can also toggle it off from your profile or email <a href="mailto:${privacyEmail}">${privacyEmail}</a>.</p>
<h2>10. Security</h2><ul><li>HTTPS/TLS everywhere.</li><li>Passwords hashed with bcrypt.</li><li>HTTP-only, SameSite=Lax, Secure signed session cookies (never localStorage).</li><li>Strict CSP, X-Frame-Options, HSTS and other security headers.</li><li>Server-side authorisation — session identity never trusted from client input.</li><li>Rate limiting on login, register, and password endpoints.</li><li>Strict input validation to prevent injection and XSS.</li></ul>
<h2>11. Children</h2><p>Intended for adults working in or studying hospitality. We do not knowingly collect data from anyone under 16.</p>
<h2>12. International users</h2><p>Provided from Ireland (EU). Non-EEA processors use SCCs.</p>
<h2>13. Changes</h2><p>Material changes will be flagged by updating the date above and, where appropriate, by email.</p>
<h2>14. Contact</h2><p>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a>. Data controller: Online Spirits Club, Ireland. Complaint route: <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">dataprotection.ie</a>.</p>`;
}

// -- Terms ----------------------------------------------------------------
function termsHtml() {
  const site = siteUrl(); const d = today();
  return `<p><em>Last updated: ${d}</em></p>
<p>Welcome to <strong>Online Spirits Club</strong>. These Terms of Service ("Terms") govern your use of ${site} (the "Service"). By creating an account you accept these Terms. If you do not agree, please do not use the Service.</p>
<h2>1. Who we are</h2><p>Operated by Online Spirits Club, based in Ireland. Contact: <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
<h2>2. Age and eligibility</h2><ul><li>Be at least <strong>18 years old</strong>, OR the legal drinking age in your country of residence — whichever is higher.</li><li>Have the legal capacity to enter into these Terms.</li><li>Not be barred from using the Service under Irish, EU or your local law.</li></ul>
<h2>3. Educational purpose only</h2><p>The Service is <strong>educational</strong>. Nothing on it encourages excessive or irresponsible drinking, constitutes medical/legal advice, or guarantees a career or certification outcome.</p>
<h2>4. Responsible consumption</h2><p>You are responsible for how you apply what you learn. Never drink and drive. Do not consume alcohol if pregnant, on incompatible medication, or with a condition made worse by alcohol. Respect the licensing laws of your country and any country you visit. If you or someone you know is struggling with alcohol, seek qualified help.</p><p><strong>We accept no responsibility for the physical or legal consequences of decisions you make about consuming or serving alcohol.</strong></p>
<h2>5. Your account</h2><ul><li>Provide accurate registration information.</li><li>Keep your password confidential.</li><li>You are responsible for all activity under your account.</li><li>Notify <a href="mailto:${supportEmail}">${supportEmail}</a> of any unauthorised use.</li><li>One account per person; no transfer or sharing.</li></ul>
<h2>6. Acceptable use</h2><p>You agree not to break the law, post unlawful/defamatory/obscene/discriminatory content, promote irresponsible drinking or underage sales, bypass security, scrape, impersonate anyone, or send spam/malware.</p>
<h2>7. User-generated content (comments)</h2><p>You keep ownership of what you post. By submitting a comment you grant us a non-exclusive, royalty-free, worldwide, transferable licence to host, display and distribute it as part of the Service. You confirm you have the right to post it and that it does not violate any law. We may moderate, edit, hide or remove any comment at our discretion.</p>
<h2>8. Intellectual property</h2>
<p><strong>What we own.</strong> All educational materials on Online Spirits Club — including course text, lessons, mini-lessons, flashcards, quizzes, embedded questions, illustrations, our logo and the overall look and feel — belong to Online Spirits Club or our licensors, unless we clearly credit a different author or source next to the material.</p>
<p><strong>What third parties own.</strong> Where we quote or embed content from a third party (a public-domain photograph, a manufacturer's tasting note, a Creative-Commons article, an academic paper, etc.), that content stays the property of its original owner. We rely on the relevant exceptions and limitations under EU copyright law — in particular the quotation right and teaching/research exceptions under Directive 2001/29/EC and Directive (EU) 2019/790 — and we credit the source wherever possible. If you are a rights-holder and think we have used your material incorrectly, email <a href="mailto:${supportEmail}">${supportEmail}</a> and we will act promptly.</p>
<p><strong>Educational use is encouraged.</strong> Within reasonable limits and for non-commercial learning, you are free to:</p>
<ul>
  <li>read, print or save lessons for your personal study;</li>
  <li>quote short excerpts of a lesson (with a link back to the source page) in essays, blog posts, social media or presentations — the standard EU quotation right;</li>
  <li>use our flashcards or a small number of quiz questions in a classroom or informal training session for non-commercial teaching purposes;</li>
  <li>share the link to a public lesson (<code>/learn/&hellip;</code>) freely.</li>
</ul>
<p><strong>What you may not do without written permission.</strong> You may not:</p>
<ul>
  <li>redistribute, republish or resell paid or proprietary materials — whether free-of-charge or for a fee — in any format (PDF, e-book, video, LMS export, etc.);</li>
  <li>copy substantial portions of the platform (lessons, flashcard decks, quiz banks, code, design) to build a competing product or service;</li>
  <li>strip out author, source or credit lines from any material you reuse;</li>
  <li>use our name, logo or brand in a way that suggests endorsement, partnership or accreditation where none exists.</li>
</ul>
<p><strong>Need a licence?</strong> If you want to reuse our material for a course, book, article, workshop or professional certification — or if you are a school, university, bar programme or non-profit — just email <a href="mailto:${supportEmail}">${supportEmail}</a>. Reasonable educational requests are usually granted at no cost.</p>
<p><strong>Your content stays yours.</strong> You keep ownership of comments and any user-generated content you post — see <em>Section 7</em>. Nothing in this section limits your statutory rights under EU copyright exceptions for private use, quotation, teaching, research, parody or accessibility.</p>
<h2>9. Fees</h2><p>The Service is free. Any future paid feature will require your explicit consent.</p>
<h2>10. Termination</h2><p>You may delete your account at any time. See <a href="/privacy">Privacy Policy</a>. We may suspend or terminate for breach, false registration, or misuse. Sections that by their nature survive (IP, disclaimers, liability, governing law) remain in force.</p>
<h2>11. Availability</h2><p>We aim to be reliable but do not guarantee uninterrupted operation. Features may be added, changed, or removed with reasonable notice for material changes.</p>
<h2>12. Disclaimer</h2><p>To the fullest extent permitted by law, the Service is provided <strong>"as is" and "as available"</strong>. Statutory rights (including EU consumer rights) that cannot be excluded remain in force.</p>
<h2>13. Limitation of liability</h2><p>To the maximum extent permitted by law: no indirect, incidental, special or consequential damages; no liability for lost profits, revenue, data, goodwill, or harm from alcohol consumption or service. Total aggregate liability capped at <strong>€100</strong> or the amount you paid us in the 12 months before the claim (whichever is greater). Nothing excludes liability for death or personal injury caused by our negligence, for fraud, or where the law does not permit exclusion. EU/UK consumer mandatory rights preserved.</p>
<h2>14. Indemnity</h2><p>You indemnify us against any claim arising from your breach of these Terms or misuse of the Service.</p>
<h2>15. Changes</h2><p>Material changes will be flagged by updating the date above and, where appropriate, by email. Continued use after changes take effect is acceptance.</p>
<h2>16. Governing law</h2><p>These Terms are governed by the laws of <strong>Ireland</strong>. Irish courts have jurisdiction, subject to: (a) consumers in the EU keep the protection of their local mandatory consumer laws and may sue in their country's courts; (b) the EU ODR platform is available at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</p>
<h2>17. Miscellaneous</h2><ul><li>Entire agreement (with <a href="/privacy">Privacy Policy</a>).</li><li>Severability.</li><li>No waiver.</li><li>You may not assign without our consent.</li></ul>
<h2>18. Contact</h2><p>Email <a href="mailto:${supportEmail}">${supportEmail}</a>. Online Spirits Club, Ireland.</p>`;
}

// -- Cookies --------------------------------------------------------------
function cookiesHtml() {
  const site = siteUrl(); const d = today();
  return `<p><em>Last updated: ${d}</em></p>
<p>This Cookie Policy explains what cookies are, how <strong>Online Spirits Club</strong> uses them, and how you can change your choices. It sits alongside our <a href="/privacy">Privacy Policy</a> and covers ${site}. We comply with the EU ePrivacy Directive (Irish S.I. 336/2011), the GDPR, and the UK equivalents.</p>
<h2>1. What are cookies?</h2><p>Small text files a website places on your device. Similar technologies (local storage, pixels, SDKs) work the same way; we call them all "cookies" here.</p>
<h2>2. Cookie categories</h2>
<h3>Essential cookies (strictly necessary)</h3><p>Required for the Service to work. No consent required by law.</p><ul><li><strong>osc_user</strong> — signed HTTP-only cookie that keeps you logged in. Expires 30 days after last visit.</li><li><strong>osc_admin</strong> — signed HTTP-only cookie used only while an administrator is logged in.</li></ul>
<h3>Attribution cookies (first-party, only with your consent)</h3><p>If you consent in the cookie banner (consent to store and access information on your device), we set four first-party cookies to understand which links and campaigns (for example our social media videos) bring visitors to the site. They contain a random id and the campaign tags of the link you followed — no name, email or browsing profile. If you refuse or later withdraw consent, they are not set and any existing ones are deleted. A fifth cookie, <strong>osc_consent</strong> (180 days), simply remembers that you consented.</p><ul><li><strong>osc_vid</strong> — random visitor id, 30 days.</li><li><strong>osc_sid</strong> — random visit id, 30 minutes.</li><li><strong>osc_ft</strong> / <strong>osc_lt</strong> — first and latest campaign that brought you here, 30 days.</li></ul>
<h3>Preference cookies</h3><p>We currently don't use any. If we add any (e.g. remembering a dismissed banner) they will be listed here.</p>
<h3>Analytics cookies</h3><p>Not essential; we only set them with your consent. We do <strong>not currently</strong> use any. If we later add privacy-friendly analytics — for example <strong>Google Analytics 4</strong> — we will: ask for consent via a banner; list each cookie here with name, purpose, provider, lifetime; anonymise IPs; give you an opt-out link in the footer.</p>
<h3>Advertising cookies (Google AdSense)</h3><p>The Service is free and funded by ads from <strong>Google AdSense</strong>. Google and its partners use cookies (for example <code>__gads</code>, <code>__gpi</code>, <code>IDE</code>) to show ads, limit how often you see them, measure performance and — if you allow it — personalise ads based on your visits to this and other websites. In the EU/EEA and UK, Google's certified consent banner asks for your choice before these cookies are set; if you decline, you may still see non-personalised or limited ads. Refusing never blocks access to the lessons. Google acts as an independent controller: see <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">How Google uses information from sites that use its services</a> and manage personalised ads at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ad Settings</a>.</p>
<h2>3. Newsletter and email integrations</h2><p>Our newsletter is <strong>opt-in only</strong>. If we later use a provider such as <strong>Beehiiv</strong> to deliver it: only opted-in emails will be shared; emails may contain a small tracking pixel and wrapped links; these fire <em>only when you open the email</em>, not while you browse ${site}. Unsubscribe any time via the link in any email, your profile toggle, or by emailing <a href="mailto:${privacyEmail}">${privacyEmail}</a>.</p>
<h2>4. Your choices and rights</h2><p>Before any non-essential cookie is set, a consent banner lets you consent, refuse, or manage your choices by purpose. You always have the right to consent freely, withdraw consent at any time (Section 5), access/rectify/erase/port your data, object to processing, and complain to the <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">Irish DPC</a> or your local supervisory authority.</p>
<h2>5. Withdraw consent</h2><ul><li>Reopen the consent banner from the privacy and cookie settings link shown on the site.</li><li>Turn off personalised ads at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ad Settings</a>.</li><li>Block or clear cookies via your browser settings.</li><li>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a>.</li></ul><p>Withdrawal does not affect the lawfulness of processing before withdrawal.</p>
<h2>6. Third-party cookies</h2><p>Essential cookies are first-party. Future analytics/marketing tools may be third-party (Google, Meta, Beehiiv, etc.). We will make the controller/processor role clear when introducing each provider, use SCCs where non-EEA, and let you reject them via the banner.</p>
<h2>7. Do Not Track and Global Privacy Control</h2><p>We will not set analytics or marketing cookies without consent regardless of browser signal. GPC will be treated as an opt-out where applicable.</p>
<h2>8. Retention</h2><ul><li><strong>osc_user</strong> — up to 30 days; cleared on logout.</li><li><strong>osc_admin</strong> — up to 12 hours; cleared on logout.</li><li>Future analytics/marketing cookies — retention will be listed here before they're set.</li></ul>
<h2>9. Changes</h2><p>Material changes trigger a fresh banner. The date above always reflects the latest revision.</p>
<h2>10. Contact</h2><p>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a>. Data controller: Online Spirits Club, Ireland. See also <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.</p>`;
}

// -- Contact --------------------------------------------------------------
function contactHtml() {
  const d = today();
  return `<p><em>Last updated: ${d}</em></p>
<p><strong>Online Spirits Club</strong> is a free educational platform for bartenders, waiters, sommeliers, hospitality students and anyone curious about spirits, cocktails, beer, wine and service. We teach evidence-based lessons — active recall, flashcards, spaced repetition — in 3–5 minute sessions. Free, no paywall — funded by ads.</p>
<p>The best way to reach us is by email. We're a small team based in Ireland, so please allow a couple of working days for a reply. We read every message.</p>
<h2>Get in touch</h2><ul><li><strong>General questions and partnerships</strong> — <a href="mailto:${contactEmail}">${contactEmail}</a></li><li><strong>Technical support and bug reports</strong> — <a href="mailto:${supportEmail}">${supportEmail}</a></li><li><strong>Data protection and GDPR requests</strong> — <a href="mailto:${privacyEmail}">${privacyEmail}</a></li><li><strong>Content corrections and course feedback</strong> — <a href="mailto:${contentEmail}">${contentEmail}</a></li></ul><p>If in doubt, write to <a href="mailto:${contactEmail}">${contactEmail}</a> and we'll route your message to the right person.</p>
<h2>Frequently asked questions</h2>
<h3>Technical issues</h3><p>Refresh the page, sign out and back in, or clear your browser cache. Still stuck? Email <a href="mailto:${supportEmail}">${supportEmail}</a> with what you were trying to do, what happened, and your device + browser (a screenshot helps).</p>
<h3>Data requests</h3><p>You have full GDPR rights — access, rectification, erasure, portability, objection. Most fields you can update from your profile. For everything else email <a href="mailto:${privacyEmail}">${privacyEmail}</a> from the account address; we respond within one month. See <a href="/privacy">Privacy Policy</a> and <a href="/data-rights">Data Rights</a>.</p>
<h3>Content corrections</h3><p>Email <a href="mailto:${contentEmail}">${contentEmail}</a> with the course + lesson title, what you think is wrong, and a source if you have one. Our editors review every submission and typically update within a week.</p>
<h2>What we can't do</h2><ul><li>Give personalised advice about alcohol or health.</li><li>Certify professional qualifications.</li><li>Recommend or endorse specific brands, bars, or employers.</li></ul>
<h2>Something else?</h2><p>Just email <a href="mailto:${contactEmail}">${contactEmail}</a>. Praise, criticism, feature requests, weird bugs — all welcome.</p><p>See also <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms of Service</a> and <a href="/cookies">Cookie Policy</a>.</p>`;
}

// -- Data Rights ----------------------------------------------------------
function dataRightsHtml() {
  const d = today();
  return `<p><em>Last updated: ${d}</em></p>
<p>Your data belongs to you. This page explains the rights you have over the personal data <strong>Online Spirits Club</strong> holds about you, and exactly how to exercise them. We are based in Ireland — these rights come from the EU GDPR. If you're in the UK, the equivalent rights apply under the UK GDPR.</p>
<h2>The rights you have</h2><ul><li><strong>Access</strong> — a copy of your data.</li><li><strong>Rectification</strong> — correct anything wrong or incomplete.</li><li><strong>Erasure</strong> — "right to be forgotten".</li><li><strong>Portability</strong> — machine-readable export.</li><li><strong>Objection</strong> — including direct marketing.</li><li><strong>Restriction</strong> — pause processing during a dispute.</li><li><strong>Withdraw consent</strong> — any time.</li><li><strong>Complain</strong> to a supervisory authority.</li></ul>
<h2>How to use each right</h2>
<h3>Access — see everything we hold</h3><p>Most of your data is visible in your profile page. For a full export, email <a href="mailto:${privacyEmail}">${privacyEmail}</a> with subject <strong>"Data access request"</strong>. We reply within one month.</p>
<h3>Rectification — correct your data</h3><p>Update name, country, city, role and newsletter from your profile page. For anything else, email <a href="mailto:${privacyEmail}">${privacyEmail}</a>.</p>
<h3>Erasure — delete your account</h3>
<p><strong>Self-service (recommended, instant).</strong> Sign in, open your <a href="/">Profile</a>, scroll to <em>"Danger zone → Delete my account"</em> and type <code>DELETE</code> to confirm. Your account, learning progress, flashcard reviews, comments and newsletter preferences are removed from our live database immediately. Newsletter audit rows are anonymised (email replaced with a one-way hash) so we can prove — without keeping any personal data — that consent was properly withdrawn.</p>
<p><strong>By email (if you can't sign in).</strong> Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> from your account address with subject <strong>"Delete my account"</strong>. Acknowledgement in days; deletion within 30 days.</p>
<p>Both routes are irreversible. Export your data first (see the section above) if you might want it later.</p>
<h3>Portability — export your data</h3><p>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> with subject <strong>"Data export request"</strong>. JSON or CSV. Includes profile, progress, flashcards, quiz scores, comments, newsletter status.</p>
<h3>Objection — object to processing</h3><p>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a>. For direct marketing (newsletter) no reason needed — see below.</p>
<h3>Withdraw newsletter consent</h3><ul><li>Click the unsubscribe link at the bottom of any newsletter email (fastest).</li><li>Turn the newsletter toggle off on your profile page.</li><li>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a>.</li></ul>
<h3>Restriction of processing</h3><p>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a> with subject <strong>"Restrict processing"</strong>.</p>
<h2>How long we take to respond</h2><ul><li>Acknowledgement: a few working days.</li><li>Full response: within one calendar month (GDPR).</li><li>Complex requests: up to 2 extra months; we'll tell you in the first month.</li><li>Newsletter unsubscribe: immediate.</li></ul><p>All requests are free unless manifestly unfounded or excessive.</p>
<h2>Proving it's really you</h2><p>We may need to verify identity — e.g. by replying from the email on your account. We won't ask for anything more than we need.</p>
<h2>How to contact us</h2><p>Email <a href="mailto:${privacyEmail}">${privacyEmail}</a>. Data controller: Online Spirits Club, Ireland. Emailing from your account address speeds verification.</p>
<h2>If you're not happy</h2><p>Reply to us first so we can put it right. You can also complain to: <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer">Irish DPC</a>, <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">UK ICO</a>, or your national supervisory authority (see the <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer">EDPB list</a>).</p>
<p>See also <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms of Service</a>, and <a href="/cookies">Cookie Policy</a>.</p>`;
}

// -- About ----------------------------------------------------------------
function aboutHtml() {
  const site = siteUrl(); const d = today();
  return `<p><em>Last updated: ${d}</em></p>
<p><strong>Online Spirits Club</strong> is a free educational platform for people who make hospitality happen — bartenders, waiters, sommeliers, baristas, students, home enthusiasts. Short, focused lessons on spirits, cocktails, beer, wine and service you can finish on a break.</p>
<h2>Why we exist</h2><p>Great hospitality is built on knowledge. That knowledge is scattered across expensive courses, dense books and word of mouth. We wanted to make it accessible to anyone with a phone and five minutes.</p>
<h2>How we teach</h2><ul><li><strong>Active recall</strong> — you answer questions, not just read.</li><li><strong>Spaced repetition</strong> — cards return just before you'd forget.</li><li><strong>Microlearning</strong> — 3–5 minute lessons with a clear goal.</li></ul>
<h2>What you'll find</h2><ul><li>Structured courses across spirits, cocktails, beer, wine and hospitality.</li><li>Infinite "Study" mode that surfaces the right flashcards next.</li><li>Simple progress tracking — no leaderboards, no streak pressure.</li><li>Free lessons on the public web at <a href="${site}">${site}</a>.</li></ul>
<h2>What we don't do</h2><ul><li>No paywalls. No selling your data. Ads (Google AdSense) keep it free, with your consent choices respected.</li><li>No gamification for the sake of it — no coins, no XP.</li><li>No AI-generated content in lessons — written and reviewed by people who care.</li><li>No paywall. The core learning will always be free.</li></ul>
<h2>Responsible drinking</h2><p>Alcohol is part of our craft; it comes with responsibility. Drink responsibly, know your limits, respect the law, and never drink and drive. If you or someone you know is struggling with alcohol, please seek qualified help.</p>
<h2>Get in touch</h2><p>Email <a href="mailto:${contactEmail}">${contactEmail}</a>. See our <a href="/contact">Contact page</a> for dedicated support / data / content addresses.</p>`;
}

export function getLegalPages() {
  return [
    { slug: 'privacy',     title: 'Privacy Policy',   seoTitle: 'Privacy Policy · Online Spirits Club', seoDescription: 'How Online Spirits Club collects, uses and protects your personal data. GDPR-compliant. Data controller based in Ireland.', contentHtml: privacyHtml() },
    { slug: 'terms',       title: 'Terms of Service', seoTitle: 'Terms of Service · Online Spirits Club', seoDescription: 'The terms that govern your use of Online Spirits Club — a free educational platform. Ireland-based, GDPR-aligned.', contentHtml: termsHtml() },
    { slug: 'cookies',     title: 'Cookie Policy',    seoTitle: 'Cookie Policy · Online Spirits Club', seoDescription: 'How Online Spirits Club uses cookies. GDPR and ePrivacy compliant. Essential, analytics and marketing cookies explained in plain English.', contentHtml: cookiesHtml() },
    { slug: 'contact',     title: 'Contact',          seoTitle: 'Contact · Online Spirits Club', seoDescription: 'Get in touch with Online Spirits Club — the free educational platform for spirits, cocktails, beer, wine and hospitality.', contentHtml: contactHtml() },
    { slug: 'data-rights', title: 'Data Rights',      seoTitle: 'Data Rights · Online Spirits Club', seoDescription: 'Your GDPR rights at Online Spirits Club — access, correct, delete, export your data, withdraw newsletter consent.', contentHtml: dataRightsHtml() },
    { slug: 'about',       title: 'About Online Spirits Club', seoTitle: 'About · Online Spirits Club', seoDescription: 'A free educational platform for spirits, cocktails, beer, wine and hospitality. Evidence-based learning. No ads. Ireland-based.', contentHtml: aboutHtml() },
  ];
}
