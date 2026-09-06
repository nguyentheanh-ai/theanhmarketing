import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/session";
export default async function AdminSettingsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminAuth("/admin/cai-dat", ["owner"]);
  const raw = (await searchParams) ?? {};
  const params = new URLSearchParams();
  for (const key of ["q", "page", "pageSize", "range", "dateFrom", "dateTo", "source", "course", "status", "owner"]) {
    if (typeof raw[key] === "string") params.set(key, raw[key] as string);
  }
  if (typeof raw.from === "string" && typeof raw.to === "string") { params.set("range", "custom"); params.set("dateFrom", raw.from); params.set("dateTo", raw.to); }
  redirect(`/admin/crm-v2/settings${params.size ? `?${params}` : ""}`);
}
