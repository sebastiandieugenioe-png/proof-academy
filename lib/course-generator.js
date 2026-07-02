// Course generation logic. One LLM call per lesson for higher quality.
import { v4 as uuid } from 'uuid';
import { llmJSON } from './llm';
import { getDb } from './mongo';

function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

const SYSTEM_PROMPT = `You are a senior curriculum designer for a hospitality and spirits learning platform (Anki + Brilliant style).
You write concise, evidence-based educational content that trained bartenders would trust.
Always respond with ONLY a JSON object matching the requested schema. No markdown, no code fences, no explanation outside JSON.`;

const LESSON_SCHEMA_DESC = `Return exactly this JSON shape:
{
  "title": string,
  "minutes": integer 3-6,
  "objectives": [3 short concrete learning objectives, verbs like Understand/Explain/Recognize],
  "theory": string (300-500 words of educational content, plain text with paragraphs separated by \\n\\n, use **bold** for key terms and "- " prefix for bullet lists on their own paragraph),
  "embedded": [1 to 2 objects: { "q": string, "options": [3 short options], "correct": integer 0-2, "explanation": string }],
  "flashcards": [5-7 objects: { "front": short question or term, "back": one-line answer }],
  "quiz": [exactly 5 objects: { "q": string, "options": [3 short options], "correct": integer 0-2, "explanation": one-line reasoning }],
  "sources": [2-4 objects: { "label": short authoritative source name (e.g. BJCP 2021 Style Guidelines, Oxford Companion to Beer, Brewers Association Beer Styles, Scotch Whisky Regulations), "url": canonical URL if you know it or an https root domain }],
  "imagePrompt": string (one-sentence prompt for a modern, minimalist editorial photo illustrating this lesson),
  "imageSearch": string (2-3 keyword search phrase for royalty-free stock photo),
  "seo": { "title": string (<=60 chars, includes lesson title), "description": string (140-155 chars, engaging, includes call-to-action) }
}`;

export async function generateLesson({ courseTitle, courseCategory, level, lessonTitle, lessonNumber, totalLessons, notes }) {
  const user = `Create lesson ${lessonNumber} of ${totalLessons} for the course "${courseTitle}" (category: ${courseCategory}, level: ${level}).
Lesson title: "${lessonTitle}".
Audience: beginner/intermediate bartenders, hospitality students, waiters, enthusiasts. No gamification talk.
Write in a warm, direct, educational voice \u2014 like the best professional textbook meets a bartender friend.
Use real, checkable facts. Prefer authoritative sources (BJCP, Brewers Association, Oxford Companion to Beer, Master of Malt, Difford's Guide, EU 2019/787, US TTB, Scotch Whisky Association).
${notes ? `Extra brief: ${notes}` : ''}

${LESSON_SCHEMA_DESC}`;

  const { json } = await llmJSON({ system: SYSTEM_PROMPT, user, maxTokens: 4000, temperature: 0.55 });
  // Basic sanitisation and slug
  return {
    slug: slugify(json.title || lessonTitle),
    title: json.title || lessonTitle,
    minutes: Math.max(3, Math.min(6, parseInt(json.minutes) || 4)),
    objectives: (json.objectives || []).slice(0, 3),
    theory: json.theory || '',
    embedded: json.embedded || [],
    flashcards: (json.flashcards || []).slice(0, 7),
    quiz: (json.quiz || []).slice(0, 5),
    sources: json.sources || [],
    imagePrompt: json.imagePrompt || '',
    imageSearch: json.imageSearch || '',
    seo: json.seo || {},
  };
}

// Background course generator: creates a draft record, then iterates through lessons.
export async function startCourseGeneration({ category, level, courseTitle, lessonTitles, tagline, accent, icon, notes }) {
  const db = await getDb();
  const draft = {
    id: uuid(),
    kind: 'course',
    status: 'generating',
    progress: { done: 0, total: lessonTitles.length },
    course: {
      slug: slugify(courseTitle),
      title: courseTitle,
      tagline: tagline || '',
      level,
      category,
      accent: accent || 'from-blue-500 to-indigo-600',
      icon: icon || 'BookOpen',
      lessons: [],
    },
    notes: notes || '',
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection('drafts').insertOne({ ...draft });

  // Fire and forget background generation.
  (async () => {
    try {
      for (let i = 0; i < lessonTitles.length; i++) {
        const lt = lessonTitles[i];
        const lesson = await generateLesson({
          courseTitle,
          courseCategory: category,
          level,
          lessonTitle: lt,
          lessonNumber: i + 1,
          totalLessons: lessonTitles.length,
          notes,
        });
        await db.collection('drafts').updateOne(
          { id: draft.id },
          {
            $push: { 'course.lessons': lesson },
            $set: { 'progress.done': i + 1, updatedAt: new Date() },
          }
        );
      }
      await db.collection('drafts').updateOne({ id: draft.id }, { $set: { status: 'ready', updatedAt: new Date() } });
    } catch (e) {
      console.error('Course generation error', draft.id, e);
      await db.collection('drafts').updateOne(
        { id: draft.id },
        { $set: { status: 'error', error: e.message || 'unknown', updatedAt: new Date() } }
      );
    }
  })();

  return draft;
}

// Preset templates so admin can one-click complex courses.
export const TEMPLATES = {
  beer: [
    {
      title: 'Beer Fundamentals',
      level: 'Beginner',
      category: 'Beer',
      tagline: 'Grain, water, hops and yeast \u2014 the four pillars of beer.',
      accent: 'from-amber-400 to-yellow-600',
      icon: 'GlassWater',
      lessons: ['What Is Beer?', 'Beer Ingredients', 'Ale vs Lager', 'Understanding IBU and ABV', 'Beer Styles Overview'],
      notes: 'Cite BJCP 2021 Style Guidelines, Brewers Association Style Guidelines, and The Oxford Companion to Beer.',
    },
    {
      title: 'Popular Beer Styles',
      level: 'Beginner',
      category: 'Beer',
      tagline: 'The classic beer styles every professional should know.',
      accent: 'from-yellow-500 to-orange-600',
      icon: 'GlassWater',
      lessons: ['Pilsner', 'IPA', 'Stout', 'Wheat Beer', 'Belgian Beers'],
      notes: 'Cite BJCP 2021 Style Guidelines and The Oxford Companion to Beer.',
    },
    {
      title: 'Beer Service',
      level: 'Beginner',
      category: 'Beer',
      tagline: 'Pouring, temperature and pairing beer like a pro.',
      accent: 'from-orange-500 to-red-500',
      icon: 'GlassWater',
      lessons: ['Glassware', 'Serving Temperatures', 'Food Pairing Basics'],
      notes: 'Cite BJCP, Brewers Association and The Oxford Companion to Beer.',
    },
  ],
  rum: [
    {
      title: 'Rum Beginner',
      level: 'Beginner',
      category: 'Rum',
      tagline: 'Sugarcane, molasses and the spirit of the tropics.',
      accent: 'from-amber-600 to-orange-700',
      icon: 'GlassWater',
      lessons: ['What Is Rum?', 'Rum Production', 'White, Gold and Dark Rum', 'Rhum Agricole vs Molasses Rum', 'Caribbean Rum Traditions'],
      notes: "Cite Difford's Guide, The Oxford Companion to Spirits and Cocktails, and any relevant French AOC (Rhum Agricole Martinique) or geographic protections.",
    },
  ],
  tequila: [
    {
      title: 'Tequila Beginner',
      level: 'Beginner',
      category: 'Tequila',
      tagline: 'Blue Weber agave and the Mexican tradition of tequila.',
      accent: 'from-lime-500 to-emerald-600',
      icon: 'Sparkles',
      lessons: ['What Is Tequila?', 'Blue Weber Agave', 'Blanco, Reposado and A\u00f1ejo', 'Tequila Production Process', 'Tequila vs Mezcal'],
      notes: "Cite Consejo Regulador del Tequila (CRT), NOM-006-SCFI standards, Difford's Guide and The Oxford Companion to Spirits and Cocktails.",
    },
  ],
  vodka: [
    {
      title: 'Vodka Beginner',
      level: 'Beginner',
      category: 'Vodka',
      tagline: 'The world\u2019s most-consumed spirit \u2014 clean, versatile, and misunderstood.',
      accent: 'from-slate-400 to-blue-500',
      icon: 'GlassWater',
      lessons: ['What Is Vodka?', 'Vodka Production', 'Traditional Producing Countries', 'Types of Vodka', 'Common Myths About Vodka'],
      notes: "Cite EU Regulation 2019/787, US TTB Standards of Identity, Difford's Guide, and The Oxford Companion to Spirits and Cocktails.",
    },
  ],
  liqueurs: [
    {
      title: 'Liqueurs Beginner',
      level: 'Beginner',
      category: 'Liqueurs',
      tagline: 'Sweet, aromatic and essential to the modern cocktail bar.',
      accent: 'from-pink-500 to-rose-600',
      icon: 'Sparkles',
      lessons: ['What Are Liqueurs?', 'Triple Sec and Orange Liqueurs', 'Coffee Liqueurs', 'Herbal Liqueurs', 'Italian Bitters and Aperitifs'],
      notes: "Cite EU Regulation 2019/787 for the legal definition of liqueur, Difford's Guide, and The Oxford Companion to Spirits and Cocktails. For Italian bitters, reference brand histories (Campari, Aperol, Fernet-Branca).",
    },
  ],
  cocktails: [
    {
      title: 'Cocktail Foundations',
      level: 'Beginner',
      category: 'Cocktails',
      tagline: 'The building blocks behind every great drink.',
      accent: 'from-fuchsia-500 to-purple-600',
      icon: 'Sparkles',
      lessons: ['What Is a Cocktail?', 'Cocktail Families', 'Understanding Balance', 'Essential Bartending Techniques', 'Essential Cocktail Ingredients'],
      notes: "Cite the IBA (International Bartenders Association) Official Cocktails list, Difford's Guide, David Embury's 'The Fine Art of Mixing Drinks', and The Oxford Companion to Spirits and Cocktails.",
    },
  ],
  wine: [
    {
      title: 'Wine Beginner',
      level: 'Beginner',
      category: 'Wine',
      tagline: 'Grape, place and time \u2014 the fundamentals of wine.',
      accent: 'from-red-600 to-rose-700',
      icon: 'GlassWater',
      lessons: ['What Is Wine?', 'Red Wine Basics', 'White Wine Basics', 'Sparkling Wine Basics', 'Fortified and Sweet Wines'],
      notes: 'Cite WSET (Wines & Spirits Education Trust) study materials, Wine Folly, OIV (International Organisation of Vine and Wine), and Jancis Robinson\u2019s The Oxford Companion to Wine.',
    },
  ],
};
