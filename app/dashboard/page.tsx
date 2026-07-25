import { StudentDashboard } from "@/components/app/student-dashboard";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { getDashboardCourseOrderSlugs } from "@/lib/student-dashboard-courses";
import { logStudentActivity } from "@/services/activityLogService";
import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getStudentLmsAccess } from "@/services/lmsService";
import { getPaymentOrders } from "@/services/orderService";
import { getResources } from "@/services/resourceService";

function getDisplayName(email: string, metadataName?: unknown) {
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  if (!email) {
    return "học viên";
  }

  return email.split("@")[0] || "học viên";
}

export default async function DashboardPage() {
  const [{ adminRole, user }, courses, resources, orders, leads] = await Promise.all([
    getCurrentAuth(),
    getCourses(),
    getResources(),
    getPaymentOrders(),
    getLeads({ includeFallback: false }),
  ]);
  const email = user?.email ?? "";
  const allCourseSlugs = getDashboardCourseOrderSlugs(courses);
  const lmsAccess = await getStudentLmsAccess({
    email,
    userId: user?.id,
    isAdmin: Boolean(adminRole),
  });
  const paidSlugs = getCourseAccessSlugs({
    allCourseSlugs,
    email,
    isAdmin: Boolean(adminRole),
    leads,
    orders,
  });
  const mergedOwnedSlugs = Array.from(new Set([...paidSlugs, ...lmsAccess.ownedSlugs]));
  const ownedSlugs =
    mergedOwnedSlugs.length > 0 || isAuthGuardEnabled()
      ? mergedOwnedSlugs
      : ["facebook-ads-2026", "ebook-facebook-ads-2026"];
  const courseProgressBySlug = Object.fromEntries(
    ownedSlugs.map((slug) => [slug, lmsAccess.progressBySlug[slug] ?? 0]),
  );

  if (user?.email) {
    await logStudentActivity({
      userId: user.id,
      studentEmail: user.email,
      eventType: "student_login_success",
      eventTitle: "Học viên vào dashboard",
      eventDescription: "Session hợp lệ và dashboard học viên đã render thành công.",
      status: "success",
      actorType: "student",
      actorId: user.id,
      actorEmail: user.email,
      metadata: { route: "/dashboard", ownedSlugs },
      dedupeWindowMinutes: 15,
    });
  }

  return (
    <StudentDashboard
      courses={courses}
      ownedSlugs={ownedSlugs}
      progressBySlug={courseProgressBySlug}
      resources={resources}
      studentEmail={email}
      studentName={getDisplayName(email, user?.user_metadata?.full_name)}
    />
  );
}
