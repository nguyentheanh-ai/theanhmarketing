import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { getDashboardCourseOrderSlugs } from "@/lib/student-dashboard-courses";
import { getCourses } from "@/services/courseService";
import { getStudentPortalAccessRecords } from "@/services/studentPortalAccessService";
import { getStudentLmsAccess } from "@/services/lmsService";
import { getResources } from "@/services/resourceService";

function displayName(email: string, value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : email.split("@")[0] || "học viên";
}

export async function getStudentPortalSnapshot() {
  const authPromise = getCurrentAuth();
  const accessPromise = authPromise.then(async ({ adminRole, user }) => {
    const email = user?.email ?? "";
    return Promise.all([
      adminRole ? { orders: [], leads: [] } : getStudentPortalAccessRecords(email),
      getStudentLmsAccess({ email, userId: user?.id, isAdmin: Boolean(adminRole) }),
    ]);
  });
  const [{ adminRole, user }, courses, resources, [records, lmsAccess]] = await Promise.all([
    authPromise, getCourses({ summaryOnly: true }), getResources(), accessPromise,
  ]);
  const email = user?.email ?? "";
  const { orders, leads } = records;
  const paidSlugs = getCourseAccessSlugs({
    allCourseSlugs: getDashboardCourseOrderSlugs(courses), email, isAdmin: Boolean(adminRole), leads, orders,
  });
  const merged = Array.from(new Set([...paidSlugs, ...lmsAccess.ownedSlugs]));
  const ownedSlugs = merged.length > 0 || isAuthGuardEnabled() ? merged : ["facebook-ads-2026", "ebook-facebook-ads-2026"];
  const progressBySlug = Object.fromEntries(ownedSlugs.map((slug) => [slug, lmsAccess.progressBySlug[slug] ?? 0]));
  return {
    user,
    email,
    phone: typeof user?.user_metadata?.phone === "string" ? user.user_metadata.phone : "",
    displayName: displayName(email, user?.user_metadata?.full_name),
    courses,
    resources,
    ownedSlugs,
    ownedCourses: courses.filter((course) => ownedSlugs.includes(course.slug)),
    progressBySlug,
  };
}
