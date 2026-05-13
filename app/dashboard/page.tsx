import { StudentDashboard } from "@/components/app/student-dashboard";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { getCourses } from "@/services/courseService";
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

function getPaidCourseSlugsFromOrders(
  orders: Awaited<ReturnType<typeof getPaymentOrders>>,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return [];
  }

  return orders
    .filter((order) => order.status === "paid" && order.email.trim().toLowerCase() === normalizedEmail)
    .flatMap((order) => {
      if (order.orderItems.length > 0) {
        return order.orderItems.map((item) => item.slug);
      }

      return order.courseSlug.split(",").map((slug) => slug.trim()).filter(Boolean);
    });
}

export default async function DashboardPage() {
  const [{ user }, courses, resources, orders] = await Promise.all([
    getCurrentAuth(),
    getCourses(),
    getResources(),
    getPaymentOrders(),
  ]);
  const email = user?.email ?? "";
  const paidSlugs = getPaidCourseSlugsFromOrders(orders, email);
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
