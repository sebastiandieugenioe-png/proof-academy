// Guide 001 — topic and experience: owner (25/11/2026). Facts: Whiskey lessons
// (What Is Whiskey?, Irish Whiskey, Bourbon, Rye Whiskey, Scotch Whisky).
// Companion reel: osc_r02_whiskey ("Can I get a whiskey?").

const guide = {
  slug: 'what-to-say-when-a-guest-asks-for-a-whiskey',
  title: 'What to Say When a Guest Asks for "a Whiskey"',
  metaTitle: 'What to Say When a Guest Asks for a Whiskey (Bartender Guide)',
  description:
    'A guest just says "a whiskey, please". Here is the one question to ask first, and how to match Irish, Bourbon, Rye or Islay Scotch to what they like.',
  category: 'Behind the bar',
  author: 'sebastian',
  published: '2026-11-25',
  updated: '2026-11-25',
  readMinutes: 4,
  // YouTube Short id once published (embedded in the page). null = no video yet.
  youtubeId: null,
  lessons: [
    { slug: 'what-is-whiskey', course: 'whiskey-beginner', title: 'What Is Whiskey?' },
    { slug: 'irish-whiskey', course: 'whiskey-beginner', title: 'Irish Whiskey' },
    { slug: 'bourbon', course: 'whiskey-beginner', title: 'Bourbon' },
    { slug: 'rye-whiskey', course: 'whiskey-beginner', title: 'Rye Whiskey' },
    { slug: 'scotch-whisky', course: 'whiskey-beginner', title: 'Scotch Whisky' },
  ],
  body: `
"Can I get a whiskey?" You will hear it every shift. The easy answer is to pour the house whiskey and move on. The better answer takes ten seconds: ask one question, then recommend something the guest will actually enjoy.

## Don't just pour. Ask this first

When someone asks for "a whiskey" without naming one, I don't reach for the bottle. I ask:

> **"Sure! Where are you from?"**

It sounds like small talk, but it tells you which way to go. A guest on their first trip to Ireland and a regular from down the road want different things, and the question opens a conversation instead of a transaction.

## If they're visiting Ireland: go local

If it's their first time in Ireland, recommend an **Irish whiskey**. It's the obvious local choice, and the style suits almost everyone: Irish whiskey is known for being **smooth, light and approachable**, which is why it's the whiskey most often recommended to beginners.

A line that works:

> "Then go local: an Irish whiskey. Smooth, light and easy to drink."

Part of that smoothness comes from **triple distillation**. Most (not all) Irish whiskey runs through the still three times instead of two, which strips out heavier compounds. If they enjoy it, there's more to explore: Irish whiskey has four legal categories, from Blended Irish (the biggest, home to Jameson, Tullamore D.E.W. and Powers) to the creamy, spicy **Single Pot Still** style that only Ireland makes, like Redbreast or Green Spot.

## Not in Ireland? Match the flavour

If they're local, or the "where are you from" answer doesn't point anywhere, ask what flavours they like and match one of the four classic styles:

- **Sweet? Bourbon.** American, corn-forward whiskey aged in new charred oak, which gives **vanilla and caramel** (plus coconut, brown sugar and toasted spice).
- **Spicy? Rye.** Bourbon's spicier, drier cousin: rye grain brings **spicy, peppery, herbal and dry** flavours. It's also the backbone of the Old Fashioned, Manhattan and Sazerac.
- **Smoky? A Scotch from Islay.** Islay malts are **smoky, peaty and medicinal** (think Laphroaig, Ardbeg, Lagavulin). The smoke comes from drying the malted barley over peat fires.
- **Not sure? Irish.** Smooth and light is the safest bet for someone who doesn't know what they like yet.

Three words (sweet, spicy, smoky) are enough. You don't need to give a lecture; you need to give the guest a choice they understand.

## Bar manager tip: recommend what you've tried

The best recommendation is one you can describe from your own glass. When I'm not sure what to suggest, I offer either **something local** or **something I've tried myself**. You'll describe it better, you'll sound sure of it, and the guest can tell the difference.

If you haven't tasted much yet, that's your homework: taste one of each style (Irish, Bourbon, Rye, Islay Scotch) and write down three words for each. That's all the "script" you need.

## The 10-second version

1. Guest: "Can I get a whiskey?"
2. You: "Sure! Where are you from?"
3. First time in Ireland → Irish whiskey: smooth, light, easy to drink.
4. Otherwise → sweet (Bourbon), spicy (Rye) or smoky (Islay Scotch).
5. Recommend something you've tasted yourself.

## Learn every style in five minutes

Everything in this guide comes from our free Whiskey lessons. Each one takes about five minutes, and the flashcards at the end make the styles stick, so next time you'll answer without thinking.
`,
  faq: [
    {
      q: 'What is the best whiskey to recommend to a beginner?',
      a: 'Irish whiskey. Its signature style is smooth, light and approachable, which is why it is the whiskey most often recommended to beginners.',
    },
    {
      q: 'What is the difference between bourbon and rye?',
      a: 'Bourbon is made from at least 51% corn and tastes sweeter, with vanilla and caramel from new charred oak. Rye whiskey is made from at least 51% rye and tastes spicier, more peppery and drier.',
    },
    {
      q: 'Why do some Scotch whiskies taste smoky?',
      a: 'The smoky flavour, typical of Islay malts, comes from drying the malted barley over peat fires, which infuses the grain with phenols.',
    },
  ],
};

export default guide;
