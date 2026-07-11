import { Activity, BarChart3, BookOpen, IconButton, InsightRow, MetricGrid, PageHeader, RightInsightPanel, Timeline } from "@/components/crm-v2";
import { DashboardCharts } from "@/components/crm-v2/dashboard-charts";
import { getCrmDateRange, getCrmV2Dashboard, getCrmV2OrderSummary, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import type { KpiMetric } from "@/lib/crm-v2/types";
import { getMetaAdsReport } from "@/services/metaAdsReportService";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type InsightTone = "blue" | "green" | "orange" | "purple" | "red" | "slate";

function toInsightTone(value?: string): InsightTone {
  if (value === "blue" || value === "green" || value === "orange" || value === "purple" || value === "red") return value;
  return "slate";
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default async function CrmV2DashboardPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const range = getCrmDateRange(query);
  const [data, ads, orderSummary] = await Promise.all([getCrmV2Dashboard(query), getMetaAdsReport(range), getCrmV2OrderSummary(query)]);
  const operatingKpis = data.kpis.filter((kpi) => !/email|automation/i.test(kpi.label));
  const adsKpis: KpiMetric[] = ads.available
    ? [
        { label: ads.quality.status === "partial" ? "Chi phí Ads tạm tính" : "Chi phí quảng cáo", value: compactMoney(ads.totals.spend), tone: "orange", series: ads.rows.map((row) => row.spend) },
        { label: ads.quality.status === "partial" ? "ROAS tạm tính" : "ROAS", value: ads.totals.spend ? `${((data.reportSummary?.revenue ?? 0) / ads.totals.spend).toFixed(2)}x` : "—", tone: "purple", series: [] },
        { label: "CAC", value: (data.reportSummary?.paidOrders ?? 0) ? compactMoney(ads.totals.spend / (data.reportSummary?.paidOrders ?? 1)) : "—", tone: "orange", series: [] },
        { label: "CPC", value: compactMoney(ads.totals.cpc), tone: "blue", series: [] },
        { label: "CTR", value: `${ads.totals.ctr.toFixed(2)}%`, tone: "green", series: [] },
      ]
    : [];

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Tổng quan CRM · Executive Operating System" title="Trung tâm điều hành" actions={<><IconButton href="/admin/crm-v2/reports" label="Mở báo cáo"><BarChart3 className="h-4 w-4" /></IconButton><IconButton href="/admin/crm-v2/activity" label="Hoạt động mới"><Activity className="h-4 w-4" /></IconButton></>} />
      <MetricGrid metrics={[...operatingKpis, ...adsKpis]} />
      <DashboardCharts ads={ads} data={data} orderSummary={orderSummary} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-black text-slate-950">Hoạt động gần đây</h2><p className="mt-1 text-sm font-semibold text-slate-600">Chỉ hiển thị sự kiện đã ghi nhận trong hệ thống.</p></div><div className="flex gap-2"><IconButton href="/admin/crm-v2/courses" label="Quản lý khóa học"><BookOpen className="h-4 w-4" /></IconButton><IconButton href="/admin/crm-v2/activity" label="Xem toàn bộ"><Activity className="h-4 w-4" /></IconButton></div></div>
          <div className="mt-4">{data.activity.length ? <Timeline events={data.activity} /> : <p className="rounded-xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">Chưa có hoạt động mới.</p>}</div>
        </section>
        <RightInsightPanel title="Việc cần xử lý">
          {data.tasks.length ? data.tasks.map((task) => <InsightRow key={`${task.title}:${task.owner}`} label={`${task.title} - ${task.owner}`} value={task.due} tone={toInsightTone(task.tone)} />) : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">Không có công việc CRM tồn đọng trong giai đoạn đang xem.</div>}
          <div className="pt-2"><IconButton href="/admin/viec-can-xu-ly" label="Mở danh sách việc cần xử lý"><Activity className="h-4 w-4" /></IconButton></div>
        </RightInsightPanel>
      </div>
    </div>
  );
}
