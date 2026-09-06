import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/session";
export default async function AdminStudentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminAuth("/admin/hoc-vien", ["owner", "editor"]);
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["q", "add_student", "operation_id", "course", "status"]) {
    const value = raw?.[key];
    if (typeof value === "string") query.set(key, value);
  }
  redirect(`/admin/crm-v2/students?${query.toString()}`);
}
