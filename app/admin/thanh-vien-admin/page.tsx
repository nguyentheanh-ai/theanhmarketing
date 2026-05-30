import { AdminMembersClient } from "@/components/admin/admin-members-client";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";

export default function AdminMembersPage() {
  return (
    <ProtectedAdminShell nextPath="/admin/thanh-vien-admin" allowedRoles={["owner"]}>
      <AdminMembersClient />
    </ProtectedAdminShell>
  );
}
