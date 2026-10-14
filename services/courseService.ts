import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { collectCommandCenterPages } from "@/lib/admin/command-center-source";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fallbackCourses, getFallbackCourses, isDemoCourse, mapDbCourseToCourse, mergeOfficialCourseMetadata, normalizeCourseText, normalizeCourseTiming, publishedLessonsOnly, type DbCourse, type DbLessonResource } from "@/lib/courses/course-projection";
export { mapDbCourseToCourse, toLessonAccess, toDbLessonAccess, publishedLessonsOnly } from "@/lib/courses/course-projection";

async function fetchCourses(summaryOnly = false, slug?: string) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[courseService] Supabase env missing; using fallback courses.");
    }
    return getFallbackCourses();
  }

  let query = supabase
    .from("courses")
    .select(
      summaryOnly
        ? "*, course_modules(id,title,description,sort_order,status,lessons(id,title,duration,sort_order,status))"
        : "*, course_modules(*, lessons(*))",
    );
  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    console.warn("[courseService] Supabase courses query fell back.", {
      error: error?.message,
      rows: data?.length ?? 0,
    });
    return getFallbackCourses();
  }

  let dbCourses = (data as DbCourse[])
    .map((course) => normalizeCourseText(normalizeCourseTiming(mapDbCourseToCourse(course))))
    .filter((course) => !isDemoCourse(course))
    .map(mergeOfficialCourseMetadata);
  const lessonIds = dbCourses.flatMap((course) =>
    course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
  );

  if (!summaryOnly && lessonIds.length > 0) {
    const resourceClient = createSupabaseAdminClient() ?? supabase;
    const [{ data: resources }, { data: managedResources }] = await Promise.all([
      supabase
      .from("lesson_resources")
      .select("lesson_id,title,url")
        .in("lesson_id", lessonIds),
      resourceClient
        .from("course_resources")
        .select("lesson_id,title,url")
        .in("lesson_id", lessonIds),
    ]);

    const resourceRows = [...((resources ?? []) as DbLessonResource[]), ...((managedResources ?? []) as DbLessonResource[])];
    if (resourceRows.length > 0) {
      const resourcesByLesson = new Map<string, { title: string; url: string }[]>();

      for (const resource of resourceRows) {
        if (!resource.lesson_id) continue;
        const current = resourcesByLesson.get(resource.lesson_id) ?? [];
        current.push({ title: resource.title, url: resource.url });
        resourcesByLesson.set(resource.lesson_id, current);
      }

      dbCourses = dbCourses.map((course) => ({
        ...course,
        modules: course.modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            resources: resourcesByLesson.get(lesson.id) ?? lesson.resources,
          })),
        })),
      }));
    }
  }
  const dbSlugs = new Set(dbCourses.map((course) => course.slug));
  const missingFallbackCourses = fallbackCourses
    .filter((course) => !dbSlugs.has(course.slug))
    .map(normalizeCourseTiming);

  return [...dbCourses, ...missingFallbackCourses];
}

export async function getCourses(options: { summaryOnly?: boolean } = {}) {
  return fetchCourses(options.summaryOnly);
}

export type CourseSummary = {
  id: string;
  slug: string;
  title: string;
};

export async function getCourseSummariesStrict(): Promise<CourseSummary[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Course source is unavailable");

  const rows = await collectCommandCenterPages({
    getId: (course: { id: string }) => course.id,
    fetchPage: async ({ offset, limit }) => {
      const { data, error, count } = await supabase
        .from("courses")
        .select("id,slug,title", { count: "exact" })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + limit);
      if (error) throw new Error(`Could not read course summaries: ${error.message}`);
      if (count === null) throw new Error("Command center course source count is unavailable");
      const rows = (data ?? []) as Array<{ id: string; slug: string; title: string }>;
      const pageRows = rows.slice(0, limit);
      return { rows: pageRows, hasMore: offset + pageRows.length < count };
    },
  });
  return rows.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
  }));
}

export async function getCourseBySlug(slug: string) {
  const courses = await fetchCourses(false, slug);
  const course = courses.find((course) => course.slug === slug);
  const fallbackCourse = fallbackCourses.find((item) => item.slug === slug);
  const normalizedFallbackCourse = fallbackCourse
    ? normalizeCourseText(normalizeCourseTiming(fallbackCourse))
    : null;

  if (!course) {
    return normalizedFallbackCourse;
  }

  if (course.modules.length === 0 && normalizedFallbackCourse?.modules.length) {
    return {
      ...course,
      modules: normalizedFallbackCourse.modules,
      topics: course.topics.length > 0 ? course.topics : normalizedFallbackCourse.topics,
      audience: course.audience.length > 0 ? course.audience : normalizedFallbackCourse.audience,
      outcomes: course.outcomes.length > 0 ? course.outcomes : normalizedFallbackCourse.outcomes,
      benefits: course.benefits.length > 0 ? course.benefits : normalizedFallbackCourse.benefits,
      includes: course.includes.length > 0 ? course.includes : normalizedFallbackCourse.includes,
      requirements:
        course.requirements.length > 0 ? course.requirements : normalizedFallbackCourse.requirements,
      instructor: course.instructor.name ? course.instructor : normalizedFallbackCourse.instructor,
      reviews: course.reviews.length > 0 ? course.reviews : normalizedFallbackCourse.reviews,
      relatedSlugs:
        course.relatedSlugs.length > 0 ? course.relatedSlugs : normalizedFallbackCourse.relatedSlugs,
    };
  }

  return course;
}

export async function getPublishedCourseForStudent(slug: string) {
  const course = await getCourseBySlug(slug);
  if (!course || (course.lmsStatus ?? "published") !== "published") {
    return null;
  }

  return publishedLessonsOnly(course);
}

export async function getCourseStaticParams() {
  const courses = await getCourses();
  return courses.map((course) => ({ slug: course.slug }));
}
