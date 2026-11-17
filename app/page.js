// Home page (server component). Loads the published learning paths on the
// server and renders the app with them, so the first HTML response already
// contains the full landing page (or the requested course) instead of a
// loading spinner. The interactive app itself lives in components/OscApp.js.
import OscApp from '@/components/OscApp'
import { allCoursesMerged } from '@/lib/api/data'
import { publicCourseTitle } from '@/lib/api/utils'
import { ensureMigrationsRun } from '@/lib/migrations'

export const dynamic = 'force-dynamic'

const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function loadCourses() {
  try {
    await ensureMigrationsRun() // e.g. publish_all_courses_v1 before the first render
    const merged = await allCoursesMerged()
    return merged.map(({ slug, title, tagline, level, accent, icon, category, lessons }) => ({
      slug,
      title: publicCourseTitle({ title, level }),
      tagline,
      level,
      accent,
      icon,
      category: category || null,
      lessonCount: (lessons || []).length,
      lessons: (lessons || []).map((l) => ({
        slug: l.slug,
        title: l.title,
        minutes: l.minutes,
        hasImage: !!(l.image && (typeof l.image === 'string' ? l.image : l.image.url)),
      })),
    }))
  } catch (e) {
    console.error('[home] could not load courses on the server', e)
    return [] // the client will fetch /api/courses instead
  }
}

export default async function HomePage({ searchParams }) {
  const qs = (await searchParams) || {}
  const course = typeof qs.course === 'string' && SLUG_OK.test(qs.course) ? qs.course : null
  const lesson = typeof qs.lesson === 'string' && SLUG_OK.test(qs.lesson) ? qs.lesson : null
  const initialRoute = course
    ? (lesson ? { name: 'lesson', courseSlug: course, lessonSlug: lesson } : { name: 'course', slug: course })
    : null
  const initialCourses = await loadCourses()
  return <OscApp initialCourses={initialCourses} initialRoute={initialRoute} />
}
