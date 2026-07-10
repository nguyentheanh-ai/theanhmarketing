import Link from "next/link";
import { CrmDataTable, ChartCard, InsightRow, MetricGrid, PageHeader, RightInsightPanel, SimpleBars } from "@/components/crm-v2";
import { getCrmV2ReportSnapshot, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import type { CrmDashboardData, CrmListQuery } from "@/lib/crm-v2/types";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ReportView = "daily" | "period" | "source";
type ReportChart = {
  title: string;
  valueKind: "money" | "number";
  rows: Array<{ label: string; value: number; tone?: string }>;
};

export default async function CrmV2ReportsPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  const query = normalizeCrmListQuery(rawSearchParams);
  const reportView = normalizeReportView(getFirst(rawSearchParams?.view));
  const dataSnapshot = await getCrmV2ReportSnapshot(query);
  const dashboard = dataSnapshot.dashboard;
  const primaryChart = getReportPrimaryChart(reportView, dashboard);
  const topChannels = [...dataSnapshot.attributionRows.rows]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3)
    .map((row) => ({ label: row.channel, value: row.revenue, tone: "green" }));

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Attribution" title="Báo cáo & Attribution" />
      <ReportViewTabs query={query} reportView={reportView} />
      <MetricGrid metrics={dataSnapshot.kpis} />
      <div className="grid min-w-0 gap-4 min-[1840px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title={primaryChart.title}>
              <ReportValueBars rows={primaryChart.rows} valueKind={primaryChart.valueKind} />
            </ChartCard>
            <ChartCard title="Phễu đăng ký -> vào học">
              <InvertedFunnelChart rows={buildBusinessFunnel(dashboard)} />
            </ChartCard>
          </div>
          <CrmDataTable
            rows={dataSnapshot.attributionRows.rows}
            columns={[
              { key: "channel", label: "Kênh/nguồn" },
              { key: "leads", label: "Leads" },
              { key: "mql", label: "MQL" },
              { key: "paid", label: "Paid" },
              { key: "cr", label: "CR" },
              { key: "revenue", label: "Doanh thu" },
              { key: "cac", label: "CAC" },
              { key: "roi", label: "ROI" },
              { key: "emailRevenue", label: "Doanh thu từ email" },
              { key: "note", label: "Ghi chú" },
            ]}
          />
        </div>
        <RightInsightPanel title="Insight báo cáo">
          <InsightRow label="Top khóa học" value={dashboard.courses[0]?.name ?? "Chưa có dữ liệu"} tone="green" />
          <InsightRow label="Sales owner tốt" value="Theo bộ lọc hiện tại" tone="blue" />
          <InsightRow label="Deliverability" value="98.2%" tone="green" />
          <InsightRow label="Unsubscribe" value="0.4%" tone="orange" />
          <ChartCard title="Top channels by revenue">
            <SimpleBars rows={topChannels} />
          </ChartCard>
        </RightInsightPanel>
      </div>
    </div>
  );
}

function ReportViewTabs({ query, reportView }: { query: CrmListQuery; reportView: ReportView }) {
  const viewOptions = [
    { label: "Theo ngày", value: "daily" },
    { label: "Theo giai đoạn", value: "period" },
    { label: "Theo nguồn", value: "source" },
  ] as const;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-900">Bộ lọc ngày dùng chung</div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Đổi ngày ở thanh trên cùng để toàn bộ CRM dùng cùng một mốc: {query.dateFrom && query.dateTo ? `${query.dateFrom} -> ${query.dateTo}` : query.range}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {viewOptions.map((option) => (
            <Link
              key={option.value}
              className={`inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-black ${
                reportView === option.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              data-crm-action="link"
              href={buildReportHref(query, { view: option.value })}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function buildBusinessFunnel(dashboard: CrmDashboardData) {
  const stageValue = (label: string) => dashboard.funnel.find((row) => row.label.toLowerCase().includes(label.toLowerCase()))?.value ?? 0;
  const paid = dashboard.reportSummary?.paidOrders ?? stageValue("Đã thanh toán");
  return [
    { label: "Khách đăng ký", value: dashboard.reportSummary?.newLeads ?? stageValue("Mới"), tone: "blue" },
    { label: "MQL", value: dashboard.reportSummary?.mql ?? stageValue("Quan tâm"), tone: "purple" },
    { label: "Chờ thanh toán", value: stageValue("Chờ thanh toán"), tone: "orange" },
    { label: "Đã thanh toán", value: paid, tone: "green" },
    { label: "Vào học", value: dashboard.courses.reduce((sum, course) => sum + course.paid, 0) || paid, tone: "blue" },
  ];
}

function InvertedFunnelChart({ rows }: { rows: Array<{ label: string; value: number; tone: string }> }) {
  return (
    <div aria-label="Phễu tam giác đăng ký đến vào học" className="space-y-1.5 py-2" role="list">
      {rows.map((row, index) => {
        const width = Math.max(42, 100 - index * 13);
        return (
          <div
            className={`mx-auto flex min-h-12 items-center justify-center px-5 text-center text-sm font-black text-white shadow-sm ring-1 ring-white/40 ${funnelToneClass(row.tone)}`}
            key={row.label}
            role="listitem"
            style={{
              width: `${width}%`,
              clipPath: "polygon(7% 0, 93% 0, 84% 100%, 16% 100%)",
            }}
          >
            <span className="drop-shadow-sm">{row.label}: {row.value}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReportValueBars({ rows, valueKind }: { rows: Array<{ label: string; value: number; tone?: string }>; valueKind: "money" | "number" }) {
  const visibleRows = rows.filter((row) => row.value > 0);
  if (!visibleRows.length) {
    return <div className="flex min-h-48 items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-sm font-bold text-slate-500">Chưa có doanh thu trong bộ lọc này</div>;
  }

  const max = Math.max(...visibleRows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {visibleRows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
            <span>{row.label}</span>
            <span>{formatReportChartValue(row.value, valueKind)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${reportToneClass(row.tone ?? "green")}`} style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function getReportPrimaryChart(reportView: ReportView, dashboard: CrmDashboardData): ReportChart {
  if (reportView === "source") {
    return {
      title: "Nguồn lead theo bộ lọc",
      valueKind: "number",
      rows: dashboard.sources.map((row) => ({ label: row.label, value: row.value, tone: row.tone })),
    };
  }

  if (reportView === "period") {
    return {
      title: "Doanh thu theo giai đoạn",
      valueKind: "money",
      rows: groupRevenueByPeriod(dashboard.revenue),
    };
  }

  return {
    title: "Doanh thu theo ngày",
    valueKind: "money",
    rows: dashboard.revenue.map((row) => ({ label: row.label, value: row.value, tone: "green" })),
  };
}

function groupRevenueByPeriod(rows: CrmDashboardData["revenue"]) {
  if (rows.length <= 1) return rows.map((row) => ({ label: row.label, value: row.value, tone: "green" }));
  const chunkSize = Math.max(1, Math.ceil(rows.length / 4));
  const grouped: Array<{ label: string; value: number; tone: string }> = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const first = chunk[0]?.label ?? "";
    const last = chunk[chunk.length - 1]?.label ?? first;
    grouped.push({
      label: first === last ? first : `${first} - ${last}`,
      value: chunk.reduce((sum, row) => sum + row.value, 0),
      tone: "green",
    });
  }

  return grouped;
}

function formatReportChartValue(value: number, valueKind: "money" | "number") {
  if (valueKind === "number") return new Intl.NumberFormat("vi-VN").format(Math.round(value));
  if (value >= 1_000_000) return `${Math.round((value / 1_000_000) * 10) / 10}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}đ`;
}

function reportToneClass(tone: string) {
  if (tone === "purple") return "bg-purple-500";
  if (tone === "orange") return "bg-orange-500";
  if (tone === "blue") return "bg-blue-500";
  return "bg-emerald-500";
}

function funnelToneClass(tone: string) {
  if (tone === "purple") return "bg-gradient-to-r from-violet-500 to-indigo-500";
  if (tone === "orange") return "bg-gradient-to-r from-amber-500 to-orange-500";
  if (tone === "green") return "bg-gradient-to-r from-emerald-500 to-teal-500";
  return "bg-gradient-to-r from-blue-500 to-cyan-500";
}

function buildReportHref(query: CrmListQuery, next: { view: ReportView }) {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  params.set("range", query.range);
  params.set("view", next.view);
  if (query.range === "custom") {
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
  }
  return `/admin/crm-v2/reports?${params.toString()}`;
}

function normalizeReportView(value?: string): ReportView {
  return value === "period" || value === "source" ? value : "daily";
}

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
