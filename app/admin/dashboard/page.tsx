import { AdminGrowthOsDashboard } from "@/components/admin/admin-growth-os-dashboard";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import {
  getAdminCourses,
  getAdminLeads,
  getAdminPaymentOrders,
  getAdminStudentAccessRecords,
} from "@/services/adminDataService";

export default async function AdminDashboardPage() {
  const [orders, leads, students, courses] = await Promise.all([
    getAdminPaymentOrders(),
    getAdminLeads(),
    getAdminStudentAccessRecords(),
    getAdminCourses(),
  ]);

  return (
    <ProtectedAdminShell nextPath="/admin/dashboard">
      <AdminGrowthOsDashboard orders={orders} leads={leads} students={students} courses={courses} />
    </ProtectedAdminShell>
  );
}
