"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/crm-v2";
import type { CrmDashboardData } from "@/lib/crm-v2/types";
import type { CrmOrderSummary } from "@/lib/crm-v2/order-summary";
import type { MetaAdsReport } from "@/services/metaAdsReportService";

const colors = ["#2563eb", "#059669", "#7c3aed", "#ea580c", "#0891b2", "#db2777"];
const initialChartSize = { width: 800, height: 320 };

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function DashboardCharts({ data, ads, orderSummary }: { data: CrmDashboardData; ads: MetaAdsReport; orderSummary: CrmOrderSummary }) {
  const revenueTitle = data.revenueResolution === "hour" ? "Doanh thu theo giờ" : data.revenueResolution === "week" ? "Doanh thu theo tuần" : "Doanh thu theo ngày";
  const revenueByLabel = new Map(data.revenue.map((row) => [row.label, row.value]));
  const adsRevenue = ads.rows.map((row) => ({ ...row, revenue: revenueByLabel.get(row.label) ?? 0 }));
  const cumulativeRevenue = data.revenue.reduce<Array<(typeof data.revenue)[number] & { cumulative: number }>>((series, row) => [
    ...series,
    { ...row, cumulative: (series.at(-1)?.cumulative ?? 0) + row.value },
  ], []);
  const orderStatuses = [
    { label: "Đã thanh toán", value: orderSummary.paid },
    { label: "Chờ thanh toán", value: orderSummary.pending },
    { label: "Thất bại/hết hạn", value: orderSummary.failed },
    { label: "Hoàn tiền", value: orderSummary.refunded },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-4">
      <ChartCard title={revenueTitle}>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}>
            <AreaChart data={data.revenue} margin={{ left: 8, right: 8, top: 10 }}>
              <defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} /></linearGradient></defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" minTickGap={24} stroke="#64748b" tickLine={false} />
              <YAxis stroke="#64748b" tickFormatter={compact} tickLine={false} width={64} />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Area dataKey="value" fill="url(#revenueFill)" name="Doanh thu" stroke="#2563eb" strokeWidth={3} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Doanh thu lũy kế">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}>
              <AreaChart data={cumulativeRevenue} margin={{ left: 8, right: 8, top: 10 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" minTickGap={24} stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickFormatter={compact} tickLine={false} width={64} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Area dataKey="cumulative" fill="#dcfce7" name="Doanh thu lũy kế" stroke="#059669" strokeWidth={3} type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Trạng thái đơn hàng">
          {orderStatuses.length ? <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}><PieChart><Pie data={orderStatuses} dataKey="value" nameKey="label" innerRadius={58} outerRadius={98} paddingAngle={3}>{orderStatuses.map((row, index) => <Cell fill={colors[index % colors.length]} key={row.label} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <EmptyData label="Chưa có đơn hàng trong giai đoạn này." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Phễu chuyển đổi">
          <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}><BarChart data={data.funnel} layout="vertical" margin={{ left: 26, right: 24 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="label" type="category" width={104} stroke="#475569" tickLine={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" name="Số lượng" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
        </ChartCard>
        <ChartCard title="Nguồn khách hàng">
          {data.sources.length ? <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}><PieChart><Pie data={data.sources} dataKey="value" nameKey="label" innerRadius={62} outerRadius={104} paddingAngle={3}>{data.sources.map((row, index) => <Cell fill={colors[index % colors.length]} key={row.label} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <EmptyData label="Chưa có dữ liệu nguồn trong giai đoạn này." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Hiệu quả khóa học">
          {data.courses.length ? <div className="w-full overflow-x-auto"><div className="min-w-[640px]" style={{ height: Math.max(288, data.courses.length * 64) }}><ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}><BarChart data={data.courses} layout="vertical" margin={{ left: 18, right: 32 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={190} stroke="#475569" tick={<CourseRankingTick />} tickLine={false} /><Tooltip formatter={(value) => new Intl.NumberFormat("vi-VN").format(Number(value))} /><Bar dataKey="paid" fill="#7c3aed" name="Đơn đã thanh toán" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div></div> : <EmptyData label="Chưa có đơn khóa học đã thanh toán." />}
        </ChartCard>
        <ChartCard title={ads.quality.status === "partial" ? "Quảng cáo so với doanh thu · tạm tính" : "Quảng cáo so với doanh thu"}>
          {ads.available ? (
            <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize} minHeight={1} minWidth={0}><ComposedChart data={adsRevenue} margin={{ left: 8, right: 8, top: 10 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" minTickGap={22} stroke="#64748b" tickLine={false} /><YAxis stroke="#64748b" tickFormatter={compact} tickLine={false} width={64} /><Tooltip formatter={(value) => money(Number(value))} /><Legend /><Bar dataKey="spend" fill="#f97316" name="Chi phí Ads" radius={[5, 5, 0, 0]} /><Area dataKey="revenue" fill="#dbeafe" name="Doanh thu" stroke="#2563eb" strokeWidth={3} type="monotone" /></ComposedChart></ResponsiveContainer></div>
          ) : <EmptyData label={ads.reason || "Chưa kết nối được Meta Ads."} />}
        </ChartCard>
      </div>
    </div>
  );
}

function CourseRankingTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const fullLabel = String(payload?.value ?? "");
  const words = fullLabel.split(/\s+/).filter(Boolean);
  const lines = [""];
  for (const word of words) {
    const current = lines.at(-1) ?? "";
    if (current && `${current} ${word}`.length > 24 && lines.length < 2) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`.trim();
  }
  if (lines[1]?.length > 26) lines[1] = `${lines[1].slice(0, 25)}…`;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{fullLabel}</title>
      <text fill="#334155" fontSize="12" fontWeight="700" textAnchor="end">
        {lines.map((line, index) => <tspan dy={index === 0 ? -2 : 16} key={`${line}:${index}`} x={-8}>{line}</tspan>)}
      </text>
    </g>
  );
}

function EmptyData({ label }: { label: string }) {
  return <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-600">{label}</div>;
}
