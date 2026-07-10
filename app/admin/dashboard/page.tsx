import { AdminOverviewDashboard } from "@/components/admin/admin-overview-dashboard";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";
import { getAdminCourses, getAdminLeadActivities, getAdminLeads, getAdminPaymentOrders } from "@/services/adminDataService";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  if (isCrmV2Enabled()) {
    redirect("/admin/crm-v2");
  }

  const [orders, leads, courses, activities] = await Promise.all([
    getAdminPaymentOrders(),
    getAdminLeads(),
    getAdminCourses(),
    getAdminLeadActivities(),
  ]);

  return (
    <ProtectedAdminShell nextPath="/admin/dashboard">
      <AdminOverviewDashboard orders={orders} leads={leads} courses={courses} activities={activities} />
    </ProtectedAdminShell>
  );
}
