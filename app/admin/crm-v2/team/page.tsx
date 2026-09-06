import { requireAdminAuth } from "@/lib/auth/session";
import { AdminMembersClient } from "@/components/admin/admin-members-client";
export const metadata = { title: "Thành viên & phân quyền" };
export default async function CrmV2TeamPage() {
  await requireAdminAuth("/admin/crm-v2/team", ["owner"]);
  return <AdminMembersClient />;
}
