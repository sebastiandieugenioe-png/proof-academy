// Educational images + sources per lesson slug.
// Keeping this separate from content.js makes it easy to swap image providers later.

export const LESSON_MEDIA = {
  'what-is-alcohol': {
    image: 'https://images.unsplash.com/photo-1585706225595-096acd929453?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Clear spirit poured into a glass \u2014 pure ethanol is the alcohol we drink.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'US TTB \u2014 Alcohol content labeling', url: 'https://www.ttb.gov/labeling' },
      { label: 'WHO \u2014 Alcohol fact sheet', url: 'https://www.who.int/news-room/fact-sheets/detail/alcohol' },
      { label: 'PubChem \u2014 Ethanol (C2H6O)', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol' },
    ],
  },
  'fermentation-basics': {
    image: 'https://images.unsplash.com/photo-1559817142-bcfdabf17e6f?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Fermenting wort bubbling \u2014 yeast converting sugar into ethanol and CO\u2082.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Britannica \u2014 Fermentation', url: 'https://www.britannica.com/science/fermentation' },
      { label: 'Nature \u2014 Saccharomyces cerevisiae genome', url: 'https://www.nature.com/articles/nature01644' },
    ],
  },
  'distillation-explained': {
    image: 'https://images.unsplash.com/photo-1765989393169-40faf2dc1a3f?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Copper pot stills in a distillery.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Scotch Whisky Association \u2014 Production', url: 'https://www.scotch-whisky.org.uk/discover/enjoying-scotch/production/' },
      { label: 'Distiller Magazine \u2014 Pot vs Column stills', url: 'https://distiller.com/articles' },
    ],
  },
  'aging-and-maturation': {
    image: 'https://images.unsplash.com/photo-1574713600544-ca13b5d573d5?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Oak barrels stacked in a warehouse.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Independent Stave Company \u2014 The science of oak', url: 'https://www.independentstavecompany.com/' },
      { label: 'Kentucky Distillers\u2019 Association \u2014 Angel\u2019s Share', url: 'https://kybourbon.com/' },
    ],
  },
  'reading-spirit-labels': {
    image: 'https://images.unsplash.com/photo-1635674686943-01e7431e91c4?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Close-up of a spirit bottle label.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'EU Regulation 2019/787 \u2014 Definition of spirit drinks', url: 'https://eur-lex.europa.eu/eli/reg/2019/787/oj' },
      { label: 'US TTB \u2014 Standards of Identity', url: 'https://www.ttb.gov/spirits/spirits-101' },
    ],
  },
  'what-is-whiskey': {
    image: 'https://images.unsplash.com/photo-1571104508999-893933ded431?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Amber whiskey served in a tumbler.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Whisky Advocate \u2014 What is whisky?', url: 'https://whiskyadvocate.com/' },
      { label: 'EU 2019/787 \u2014 Whisky/Whiskey definition', url: 'https://eur-lex.europa.eu/eli/reg/2019/787/oj' },
    ],
  },
  'irish-whiskey': {
    image: 'https://images.unsplash.com/photo-1638518220185-2d1b461f4f7c?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Irish whiskey bottle and glass.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Irish Whiskey Association \u2014 Technical File', url: 'https://www.irishwhiskeyassociation.ie/' },
      { label: 'Bord B\u00eda \u2014 Irish Whiskey PGI', url: 'https://www.bordbia.ie/' },
    ],
  },
  'scotch-whisky': {
    image: 'https://images.unsplash.com/photo-1595505467869-8cb257b13be2?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Scotch whisky and the Scottish landscape.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Scotch Whisky Regulations 2009', url: 'https://www.legislation.gov.uk/uksi/2009/2890/contents' },
      { label: 'Scotch Whisky Association', url: 'https://www.scotch-whisky.org.uk/' },
    ],
  },
  'bourbon': {
    image: 'https://images.unsplash.com/photo-1649640547107-6bf197e3a30f?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Bourbon whiskey glass on wood.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'US CFR 27 \u00a7 5.143 \u2014 Standards of Identity: Whisky', url: 'https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.143' },
      { label: 'Kentucky Distillers\u2019 Association', url: 'https://kybourbon.com/' },
    ],
  },
  'rye-whiskey': {
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Rye grain in the field.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'US CFR 27 \u00a7 5.143 \u2014 Rye whisky', url: 'https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-I/section-5.143' },
      { label: 'Canadian Whisky Regulations', url: 'https://laws-lois.justice.gc.ca/eng/regulations/c.r.c.,_c._870/' },
    ],
  },
  'what-is-gin': {
    image: 'https://images.unsplash.com/photo-1717527301724-7f72986ca267?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Juniper berries \u2014 the mandatory botanical of gin.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'EU 2019/787 \u2014 Gin definition', url: 'https://eur-lex.europa.eu/eli/reg/2019/787/oj' },
      { label: 'The Gin Guild', url: 'https://www.theginguild.com/' },
    ],
  },
  'london-dry-gin': {
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Botanicals used in London Dry gin.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'EU 2019/787 \u2014 London Dry Gin', url: 'https://eur-lex.europa.eu/eli/reg/2019/787/oj' },
      { label: 'The Gin Guild \u2014 Styles of Gin', url: 'https://www.theginguild.com/' },
    ],
  },
  'old-tom-gin': {
    image: 'https://images.unsplash.com/photo-1717527301724-7f72986ca267?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Old Tom gin \u2014 the historic bridge between Genever and London Dry.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Difford\u2019s Guide \u2014 Old Tom Gin', url: 'https://www.diffordsguide.com/' },
      { label: 'Hayman\u2019s \u2014 History of Old Tom', url: 'https://www.haymansgin.com/' },
    ],
  },
  'navy-strength-gin': {
    image: 'https://images.unsplash.com/photo-1717527301724-7f72986ca267?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A high-strength gin \u2014 the Navy Strength category.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'Plymouth Gin \u2014 Navy Strength history', url: 'https://www.plymouthgin.com/' },
      { label: 'Difford\u2019s Guide \u2014 Navy Strength', url: 'https://www.diffordsguide.com/' },
    ],
  },
  'botanical-families': {
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A palette of gin botanicals \u2014 juniper, coriander, citrus, spices.',
    imageCredit: 'Unsplash',
    sources: [
      { label: 'The Botanical Brewer \u2014 Gin botanicals', url: 'https://www.theginguild.com/' },
      { label: 'Master of Malt \u2014 Botanical guide', url: 'https://www.masterofmalt.com/' },
    ],
  },
  // Beer Fundamentals \u2014 free Unsplash photos (lesson sources come from the lesson itself).
  'what-is-beer': {
    image: 'https://images.unsplash.com/photo-1571767454098-246b94fbcf70?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Beer tasters surrounded by fresh hops.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'beer-ingredients': {
    image: 'https://images.unsplash.com/photo-1584353781226-579f0ab7c770?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Malted barley \u2014 the grain behind most beer.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'ale-vs-lager': {
    image: 'https://images.unsplash.com/photo-1579065436839-f2bb127c5606?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A glass of pale golden beer.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'understanding-ibu-and-abv': {
    image: 'https://images.unsplash.com/photo-1761732941140-518a37e4f53f?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Hop cones on the vine \u2014 the source of beer bitterness.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'beer-styles-overview': {
    image: 'https://images.unsplash.com/photo-1649798510566-4a52cd4fe463?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A flight of craft beers in different styles.',
    imageCredit: 'Unsplash',
    sources: [],
  },
};

export function getMedia(lessonSlug) {
  return LESSON_MEDIA[lessonSlug] || { image: null, imageAlt: '', sources: [] };
}
