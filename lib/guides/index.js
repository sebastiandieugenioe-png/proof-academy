// Guides: SEO articles that answer one real question people search for.
//
// How a guide is made (see marketing/seo/README.md):
//   - The owner picks the topic and adds his own experience (`experience` lines).
//   - Facts come ONLY from the site's lessons (lib/content.js / lib/ai-content.js);
//     every guide links to the lessons it draws from (`lessons`).
//   - Max 2-3 new guides a week. Quality over volume (Google: scaled content abuse).
//
// To add a guide: create lib/guides/<slug>.js exporting a default object with the
// fields below, then add it to GUIDES. Body is "markdown-lite":
//   ## Heading, ### Subheading, paragraphs separated by a blank line,
//   "- " list items, "1. " numbered items, **bold**, [text](/url),
//   and "> " for a highlighted tip box.

import whatToSayWhiskey from './what-to-say-when-a-guest-asks-for-a-whiskey';

export const AUTHORS = {
  sebastian: {
    name: 'Sebastián Di Eugenio',
    role: 'Bar manager · Founder of Online Spirits Club',
    bio: 'Bar manager in Ireland. Founder of Online Spirits Club: free, structured training for bartenders and hospitality staff.',
    linkedin: 'https://www.linkedin.com/in/sebasti%C3%A1n-di-eugenio-6366a3162/', // e.g. 'https://www.linkedin.com/in/…' — shown in the author box and used in schema.org sameAs
  },
};

// Newest first.
export const GUIDES = [whatToSayWhiskey];

export function getGuide(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
