import { requireAdminAuth } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminOrdersPage() {
  await requireAdminAuth("/admin/don-hang", ["owner"]);
  redirect("/admin/crm-v2/leads");
}
