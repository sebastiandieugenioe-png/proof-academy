// Guide 005 — cocktail and drinks stories bartenders can tell guests.
// Facts: Cocktail Foundations (What Is a Cocktail?), Liqueurs (Coffee Liqueurs, Italian Bitters and
// Aperitifs), Gin (Navy Strength Gin, Old Tom Gin), Popular Beer Styles (Pilsner, Wheat Beer).

const guide = {
  slug: 'cocktail-history-stories-to-tell-behind-the-bar',
  title: '7 Drink Stories to Tell Guests (and Sound Like a Pro)',
  metaTitle: 'Cocktail History Stories Every Bartender Should Know',
  description:
    'Short, true stories behind the Espresso Martini, Navy Strength gin, Campari and more. Perfect for a quiet moment at the bar.',
  category: 'Behind the bar',
  author: 'sebastian',
  published: '2026-11-26',
  updated: '2026-11-26',
  readMinutes: 4,
  youtubeId: null,
  lessons: [
    { slug: 'what-is-a-cocktail', course: 'cocktail-foundations', title: 'What Is a Cocktail?' },
    { slug: 'coffee-liqueurs', course: 'liqueurs-beginner', title: 'Coffee Liqueurs' },
    { slug: 'navy-strength-gin', course: 'gin-beginner', title: 'Navy Strength Gin' },
    { slug: 'old-tom-gin', course: 'gin-beginner', title: 'Old Tom Gin' },
    { slug: 'italian-bitters-and-aperitifs', course: 'liqueurs-beginner', title: 'Italian Bitters and Aperitifs' },
  ],
  body: `
Guests love a good story with their drink. It makes the drink taste better. Seriously.

You don't need to be a historian. You need a few short stories you can tell in 20 seconds while you make the drink. Here are seven, all true.

> **When to tell them:** quiet moments, guests sitting at the bar, someone who asks "what's in this?". Not in the middle of a Saturday rush.

## 1. The first ever "cocktail" recipe (1806)

The first time "cocktail" was defined in print was in **1806**, in a newspaper called *The Balance and Columbian Repository*. The recipe? **Spirit, sugar, water and bitters.** Four ingredients. That's where it all started.

## 2. The Espresso Martini

Created by **Dick Bradsell** in **London in the 1980s**. Every time you shake one, that's who you've got to thank.

## 3. Navy Strength gin and the gunpowder

Navy Strength is around **57% ABV** or more. The story: gunpowder soaked in spirit above about 57% would still light, so that was the proof the booze wasn't watered down. Part of it is probably legend, so tell it with a wink.

## 4. Old Tom: the "missing link" of gin

Before London Dry, there was **Old Tom**: a bit sweeter and rounder. It sits between Dutch **Genever** (malty and rich) and **London Dry** (dry). It's the gin in the original **Tom Collins** and the **Martinez**.

## 5. Campari's secret

**Campari** was created in **1860** by **Gaspare Campari** in Novara, Italy. The recipe is still a secret. Next time you build a Negroni, that's a good one to share.

## 6. Fernet-Branca and its 27 herbs

**Fernet-Branca** was made in **1845** by **Bernardino Branca** in Milan, with **27 herbs and spices**. Bartenders love it. Guests usually either love it or hate it. Offer a tiny taste and watch their face.

## 7. Pilsner was born in one town

Pilsner was born in **1842** in **Plzeň**, in Bohemia, by a brewer called **Josef Groll**. Next time someone orders a pils, you know where it started.

## How to tell them well

- Keep it under 20 seconds.
- Tell it while you make the drink, not instead of making it.
- Pick the story that matches what they ordered.
- If a story is half legend, say so. Guests like honesty.

## Learn more stories in 5 minutes

Every story here comes from our free lessons. Five minutes each, and the flashcards make sure you remember the dates when a guest asks.
`,
  faq: [
    {
      q: 'Who invented the Espresso Martini?',
      a: 'Dick Bradsell, in London, in the 1980s.',
    },
    {
      q: 'What was the first cocktail?',
      a: 'The first printed definition of a cocktail, from 1806, was spirit, sugar, water and bitters.',
    },
    {
      q: 'Why is it called Navy Strength gin?',
      a: "It's around 57% ABV or more. The story goes that gunpowder soaked in spirit that strong would still light, though part of it is probably legend.",
    },
  ],
};

export default guide;
