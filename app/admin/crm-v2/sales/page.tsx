import { requireAdminAuth } from "@/lib/auth/session";
import { listAdminCustomerProfiles } from "@/services/adminCustomerService";
import { getCourseSummariesStrict } from "@/services/courseService";
import { SalesDashboard } from "@/components/admin/sales-dashboard";
import { initialSalesFilters, vietnamDay } from "@/lib/admin/sales-dashboard";

export const metadata = { title: "Dashboard Sale | Khách hàng" };
export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireAdminAuth("/admin/crm-v2/sales", ["owner", "editor"]);
  const includeProspects = auth?.adminRole === "owner";
  const [records, courses] = await Promise.all([listAdminCustomerProfiles({ includeProspects }), getCourseSummariesStrict()]);
  const loadedAt = new Date().toISOString();
  const today = vietnamDay(loadedAt);
  return <SalesDashboard records={records.map(({ id, name, email, phone, source, note, registeredAt, updatedAt, courseSlugs, courseTitles, paidOrderCodes, pendingOrderCodes }) => ({ id, name, email, phone, source, note, registeredAt, updatedAt, courseSlugs, courseTitles, paidOrderCodes, pendingOrderCodes }))} courseCatalog={courses.map(({ slug, title }) => ({ slug, title }))} today={today} loadedAt={loadedAt} includeProspects={includeProspects} initialFilters={initialSalesFilters(await searchParams, today)} />;
}
