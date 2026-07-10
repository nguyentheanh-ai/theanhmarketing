import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";
import { isCrmV2Enabled } from "@/lib/crm-v2/feature-flag";

export default async function AdminIndexPage() {
  const { adminRole } = await getCurrentAuth();

  if (isCrmV2Enabled()) {
    redirect("/admin/crm-v2");
  }

  redirect(adminRole === "editor" ? "/admin/khoa-hoc" : "/admin/dashboard");
}
