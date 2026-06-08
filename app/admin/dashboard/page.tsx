import { AdminOverviewDashboard } from "@/components/admin/admin-overview-dashboard";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getAdminCourses, getAdminLeadActivities, getAdminLeads, getAdminPaymentOrders } from "@/services/adminDataService";

export default async function AdminDashboardPage() {
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
