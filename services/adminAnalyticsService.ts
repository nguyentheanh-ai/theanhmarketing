import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readReportPages } from "@/lib/crm-v2/report-source";
import { buildAdminAnalytics, type AnalyticsOrder, type AnalyticsSelection } from "@/lib/crm-v2/analytics";

/** Internal sales read is independent of the CRM mirror and optional advertising APIs. */
export async function getAdminAnalytics(selection: AnalyticsSelection) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Không kết nối được dữ liệu bán hàng. Hãy tải lại hoặc kiểm tra kết nối hệ thống.");
  const lower = `${selection.range.from}T00:00:00+07:00`;
  const nextDay = new Date(Date.parse(`${selection.range.to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const upper = `${nextDay}T00:00:00+07:00`;
  const [orders, courses] = await Promise.all([
    readReportPages((offset, limit) => client.from("orders")
      .select("id,order_code,email,course_slug,course_title,order_items,status,payment_status,amount,paid_at,created_at,utm_source", { count: "exact" })
      .or(`and(paid_at.gte.${lower},paid_at.lt.${upper}),and(created_at.gte.${lower},created_at.lt.${upper})`)
      .order("id", { ascending: true }).range(offset, offset + limit - 1)),
    readReportPages((offset, limit) => client.from("courses").select("id,slug,title", { count: "exact" }).order("id", { ascending: true }).range(offset, offset + limit - 1)),
  ]);
  return buildAdminAnalytics(orders as AnalyticsOrder[], courses.map((row) => ({ slug: String(row.slug), title: String(row.title) })), selection);
}
