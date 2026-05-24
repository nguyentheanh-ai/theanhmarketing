import { AdminGrowthOsDashboard } from "@/components/admin/admin-growth-os-dashboard";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";
import { getStudentAccessRecords } from "@/services/studentAccessService";

export default async function AdminDashboardPage() {
  const [orders, leads, students, courses] = await Promise.all([
    getPaymentOrders({ includeFallback: false }),
    getLeads({ includeFallback: false }),
    getStudentAccessRecords(),
    getCourses(),
  ]);

  return (
    <ProtectedAdminShell nextPath="/admin/dashboard">
      <AdminGrowthOsDashboard orders={orders} leads={leads} students={students} courses={courses} />
    </ProtectedAdminShell>
  );
}
