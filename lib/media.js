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
  // Remaining learning paths — free Unsplash photos (Unsplash License).
  'pilsner': {
    image: 'https://images.unsplash.com/photo-1758380742009-163a0deee80e?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A tall glass of golden pale lager with foam.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'ipa': {
    image: 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A glass of hoppy beer on a dark table.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'stout': {
    image: 'https://images.unsplash.com/photo-1774645270634-8b45b3aa3ca8?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A dark beer in a pint glass.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'wheat-beer': {
    image: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A cloudy Hefeweizen with condensation.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'belgian-beers': {
    image: 'https://images.unsplash.com/photo-1687771454203-97d0b08bbeb2?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A row of beer glasses on a wooden tray.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'glassware': {
    image: 'https://images.unsplash.com/photo-1778035121137-81be9a928d54?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Small beer glasses lined up on a tray.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'serving-temperatures': {
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A cold glass mug of beer.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'food-pairing-basics': {
    image: 'https://images.unsplash.com/photo-1731688687538-8c5a3550ef39?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A table set with food and drinks.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'what-is-rum': {
    image: 'https://images.unsplash.com/photo-1585155113372-6c1808141bf3?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Cut sugarcane stalks on a wooden table.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'rum-production': {
    image: 'https://images.unsplash.com/photo-1608232385022-8ba61bec6c59?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Wooden barrels resting on a warehouse floor.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'white-gold-and-dark-rum': {
    image: 'https://images.unsplash.com/photo-1600332085119-285428b36b40?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Aged rum in a glass with a slice of lemon.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'rhum-agricole-vs-molasses-rum': {
    image: 'https://images.unsplash.com/photo-1764426381444-697bf787844a?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Fresh sugarcane being pressed for its juice.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'caribbean-rum-traditions': {
    image: 'https://images.unsplash.com/photo-1749331479860-96ce9e68a725?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A rum cocktail garnished with fresh herbs.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'what-is-tequila': {
    image: 'https://images.unsplash.com/photo-1529671434436-8fbb37410056?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A glass of tequila beside sliced lime.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'blue-weber-agave': {
    image: 'https://images.unsplash.com/photo-1570600116722-27d2016a2b20?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'The leaves (pencas) of a blue Weber agave.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'blanco-reposado-and-a-ejo': {
    image: 'https://images.unsplash.com/photo-1535419342184-f4bd555a3c73?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Barrels stacked inside a distillery.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'tequila-production-process': {
    image: 'https://images.unsplash.com/photo-1539575344446-34d43ec355d8?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'An inspection ride through a blue agave field.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'tequila-vs-mezcal': {
    image: 'https://images.unsplash.com/photo-1634130132261-3bdf61051454?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'An agave field outside Tequila, Mexico.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'what-is-vodka': {
    image: 'https://images.unsplash.com/photo-1549746423-e5fe9cafded8?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A clear spirit in a glass with ice.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'vodka-production': {
    image: 'https://images.unsplash.com/photo-1780830186119-9f738c24c7ed?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A field of golden wheat: a common vodka base.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'traditional-producing-countries': {
    image: 'https://images.unsplash.com/photo-1437252611977-07f74518abd7?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A wheat field.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'types-of-vodka': {
    image: 'https://images.unsplash.com/photo-1694680162578-e347aaf4caf4?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Close-up of ripe wheat ears.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'common-myths-about-vodka': {
    image: 'https://images.unsplash.com/photo-1597075687490-8f673c6c17f6?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A clear martini on a wooden table.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'what-are-liqueurs': {
    image: 'https://images.unsplash.com/photo-1627558009791-2280bfc9fe14?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A glass beside a liqueur bottle.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'triple-sec-and-orange-liqueurs': {
    image: 'https://images.unsplash.com/photo-1550512358-5c497af22d15?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Sliced oranges on a plate.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'coffee-liqueurs': {
    image: 'https://images.unsplash.com/photo-1619503569646-50b2154078ac?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'An Espresso Martini with coffee beans.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'herbal-liqueurs': {
    image: 'https://images.unsplash.com/photo-1784043436398-ba13f541a848?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Bundles of dried herbs and flowers.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'italian-bitters-and-aperitifs': {
    image: 'https://images.unsplash.com/photo-1574449423472-4bc6a3d2473d?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A Negroni with orange.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'what-is-a-cocktail': {
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Pouring a spirit into a glass.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'cocktail-families': {
    image: 'https://images.unsplash.com/photo-1786034759952-f608b331ffc3?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Two cocktails with ice on a wooden board.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'understanding-balance': {
    image: 'https://images.unsplash.com/photo-1698054239930-1a96f42f87da?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A bartender garnishing a cocktail with lime.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'essential-bartending-techniques': {
    image: 'https://images.unsplash.com/photo-1509669803555-fd5edd8d5a41?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Pouring a cocktail from a shaker.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'essential-cocktail-ingredients': {
    image: 'https://images.unsplash.com/photo-1787755417071-f5f355512bfc?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A rack of bitters and bar tools.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'what-is-wine': {
    image: 'https://images.unsplash.com/photo-1472352327492-9765783b74e1?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Clusters of grapes in a vineyard at golden hour.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'red-wine-basics': {
    image: 'https://images.unsplash.com/photo-1606767351797-1664b860ae5a?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A glass of red wine.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'white-wine-basics': {
    image: 'https://images.unsplash.com/photo-1763089020420-5a34f6183b13?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'A glass of white wine on a marble table.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'sparkling-wine-basics': {
    image: 'https://images.unsplash.com/photo-1762854382956-110a4021d92a?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Rows of sparkling wine flutes.',
    imageCredit: 'Unsplash',
    sources: [],
  },
  'fortified-and-sweet-wines': {
    image: 'https://images.unsplash.com/photo-1701622669938-fa4e09a1f1fe?auto=format&fit=crop&w=1600&q=80',
    imageAlt: 'Barrels ageing in a cellar tunnel.',
    imageCredit: 'Unsplash',
    sources: [],
  },
};

export function getMedia(lessonSlug) {
  return LESSON_MEDIA[lessonSlug] || { image: null, imageAlt: '', sources: [] };
}
