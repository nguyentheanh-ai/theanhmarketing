"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CampaignPoint, RevenuePoint } from "@/lib/types";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer height="100%" initialDimension={{ height: 300, width: 720 }} minHeight={300} minWidth={320} width="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis axisLine={false} dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
          <YAxis
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}tr`}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.94)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: 8,
              color: "#e5e7eb",
            }}
            formatter={(value) => [`${Number(value).toLocaleString("vi-VN")} VND`, "Doanh thu"]}
          />
          <Area
            dataKey="target"
            fill="transparent"
            stroke="#f8d38a"
            strokeDasharray="5 5"
            strokeOpacity={0.75}
            strokeWidth={2}
            type="monotone"
          />
          <Area dataKey="revenue" fill="url(#revenueFill)" stroke="#38bdf8" strokeWidth={3} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CampaignChart({ data }: { data: CampaignPoint[] }) {
  const colors = ["#38bdf8", "#f8d38a", "#34d399", "#a7f3d0", "#f87171"];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer height="100%" initialDimension={{ height: 300, width: 460 }} minHeight={300} minWidth={320} width="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis axisLine={false} dataKey="source" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} />
          <YAxis axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} width={38} />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.94)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: 8,
              color: "#e5e7eb",
            }}
          />
          <Bar dataKey="leads" radius={[6, 6, 2, 2]}>
            {data.map((entry, index) => (
              <Cell key={entry.source} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
