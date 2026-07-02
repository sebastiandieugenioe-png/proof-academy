// HTML sanitization for admin-editable CMS page content.
// Conservative allowlist — no iframes, no <script>, no <style>, no data: URIs, no event handlers.
// Anything not on the allowlist is stripped by sanitize-html.

import sanitizeHtml from 'sanitize-html';

const SAFE_ATTR = ['id', 'class'];

export function sanitizeContentHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return sanitizeHtml(dirty, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li',
      'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'mark',
      'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
      'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'nav',
    ],
    // NO iframe, NO script, NO style, NO on* attrs (default deny).
    disallowedTagsMode: 'discard',
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title', ...SAFE_ATTR],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', ...SAFE_ATTR],
      table: ['border', 'cellpadding', 'cellspacing', ...SAFE_ATTR],
      th: ['colspan', 'rowspan', 'scope', ...SAFE_ATTR],
      td: ['colspan', 'rowspan', ...SAFE_ATTR],
      '*': SAFE_ATTR,
    },
    // Global: only http/https/mailto/tel. Explicitly NO data:, javascript:, vbscript:, file:.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      // Images may only load over http(s). No data: URIs — prevents XSS via SVG payloads
      // and inline-blob renders that bypass CSP.
      img: ['http', 'https'],
    },
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: false,
    // Force external links to open safely.
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || '';
        const isExternal = /^https?:\/\//i.test(href);
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}),
          },
        };
      },
    },
  });
}

// Extract a plain text summary from HTML for meta descriptions.
export function htmlToPlainText(html, max = 160) {
  const stripped = String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max - 1).trim() + '…';
}
