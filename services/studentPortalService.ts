import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { getDashboardCourseOrderSlugs } from "@/lib/student-dashboard-courses";
import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getStudentLmsAccess } from "@/services/lmsService";
import { getPaymentOrders } from "@/services/orderService";
import { getResources } from "@/services/resourceService";

function displayName(email: string, value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : email.split("@")[0] || "học viên";
}

export async function getStudentPortalSnapshot() {
  const [{ adminRole, user }, courses, resources, orders, leads] = await Promise.all([
    getCurrentAuth(), getCourses(), getResources(), getPaymentOrders(), getLeads({ includeFallback: false }),
  ]);
  const email = user?.email ?? "";
  const lmsAccess = await getStudentLmsAccess({ email, userId: user?.id, isAdmin: Boolean(adminRole) });
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
