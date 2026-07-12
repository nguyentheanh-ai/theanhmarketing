import { CrmDataTable, MetricGrid, PageHeader, StatusBadge } from "@/components/crm-v2";
import { ReportBiCharts } from "@/components/crm-v2/report-bi-charts";
import { getCrmDateRange, getCrmV2PaidCustomerCount, getCrmV2ReportSnapshot, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import type { KpiMetric } from "@/lib/crm-v2/types";
import { getMetaAdsReport } from "@/services/metaAdsReportService";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const compactMoney = (value: number) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const ratio = (numerator: number, denominator: number, suffix = "%") => denominator ? `${(numerator / denominator * (suffix === "%" ? 100 : 1)).toFixed(2)}${suffix}` : "Chưa đủ dữ liệu";

export default async function CrmV2ReportsPage({ searchParams }: PageProps) {
  const query = normalizeCrmListQuery(await searchParams);
  const [snapshot, ads, paidCustomers] = await Promise.all([getCrmV2ReportSnapshot(query), getMetaAdsReport(getCrmDateRange(query)), getCrmV2PaidCustomerCount(query)]);
  const summary = snapshot.dashboard.reportSummary;
  const leads = summary?.newLeads ?? 0;
  const paid = summary?.paidOrders ?? 0;
  const revenue = summary?.revenue ?? 0;
  const spend = ads.available ? ads.totals.spend : 0;
  const metrics: KpiMetric[] = [
    { label: "Doanh thu", value: compactMoney(revenue), tone: "green", series: snapshot.dashboard.revenue.map((row) => row.value) },
    { label: ads.quality.status === "partial" ? "Chi phí Ads tạm tính" : "Chi phí Ads", value: ads.available ? compactMoney(spend) : "Chưa đủ dữ liệu", tone: "orange", series: ads.rows.map((row) => row.spend) },
    { label: "ROAS", value: ads.available ? ratio(revenue, spend, "x") : "Chưa đủ dữ liệu", tone: "purple", series: [] },
    { label: "Tỷ lệ lead → thanh toán", value: ratio(paid, leads), tone: "blue", series: [] },
    { label: "Chi phí / lead", value: ads.available && leads ? compactMoney(spend / leads) : "Chưa đủ dữ liệu", tone: "orange", series: [] },
    { label: "Chi phí / đơn thanh toán", value: ads.available && paid ? compactMoney(spend / paid) : "Chưa đủ dữ liệu", tone: "orange", series: [] },
    { label: "Chi phí / khách hàng mới", value: ads.available && paidCustomers ? compactMoney(spend / paidCustomers) : "Chưa đủ dữ liệu", tone: "orange", series: [] },
    { label: "Doanh thu sau Ads", value: ads.available ? compactMoney(revenue - spend) : "Chưa đủ dữ liệu", tone: revenue >= spend ? "green" : "red", series: [] },
  ];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Business Intelligence" title="Báo cáo doanh thu & quảng cáo" />
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
        <StatusBadge tone={ads.available ? (ads.quality.status === "partial" ? "orange" : "green") : "red"}>{ads.available ? (ads.quality.status === "partial" ? "Ads đang chạy · số liệu tạm tính" : "Ads đã chốt") : "Ads chưa khả dụng"}</StatusBadge>
        <span>Khoảng báo cáo: {query.range}. Doanh thu chỉ tính đơn đã thanh toán; “Doanh thu sau Ads” chưa phải lợi nhuận kế toán.</span>
      </div>
      <MetricGrid metrics={metrics} />
      <ReportBiCharts ads={ads} data={snapshot.dashboard} range={query.range} />
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">Đối chiếu nguồn doanh thu</h2>
        <CrmDataTable rows={snapshot.attributionRows.rows} columns={[
          { key: "channel", label: "Kênh/nguồn" }, { key: "leads", label: "Leads" }, { key: "paid", label: "Đã thanh toán" },
          { key: "cr", label: "Tỷ lệ chuyển đổi" }, { key: "revenue", label: "Doanh thu" }, { key: "note", label: "Ghi chú" },
        ]} />
      </section>
    </div>
  );
}
