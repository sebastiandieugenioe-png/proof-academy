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
    },
    {
      title: 'Popular Beer Styles',
      level: 'Beginner',
      category: 'Beer',
      tagline: 'The classic beer styles every professional should know.',
      accent: 'from-yellow-500 to-orange-600',
      icon: 'GlassWater',
      lessons: ['Pilsner', 'IPA', 'Stout', 'Wheat Beer', 'Belgian Beers'],
    },
    {
      title: 'Beer Service',
      level: 'Beginner',
      category: 'Beer',
      tagline: 'Pouring, temperature and pairing beer like a pro.',
      accent: 'from-orange-500 to-red-500',
      icon: 'GlassWater',
      lessons: ['Glassware', 'Serving Temperatures', 'Food Pairing Basics'],
    },
  ],
};
