import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";

export default async function AdminIndexPage() {
  const { adminRole } = await getCurrentAuth();

  redirect(adminRole === "editor" ? "/admin/cms" : "/admin/dashboard");
}
