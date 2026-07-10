import type { Course } from "@/data/courses";

const dashboardCoursePriority = [
  "facebook-ads-2026",
  "ebook-facebook-ads-2026",
  "tao-ai-agent-ca-nhan-x10-hieu-suat",
  "ai-marketing-x5-hieu-suat-cong-viec",
  "ai-agent-master-2026",
  "performance-marketing-with-ai",
  "bo-agent-kit-x10-hieu-suat-cong-viec",
  "bien-tri-thuc-thanh-tien",
  "ai-master-x10-hieu-suat",
  "marketing-gioi-phai-kiem-duoc-tien",
] as const;

function priorityIndex(slug: string) {
  const index = dashboardCoursePriority.indexOf(slug as (typeof dashboardCoursePriority)[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function uniqueSlugs(slugs: string[]) {
  return Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)));
}

export function sortCoursesForStudentDashboard<T extends { slug: string }>(courses: T[]) {
  return courses
    .map((course, index) => ({ course, index }))
    .sort((a, b) => priorityIndex(a.course.slug) - priorityIndex(b.course.slug) || a.index - b.index)
    .map(({ course }) => course);
}

export function getDashboardCourseOrderSlugs(courses: Array<{ slug: string }>) {
  return sortCoursesForStudentDashboard(courses).map((course) => course.slug);
}

export function getOwnedCoursesInAccessOrder<T extends { slug: string }>(courses: T[], ownedSlugs: string[]) {
  const courseBySlug = new Map(courses.map((course) => [course.slug, course]));

  return uniqueSlugs(ownedSlugs)
    .map((slug) => courseBySlug.get(slug))
    .filter((course): course is T => Boolean(course));
}

export function getSuggestedCoursesForDashboard(courses: Course[], ownedSlugs: string[]) {
  const ownedSet = new Set(uniqueSlugs(ownedSlugs));
  return sortCoursesForStudentDashboard(courses).filter((course) => !ownedSet.has(course.slug));
}

export function getPrimaryDashboardCourse(courses: Course[], ownedSlugs: string[]) {
  return getOwnedCoursesInAccessOrder(courses, ownedSlugs)[0] ?? sortCoursesForStudentDashboard(courses)[0] ?? null;
}
