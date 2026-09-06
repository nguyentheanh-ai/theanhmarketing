import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";

export default async function AdminIndexPage() {
  const { adminRole } = await getCurrentAuth();

  if (adminRole === "editor") {
    redirect("/admin/crm-v2/courses");
  }

  redirect("/admin/crm-v2");
}
