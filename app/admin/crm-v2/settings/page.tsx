import { requireAdminAuth } from "@/lib/auth/session";
import { AdminSettingsWorkspace } from "@/components/admin/admin-settings-workspace";
export const metadata = { title: "Cài đặt quản trị" };
export default async function CrmSettingsPage() {
 const auth = await requireAdminAuth("/admin/crm-v2/settings", ["owner", "editor"]);
 return <AdminSettingsWorkspace role={auth?.adminRole ?? "editor"} />;
}
