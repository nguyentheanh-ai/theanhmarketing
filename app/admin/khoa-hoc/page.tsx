import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/session";
export default async function AdminCoursesPage() {
  await requireAdminAuth("/admin/khoa-hoc", ["owner", "editor"]);
  redirect("/admin/crm-v2/courses");
}
