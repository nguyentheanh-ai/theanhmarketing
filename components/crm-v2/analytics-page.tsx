import Link from "next/link";
import { AnalyticsWorkspace } from "@/components/crm-v2/analytics-workspace";
import { getAnalyticsSelection, type AnalyticsSnapshot } from "@/lib/crm-v2/analytics";
import { getAdminAnalytics } from "@/services/adminAnalyticsService";

export async function AnalyticsPage({ params, report }: { params?: Record<string, string | string[] | undefined>; report: boolean }) {
  let data: AnalyticsSnapshot | undefined;
  let message = "";
  try {
    const selection = getAnalyticsSelection(params);
    data = await getAdminAnalytics(selection);
  } catch (error) {
    message = error instanceof Error ? error.message : "Không tải được dữ liệu bán hàng.";
  }
  if (!data) return <section className="rounded-xl border border-slate-200 bg-white p-6"><h1 className="text-xl font-semibold text-slate-900">{report ? "Báo cáo kinh doanh" : "Tổng quan kinh doanh"}</h1><p role="alert" className="mt-3 text-sm text-slate-600">{message}</p><Link className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white" href={report ? "/admin/crm-v2/reports" : "/admin/crm-v2"}>Tải lại báo cáo 30 ngày</Link></section>;
  return <AnalyticsWorkspace key={JSON.stringify(data.selection)} data={data} report={report} />;
}
