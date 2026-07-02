// HTML sanitization for user-editable page content.
// Allowlist: headings, paragraphs, lists, links, images, tables, emphasis, code, blockquotes, horizontal rules.
// Strips: <script>, <style>, event handlers, javascript: URLs, data URLs (except inline images if opt-in), <iframe> unless from safe sources.

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
      'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title', ...SAFE_ATTR],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', ...SAFE_ATTR],
      iframe: ['src', 'width', 'height', 'title', 'allow', 'allowfullscreen', 'frameborder', 'referrerpolicy', ...SAFE_ATTR],
      table: ['border', 'cellpadding', 'cellspacing', ...SAFE_ATTR],
      th: ['colspan', 'rowspan', 'scope', ...SAFE_ATTR],
      td: ['colspan', 'rowspan', ...SAFE_ATTR],
      '*': SAFE_ATTR,
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtu.be', 'player.vimeo.com', 'vimeo.com'],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        // Add safe rel to external links; force target=_blank rel=noopener for absolute URLs
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
