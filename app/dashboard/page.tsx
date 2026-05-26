import { StudentDashboard } from "@/components/app/student-dashboard";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourseAccessSlugs } from "@/lib/course-access";
import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
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
  const allCourseSlugs = courses.map((course) => course.slug);
  const paidSlugs = getCourseAccessSlugs({
    allCourseSlugs,
    email,
    isAdmin: Boolean(adminRole),
    leads,
    orders,
  });
  const ownedSlugs =
    paidSlugs.length > 0 || isAuthGuardEnabled()
      ? Array.from(new Set(paidSlugs))
      : ["facebook-ads-2026"];

  return (
    <StudentDashboard
      courses={courses}
      ownedSlugs={ownedSlugs}
      resources={resources}
      studentEmail={email}
      studentName={getDisplayName(email, user?.user_metadata?.full_name)}
    />
  );
}
