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
import type { MetaAdsReport } from "@/services/metaAdsReportService";

const colors = ["#2563eb", "#059669", "#7c3aed", "#ea580c", "#0891b2", "#db2777"];

function compact(value: number) {
  return new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function DashboardCharts({ data, ads }: { data: CrmDashboardData; ads: MetaAdsReport }) {
  const revenueTitle = data.revenueResolution === "hour" ? "Doanh thu theo giờ" : data.revenueResolution === "week" ? "Doanh thu theo tuần" : "Doanh thu theo ngày";
  const revenueByLabel = new Map(data.revenue.map((row) => [row.label, row.value]));
  const adsRevenue = ads.rows.map((row) => ({ ...row, revenue: revenueByLabel.get(row.label) ?? 0 }));

  return (
    <div className="space-y-4">
      <ChartCard title={revenueTitle}>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
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
        <ChartCard title="Phễu chuyển đổi">
          <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.funnel} layout="vertical" margin={{ left: 26, right: 24 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="label" type="category" width={104} stroke="#475569" tickLine={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" name="Số lượng" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
        </ChartCard>
        <ChartCard title="Nguồn khách hàng">
          {data.sources.length ? <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.sources} dataKey="value" nameKey="label" innerRadius={62} outerRadius={104} paddingAngle={3}>{data.sources.map((row, index) => <Cell fill={colors[index % colors.length]} key={row.label} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <EmptyData label="Chưa có dữ liệu nguồn trong giai đoạn này." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Hiệu quả khóa học">
          {data.courses.length ? <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.courses} layout="vertical" margin={{ left: 30, right: 24 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={130} stroke="#475569" tickLine={false} /><Tooltip /><Bar dataKey="paid" fill="#7c3aed" name="Đơn đã thanh toán" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyData label="Chưa có đơn khóa học đã thanh toán." />}
        </ChartCard>
        <ChartCard title="Quảng cáo so với doanh thu">
          {ads.available ? (
            <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={adsRevenue} margin={{ left: 8, right: 8, top: 10 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" minTickGap={22} stroke="#64748b" tickLine={false} /><YAxis stroke="#64748b" tickFormatter={compact} tickLine={false} width={64} /><Tooltip formatter={(value) => money(Number(value))} /><Legend /><Bar dataKey="spend" fill="#f97316" name="Chi phí Ads" radius={[5, 5, 0, 0]} /><Area dataKey="revenue" fill="#dbeafe" name="Doanh thu" stroke="#2563eb" strokeWidth={3} type="monotone" /></ComposedChart></ResponsiveContainer></div>
          ) : <EmptyData label={ads.reason || "Chưa kết nối được Meta Ads."} />}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyData({ label }: { label: string }) {
  return <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-600">{label}</div>;
}
