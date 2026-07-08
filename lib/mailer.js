// Resend transactional email wrapper. Graceful degradation:
// - Missing RESEND_API_KEY OR EMAIL_FROM → sendTransactionalEmail returns { skipped: true, reason }.
//   The calling flow (register, forgot-password, etc.) continues without crashing so Preview /
//   test environments work without a real key. Admin overview surfaces the config state.
// - Real API failures (bad key, unverified domain, 429) are mapped to friendly error strings.

import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || '';

// Validate FROM format: either `Name <email@domain>` or bare `email@domain`.
const FROM_RE = /^.+<[^<>@\s]+@[^<>@\s]+>$|^[^<>@\s]+@[^<>@\s]+$/;

export function mailerStatus() {
  const keyOk = !!process.env.RESEND_API_KEY;
  const fromOk = FROM_RE.test(EMAIL_FROM);
  return {
    provider: 'resend',
    configured: keyOk && fromOk,
    hasKey: keyOk,
    hasFrom: fromOk,
    from: EMAIL_FROM ? EMAIL_FROM.replace(/<([^<>]+)>/, '<***>') : null,
  };
}

function friendlyError(err) {
  const status = err?.statusCode ?? err?.status ?? 500;
  const raw = String(err?.message || err?.error || 'Resend error');
  if (status === 422 && /Invalid `from` field/i.test(raw)) {
    return { status, message: 'EMAIL_FROM must be `Name <email@domain>` or `email@domain`.' };
  }
  if ((status === 403 || status === 422) && /verified|not verified/i.test(raw)) {
    return { status, message: 'The domain in EMAIL_FROM is not verified in Resend. Verify it and match the domain exactly.' };
  }
  if (status === 401 || status === 403) {
    return { status, message: 'RESEND_API_KEY is missing, invalid, or lacks sending permission.' };
  }
  if (status === 429) return { status, message: 'Resend rate/quota limit hit. Retry later.' };
  return { status, message: raw };
}

export async function sendTransactionalEmail({ to, subject, html, text }) {
  if (!resend || !EMAIL_FROM || !FROM_RE.test(EMAIL_FROM)) {
    const reason = !process.env.RESEND_API_KEY
      ? 'RESEND_API_KEY missing'
      : !EMAIL_FROM
        ? 'EMAIL_FROM missing'
        : 'EMAIL_FROM malformed';
    console.warn(`[mailer] skipped send: ${reason}`);
    return { skipped: true, reason };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || undefined,
    });
    if (error) {
      const f = friendlyError(error);
      console.error('[mailer] send failed:', f.message);
      return { ok: false, ...f };
    }
    return { ok: true, id: data?.id || null };
  } catch (err) {
    const f = friendlyError(err);
    console.error('[mailer] exception:', f.message);
    return { ok: false, ...f };
  }
}

// --------- Templates ---------
// Kept HTML minimalist, table-free, plain paragraphs — matches the site's
// visual identity (small, no ads, plain type). Ideally under 100 lines of HTML
// so Gmail doesn't clip.

const brandBlock = () => `
  <p style="margin:24px 0 0;color:#94a3b8;font:12px/1.5 -apple-system,Segoe UI,sans-serif">
    Online Spirits Club · Free, minimalist learning for spirits, cocktails, beer & hospitality.
  </p>`;

const wrapHtml = ({ preview, title, body, cta, ctaUrl, footer }) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f8fafc;font:16px/1.55 -apple-system,Segoe UI,sans-serif;color:#0f172a">
  <div style="display:none;max-height:0;overflow:hidden">${preview}</div>
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
    <div style="font-weight:700;color:#1d4ed8;font-size:14px;letter-spacing:0.02em">ONLINE SPIRITS CLUB</div>
    <h1 style="font-size:22px;margin:12px 0 8px;color:#0f172a">${title}</h1>
    <div style="color:#334155">${body}</div>
    ${ctaUrl ? `
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px">${cta}</a>
      </p>
      <p style="margin:12px 0;color:#64748b;font-size:13px">Or paste this link into your browser:<br><span style="word-break:break-all">${ctaUrl}</span></p>
    ` : ''}
    ${footer ? `<p style="margin:24px 0 0;color:#64748b;font-size:13px">${footer}</p>` : ''}
    ${brandBlock()}
  </div>
</body></html>`;

export const templates = {
  verification: ({ name, url }) => ({
    subject: 'Confirm your email — Online Spirits Club',
    html: wrapHtml({
      preview: 'Confirm your email to activate your Online Spirits Club account.',
      title: `Hi ${name || 'there'}, please confirm your email`,
      body: `<p>Welcome to Online Spirits Club! One quick step: confirm this is really your email address. The link is valid for <strong>24 hours</strong>.</p>`,
      cta: 'Confirm my email',
      ctaUrl: url,
      footer: `If you didn't create an account, just ignore this email — nothing will happen.`,
    }),
    text: `Confirm your email — Online Spirits Club\n\nHi ${name || 'there'},\n\nConfirm your account by visiting:\n${url}\n\nThe link is valid for 24 hours. If you didn't create an account, ignore this email.`,
  }),
  passwordReset: ({ name, url }) => ({
    subject: 'Reset your password — Online Spirits Club',
    html: wrapHtml({
      preview: 'Reset your Online Spirits Club password.',
      title: `Hi ${name || 'there'}, reset your password`,
      body: `<p>Someone (hopefully you) asked to reset the password on your Online Spirits Club account. Click below to choose a new one. The link is valid for <strong>1 hour</strong>.</p>`,
      cta: 'Set a new password',
      ctaUrl: url,
      footer: `If you didn't request a reset, ignore this email — your current password stays valid.`,
    }),
    text: `Reset your password — Online Spirits Club\n\nHi ${name || 'there'},\n\nUse this link within 1 hour to reset your password:\n${url}\n\nIf you didn't request a reset, ignore this email.`,
  }),
  passwordChanged: ({ name }) => ({
    subject: 'Your password was changed — Online Spirits Club',
    html: wrapHtml({
      preview: 'Your Online Spirits Club password was changed.',
      title: 'Password changed',
      body: `<p>Hi ${name || 'there'}, this is a heads-up that the password on your Online Spirits Club account was just changed.</p><p>If <strong>you did this</strong>, no action is needed.</p><p>If you did <strong>not</strong>, someone else may have access — please reset your password immediately via the "Forgot password" link on the login page and contact <a href="mailto:privacy@onlinespiritsclub.com">privacy@onlinespiritsclub.com</a>.</p>`,
      footer: `We send this notice for every password change — it helps you spot unauthorised access early.`,
    }),
    text: `Your password was changed — Online Spirits Club\n\nHi ${name || 'there'},\n\nThe password on your Online Spirits Club account was just changed.\n\nIf this wasn't you, reset your password immediately via the "Forgot password" link at ${process.env.NEXT_PUBLIC_BASE_URL || ''}/login and contact privacy@onlinespiritsclub.com.`,
  }),
  journalWelcome: ({ unsubUrl }) => ({
    subject: 'Welcome to the Online Spirits Club Journal',
    html: wrapHtml({
      preview: 'Three carefully curated emails per week for hospitality professionals.',
      title: 'Welcome to the Journal.',
      body: `<p>Thank you for joining the <strong>Online Spirits Club Journal</strong> — a free editorial publication for hospitality professionals.</p>
        <p>Here is what to expect, three times a week:</p>
        <p style="margin:16px 0 4px 0"><strong>Sunday — Hospitality Weekly</strong><br/><span style="color:#64748b">A curated summary of the week's most important hospitality and beverage industry news.</span></p>
        <p style="margin:12px 0 4px 0"><strong>Tuesday — Educational deep dive</strong><br/><span style="color:#64748b">A long-form article on hospitality craft, service, psychology, or the spirit of the week.</span></p>
        <p style="margin:12px 0 4px 0"><strong>Thursday — Practical learning</strong><br/><span style="color:#64748b">One skill you can apply on your next shift, plus a note from the OSC study team.</span></p>
        <p style="margin-top:20px">Always useful. Never spam. Always free.</p>`,
      footer: `If you ever want to stop, one click unsubscribes you: <a href="${unsubUrl}">${unsubUrl}</a>`,
    }),
    text: `Welcome to the Online Spirits Club Journal\n\nThank you for joining a free editorial publication for hospitality professionals.\n\nSunday — Hospitality Weekly (industry news)\nTuesday — Educational deep dive (long-form)\nThursday — Practical learning (one skill better)\n\nAlways useful. Never spam. Always free.\n\nUnsubscribe anytime: ${unsubUrl}`,
  }),
};
