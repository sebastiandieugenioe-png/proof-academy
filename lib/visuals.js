// Site photography — all free photos under the Unsplash License
// (free for commercial use, no attribution required). Hot-linked from
// images.unsplash.com as Unsplash recommends. Avoid photos with visible brand
// labels or logos. To swap a photo, change its id here.

const U = 'https://images.unsplash.com/';

// Build a sized Unsplash URL from a photo id ("photo-1234-abcd").
export function unsplash(id, w = 1600, q = 70) {
  return `${U}${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

export const HERO_PHOTO = {
  id: 'photo-1750224268523-88354f0412f1',
  alt: 'A bartender making cocktails behind a busy bar.',
};

// "From grain to glass" strip on the home page.
export const PROCESS_PHOTOS = [
  { id: 'photo-1584353781226-579f0ab7c770', alt: 'Malted barley ready for brewing.', label: 'Raw materials' },
  { id: 'photo-1765989393169-40faf2dc1a3f', alt: 'Copper pot stills in a distillery.', label: 'Distillation' },
  { id: 'photo-1574713600544-ca13b5d573d5', alt: 'Oak barrels resting in a warehouse.', label: 'Maturation' },
  { id: 'photo-1779635593390-8b478382885f', alt: 'A bartender strains a cocktail into a glass.', label: 'Service' },
];

// One cover photo per learning path (course slug → photo).
export const COURSE_COVERS = {
  'alcohol-fundamentals': { id: 'photo-1765989393169-40faf2dc1a3f', alt: 'Copper pot stills in a distillery.' },
  'whiskey-beginner': { id: 'photo-1571104508999-893933ded431', alt: 'Amber whiskey served in a tumbler.' },
  'beer-fundamentals': { id: 'photo-1546622891-02c72c1537b6', alt: 'Beer being poured into a glass from a tap.' },
  'gin-beginner': { id: 'photo-1717527301724-7f72986ca267', alt: 'Juniper berries, the defining botanical of gin.' },
  'popular-beer-styles': { id: 'photo-1612528443849-93d29841db4f', alt: 'A tasting flight of four different beer styles.' },
  'beer-service': { id: 'photo-1649798510483-cdaa44328f89', alt: 'A pint of beer being poured at a bar.' },
  'rum-beginner': { id: 'photo-1514361726087-38371321b5cd', alt: 'Aged spirit in a glass on a dark background.' },
  'tequila-beginner': { id: 'photo-1706888135824-20ec9010b7bc', alt: 'A field of blue agave near Tequila, Jalisco.' },
  'vodka-beginner': { id: 'photo-1549522398-8a1b78f43af9', alt: 'A clear spirit over ice.' },
  'liqueurs-beginner': { id: 'photo-1585975776023-29a0dbc51407', alt: 'An orange aperitivo drink in a wine glass.' },
  'cocktail-foundations': { id: 'photo-1779635593390-8b478382885f', alt: 'A bartender strains a cocktail into a glass.' },
  'wine-beginner': { id: 'photo-1504279577054-acfeccf8fc52', alt: 'Rows of grapevines in a vineyard at golden hour.' },
};

export function courseCover(slug, w = 1200) {
  const c = COURSE_COVERS[slug];
  return c ? { url: unsplash(c.id, w), alt: c.alt } : null;
}
