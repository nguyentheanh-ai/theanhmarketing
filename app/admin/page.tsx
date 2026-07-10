import { redirect } from "next/navigation";
import { getCurrentAuth } from "@/lib/auth/session";

export default async function AdminIndexPage() {
  const { adminRole } = await getCurrentAuth();

  if (adminRole === "editor") {
    redirect("/admin/khoa-hoc");
  }

  redirect("/admin/dashboard");
}
