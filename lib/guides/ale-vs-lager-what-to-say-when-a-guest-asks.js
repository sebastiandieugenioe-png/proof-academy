// Guide 003 — owner's experience: guests ask for "a blonde" without knowing if they want a lager
// or an ale; he asks if they want something fresh or with more flavour.
// Facts: Beer Fundamentals (Ale vs Lager, Beer Styles Overview), Popular Beer Styles (Pilsner, IPA,
// Stout, Wheat Beer), Beer Service (Serving Temperatures).

const guide = {
  slug: 'ale-vs-lager-what-to-say-when-a-guest-asks',
  title: 'Ale vs Lager: What to Say When a Guest Asks',
  metaTitle: 'Ale vs Lager: The Difference, Explained for Bartenders',
  description:
    'The real difference between ale and lager is the yeast, not the colour. And when a guest just asks for "a blonde", here\'s the one question that sorts it.',
  category: 'Behind the bar',
  author: 'sebastian',
  published: '2026-11-26',
  updated: '2026-11-26',
  readMinutes: 4,
  youtubeId: null,
  lessons: [
    { slug: 'ale-vs-lager', course: 'beer-fundamentals', title: 'Ale vs Lager' },
    { slug: 'beer-styles-overview', course: 'beer-fundamentals', title: 'Beer Styles Overview' },
    { slug: 'pilsner', course: 'popular-beer-styles', title: 'Pilsner' },
    { slug: 'ipa', course: 'popular-beer-styles', title: 'IPA' },
    { slug: 'serving-temperatures', course: 'beer-service', title: 'Serving Temperatures' },
  ],
  body: `
"Just a blonde, please."

You'll hear it all the time. And most guests who say it don't actually know if they want a lager or an ale. They just want a beer that isn't dark. Fair enough. But you can help them get something they'll actually enjoy.

## The difference in one line

It's not the colour. It's the **yeast** and the **temperature**.

- **Ale:** made with a yeast that ferments warm. That warmth gives fruity and spicy notes.
- **Lager:** made with a different yeast that ferments cold, around 7–13°C. Clean and crisp.

Fun one to drop: "lager" comes from the German **lagern**, which means "to store". Lagers were kept cold for a while to mature. And most of the beer drunk in the world is lager.

## What I ask

> **"Do you want something fresh, or something with more flavour?"**

That's it. Nobody needs a brewing lesson at the bar. That one question splits it right down the middle.

## "Something fresh" → a lager

Go for a crisp lager, like a **pilsner**. Clean, light, easy. Pilsners are served cold, around **3–7°C**, so they're properly refreshing.

Little story if they're interested: pilsner was born in **1842** in the town of **Plzeň**, in Bohemia.

## "More flavour" → an ale

Now you've got options. Ask one more thing, or just describe a couple:

- **IPA:** citrus, pine, tropical fruit. But heads up: IPAs are bitter. They usually sit around 40–70+ IBU, so they're not for someone who hates bitter beer.
- **Wheat beer (Weissbier):** cloudy, with banana and clove from the yeast. Soft and easy to like.
- **Stout:** dark, roasty, coffee and chocolate notes. Not a "blonde", but sometimes that's exactly what they need.

Ales are usually served a bit warmer than lagers. IPAs and pale ales sit around **7–10°C**, so you get more aroma.

## The 10-second version

1. Guest: "A blonde, please."
2. You: "Something fresh, or with more flavour?"
3. Fresh → a crisp lager or pilsner.
4. More flavour → IPA (bitter!), wheat beer or even a stout.
5. Not sure? Offer a little taste.

## Learn it in 5 minutes

All of this comes from our free beer lessons. Five minutes each, then the flashcards, and you'll never stumble on a beer question again.
`,
  faq: [
    {
      q: "What's the real difference between ale and lager?",
      a: "The yeast and the temperature. Ales ferment warm, which gives fruity and spicy notes. Lagers use a different yeast and ferment cold, around 7–13°C, so they're cleaner and crisper.",
    },
    {
      q: 'Is lager just light beer?',
      a: "No. It's about the yeast, not the colour. But most popular light, crisp beers like pilsners are lagers.",
    },
    {
      q: 'What temperature should lager be served at?',
      a: 'Light lagers and pilsners: around 3–7°C. IPAs and pale ales a bit warmer, around 7–10°C.',
    },
  ],
};

export default guide;
