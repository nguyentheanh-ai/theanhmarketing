import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/session";
export const metadata = { title: "Khách hàng & học viên" };
export default async function LegacyCustomerPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminAuth("/admin/crm-v2/students", ["owner", "editor"]);
  const params = (await searchParams) ?? {};
  if (params.view === "courses") redirect("/admin/crm-v2/courses");
  const next = new URLSearchParams();
  for (const [key,value] of Object.entries(params)) { if (typeof value === "string" && key !== "view") next.set(key,value); }
  redirect(`/admin/crm-v2/customers${next.size ? `?${next}` : ""}`);
}
