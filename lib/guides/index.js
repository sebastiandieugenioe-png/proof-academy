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
    name: 'Sebastián',
    role: 'Bar manager · Founder of Online Spirits Club',
    bio: 'Bar manager with years behind the bar in Ireland. He started Online Spirits Club to give bartenders and hospitality staff the free, structured training he wished he had when he started.',
  },
};

// Newest first.
export const GUIDES = [whatToSayWhiskey];

export function getGuide(slug) {
  return GUIDES.find((g) => g.slug === slug) || null;
}
