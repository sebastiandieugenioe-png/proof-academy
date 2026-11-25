// Guide 001 — topic and experience: owner (25/11/2026). Facts: Whiskey lessons
// (What Is Whiskey?, Irish Whiskey, Bourbon, Rye Whiskey, Scotch Whisky).
// Companion reel: osc_r02_whiskey ("Can I get a whiskey?").
// Voice: marketing/seo/VOICE.md (casual, Sebastián's way of talking).

const guide = {
  slug: 'what-to-say-when-a-guest-asks-for-a-whiskey',
  title: 'What to Say When a Guest Asks for "a Whiskey"',
  metaTitle: 'What to Say When a Guest Asks for a Whiskey (Bartender Guide)',
  description:
    'Someone just says "a whiskey, please". Don\'t just pour. Ask one question first, then pick Irish, Bourbon, Rye or Islay Scotch for them.',
  category: 'Behind the bar',
  author: 'sebastian',
  published: '2026-11-25',
  updated: '2026-11-25',
  readMinutes: 3,
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
"Can I get a whiskey?" You'll hear it every single shift.

Easy option: grab the house whiskey and pour. Done. But you can do way better in about ten seconds, and the guest will actually remember you for it.

## Don't just pour. Ask first.

When someone just says "a whiskey", I don't touch the bottle yet. I ask:

> **"Sure! Where are you from?"**

Sounds like small talk. It's not. It tells you where to go next. Someone on their first trip to Ireland and a regular from down the road want different things. And now you're having a chat, not just taking an order.

## Visiting Ireland? Go local.

First time in Ireland? Easy. Give them an **Irish whiskey**.

It's the local drink, and it's hard to get wrong. Irish whiskey is **smooth, light and easy to drink**. That's why it's the one people usually recommend to beginners.

What I'd say:

> "Then go local: an Irish whiskey. Smooth, light and easy to drink."

Why so smooth? Most Irish whiskey (not all) goes through the still **three times** instead of two. That takes out a lot of the heavier stuff.

If they like it, there's more to try. Blended Irish is the big one (Jameson, Tullamore D.E.W., Powers). Or go for **Single Pot Still**, which only Ireland makes. Creamy, a bit spicy. Redbreast or Green Spot.

## Not visiting? Match the flavour.

If they're local, or "where are you from" doesn't help, just ask what they're into. Then pick one:

- **Sweet? Bourbon.** American, mostly corn, aged in new charred oak. You get **vanilla and caramel**, plus coconut, brown sugar and a bit of toasted spice.
- **Spicy? Rye.** Bourbon's spicier, drier cousin. **Peppery, herbal, dry.** It's what goes in an Old Fashioned, a Manhattan or a Sazerac.
- **Smoky? Scotch from Islay.** **Smoky, peaty, a bit medicinal.** Think Laphroaig, Ardbeg, Lagavulin. The smoke comes from drying the barley over peat fires.
- **No idea? Irish.** Smooth and light. Safest bet when they don't know what they like.

Sweet, spicy, smoky. Three words. That's all you need. Nobody wants a whiskey lecture at 11pm on a Saturday.

## My tip: sell what you've tried.

Best recommendation? One you've actually tasted. When I'm not sure what to suggest, I go for **something local** or **something I've had myself**. You'll describe it better, you'll sound sure, and guests can tell.

Haven't tried much yet? That's your homework. Taste one of each (Irish, Bourbon, Rye, Islay Scotch) and write down three words for each. That's your script sorted.

## The 10-second version

1. Guest: "Can I get a whiskey?"
2. You: "Sure! Where are you from?"
3. First time in Ireland → Irish whiskey. Smooth, light, easy to drink.
4. Not visiting → sweet (Bourbon), spicy (Rye) or smoky (Islay Scotch).
5. Recommend something you've tasted.

## Learn the styles in 5 minutes

Everything here comes from our free Whiskey lessons. Five minutes each. Then do the flashcards and it sticks, so next time you won't even have to think about it.
`,
  faq: [
    {
      q: 'What whiskey should I recommend to a beginner?',
      a: "Irish whiskey. It's smooth, light and easy to drink, which is why it's the one people usually recommend to beginners.",
    },
    {
      q: "What's the difference between bourbon and rye?",
      a: "Bourbon is at least 51% corn and tastes sweeter, with vanilla and caramel from new charred oak. Rye is at least 51% rye and tastes spicier, more peppery and drier.",
    },
    {
      q: 'Why do some Scotch whiskies taste smoky?',
      a: "The barley is dried over peat fires, and that smoke gets into the grain. It's typical of whiskies from Islay.",
    },
  ],
};

export default guide;
