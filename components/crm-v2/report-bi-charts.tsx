"use client";

import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/crm-v2";
import type { CrmDashboardData } from "@/lib/crm-v2/types";
import type { MetaAdsReport } from "@/services/metaAdsReportService";

const initialChartSize = { width: 900, height: 320 };

const compact = (value: number) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

export function ReportBiCharts({ ads, data, range }: { ads: MetaAdsReport; data: CrmDashboardData; range: string }) {
  const revenueByLabel = new Map(data.revenue.map((row) => [row.label, row.value]));
  const labels = Array.from(new Set([...data.revenue.map((row) => row.label), ...ads.rows.map((row) => row.label)]));
  const performance = labels.map((label) => ({
    label,
    revenue: revenueByLabel.get(label) ?? 0,
    spend: ads.rows.find((row) => row.label === label)?.spend ?? 0,
  }));
  const paid = data.reportSummary?.paidOrders ?? 0;
  const leads = data.reportSummary?.newLeads ?? 0;
  const revenue = data.reportSummary?.revenue ?? 0;
  const spend = ads.available ? ads.totals.spend : 0;
  const unitEconomics = [
    { label: "Chi phí / lead", value: leads ? spend / leads : 0 },
    { label: "Chi phí / đơn thanh toán", value: paid ? spend / paid : 0 },
    { label: "Doanh thu / đơn", value: paid ? revenue / paid : 0 },
  ];

  return (
    <div className="space-y-4">
      <ChartCard title={range === "today" || data.revenueResolution === "hour" ? "Doanh thu và chi phí Ads theo giờ Việt Nam" : "Doanh thu và chi phí Ads theo thời gian"}>
        {ads.available || data.revenue.some((row) => row.value > 0) ? (
          <div className="h-96 w-full">
            <ResponsiveContainer height="100%" width="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}>
              <ComposedChart data={performance} margin={{ left: 8, right: 16, top: 12 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" minTickGap={22} stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickFormatter={compact} tickLine={false} width={68} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Bar dataKey="spend" fill="#f97316" name="Chi phí Ads" radius={[6, 6, 0, 0]} />
                <Area dataKey="revenue" fill="#dbeafe" name="Doanh thu" stroke="#2563eb" strokeWidth={3} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty label={ads.reason || "Chưa có doanh thu và dữ liệu quảng cáo trong giai đoạn này."} />}
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <HorizontalBars data={unitEconomics} title="Hiệu quả chi phí" valueFormatter={money} />
        <HorizontalBars data={data.funnel} title="Phễu chuyển đổi" valueFormatter={(value) => new Intl.NumberFormat("vi-VN").format(value)} />
        <HorizontalBars data={data.sources} title="Nguồn khách hàng" valueFormatter={(value) => new Intl.NumberFormat("vi-VN").format(value)} />
        <HorizontalBars data={data.courses.map((row) => ({ label: row.name, value: row.paid }))} title="Đơn thanh toán theo khóa học" valueFormatter={(value) => new Intl.NumberFormat("vi-VN").format(value)} />
      </div>
    </div>
  );
}

function HorizontalBars({ data, title, valueFormatter }: { data: Array<{ label: string; value: number }>; title: string; valueFormatter: (value: number) => string }) {
  const visible = data.filter((row) => row.value > 0);
  return (
    <ChartCard title={title}>
      {visible.length ? <div style={{ height: Math.max(280, visible.length * 58) }} className="w-full overflow-x-auto"><div className="h-full min-w-[560px]"><ResponsiveContainer height="100%" width="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}><BarChart data={visible} layout="vertical" margin={{ left: 12, right: 30 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} /><XAxis hide type="number" /><YAxis dataKey="label" stroke="#475569" tickLine={false} type="category" width={180} /><Tooltip formatter={(value) => valueFormatter(Number(value))} /><Bar dataKey="value" fill="#2563eb" name={title} radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></div> : <Empty label="Chưa đủ dữ liệu trong giai đoạn này." />}
    </ChartCard>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-600">{label}</div>;
}
