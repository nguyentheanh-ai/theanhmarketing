"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toSafeTopCourseDisplayRows } from "@/lib/admin/course-display";
import type {
  CommandCenterDataStatus,
  SoloCommandCenterModel,
} from "@/lib/admin/solo-command-center";

const COLORS = {
  current: "#2563eb",
  previous: "#94a3b8",
  paid: "#059669",
  free: "#2563eb",
  trial: "#d97706",
  pending: "#d97706",
  failed: "#dc2626",
  refunded: "#7c3aed",
  other: "#64748b",
  active: "#059669",
  expiring: "#d97706",
  error: "#dc2626",
} as const;

const STUDENT_KINDS = [
  { key: "paid", label: "Trả phí", color: COLORS.paid },
  { key: "free", label: "Miễn phí", color: COLORS.free },
  { key: "trial", label: "Dùng thử", color: COLORS.trial },
] as const;

const ACCESS_LABELS = {
  active: "Đang hoạt động",
  pending: "Đang chờ",
  expiring: "Sắp hết hạn",
  error: "Có lỗi",
} as const;

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDateLabel(value: string) {
  const [, month, day] = value.split("-");
  return day && month ? `${day}/${month}` : value;
}

function ChartCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60 ${className}`}>
      <h3 className="text-lg font-black tracking-tight text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChartState({ error, empty }: { error: boolean; empty: boolean }) {
  if (error) {
    return (
      <div className="grid h-[320px] place-items-center rounded-2xl bg-red-50 px-5 text-center text-sm font-black text-red-800" role="status">
        Không tải được dữ liệu
      </div>
    );
  }
  if (empty) {
    return (
      <div className="grid h-[320px] place-items-center rounded-2xl bg-slate-50 px-5 text-center text-sm font-bold text-slate-500">
        Chưa có dữ liệu trong kỳ
      </div>
    );
  }
  return null;
}

function RevenueTrendChart({
  rows,
  status,
}: {
  rows: SoloCommandCenterModel["revenueTrend"];
  status: CommandCenterDataStatus;
}) {
  const state = <ChartState empty={!rows.some((row) => row.current > 0 || row.previous > 0)} error={status === "error"} />;
  return (
    <ChartCard
      className="xl:col-span-8"
      description="Doanh thu paid của kỳ đang xem và kỳ liền trước có cùng số ngày."
      title="Doanh thu theo ngày"
    >
      {status === "error" || !rows.some((row) => row.current > 0 || row.previous > 0) ? state : (
        <ResponsiveContainer height={320} width="100%">
          <AreaChart accessibilityLayer data={rows} margin={{ left: 8, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="revenue-current" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={COLORS.current} stopOpacity={0.35} />
                <stop offset="95%" stopColor={COLORS.current} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} tickLine={false} />
            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}tr`} tickLine={false} width={48} />
            <Tooltip
              formatter={(value, name) => [formatVnd(Number(value)), name === "current" ? "Kỳ hiện tại" : "Kỳ trước"]}
              labelFormatter={(label) => `Ngày ${formatDateLabel(String(label))}`}
            />
            <Legend formatter={(value) => value === "current" ? "Kỳ hiện tại" : "Kỳ trước"} />
            <Area dataKey="previous" fill="transparent" stroke={COLORS.previous} strokeDasharray="5 5" type="monotone" />
            <Area dataKey="current" fill="url(#revenue-current)" stroke={COLORS.current} strokeWidth={3} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function OrderStatusChart({
  rows,
  status,
}: {
  rows: SoloCommandCenterModel["orderStatuses"];
  status: CommandCenterDataStatus;
}) {
  const empty = !rows.some((row) => row.count > 0);
  return (
    <ChartCard className="xl:col-span-4" description="Tình trạng đơn được tạo trong kỳ." title="Trạng thái đơn hàng">
      {status === "error" || empty ? <ChartState empty={empty} error={status === "error"} /> : (
        <ResponsiveContainer height={320} width="100%">
          <PieChart accessibilityLayer>
            <Pie data={rows} dataKey="count" innerRadius={62} nameKey="label" outerRadius={102} paddingAngle={2}>
              {rows.map((row) => <Cell fill={COLORS[row.status]} key={row.status} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${formatNumber(Number(value))} đơn`, String(name)]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function TopCoursesChart({
  rows,
  status,
}: {
  rows: SoloCommandCenterModel["topCourses"];
  status: CommandCenterDataStatus;
}) {
  const visibleRows = toSafeTopCourseDisplayRows(rows).slice(0, 8);
  return (
    <ChartCard className="xl:col-span-7" description="Xếp theo doanh thu paid trong kỳ." title="Khóa học bán tốt">
      {status === "error" || visibleRows.length === 0 ? (
        <ChartState empty={visibleRows.length === 0} error={status === "error"} />
      ) : (
        <ResponsiveContainer height={320} width="100%">
          <BarChart accessibilityLayer data={visibleRows} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}tr`} type="number" />
            <YAxis dataKey="title" tick={{ fontSize: 12 }} type="category" width={150} />
            <Tooltip formatter={(value) => [formatVnd(Number(value)), "Doanh thu"]} />
            <Bar dataKey="revenue" fill={COLORS.current} name="Doanh thu" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function FunnelChart({
  rows,
  unlinkedCount,
  status,
}: {
  rows: SoloCommandCenterModel["funnel"]["rows"];
  unlinkedCount: number;
  status: CommandCenterDataStatus;
}) {
  const empty = !rows.some((row) => row.count > 0) && unlinkedCount === 0;
  return (
    <ChartCard className="xl:col-span-5" description="Liên kết theo email trước, sau đó mới đến số điện thoại." title="Phễu lead đến học viên">
      {status === "error" || empty ? <ChartState empty={empty} error={status === "error"} /> : (
        <>
          <ResponsiveContainer height={320} width="100%">
            <BarChart accessibilityLayer data={rows} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis allowDecimals={false} tickLine={false} />
              <Tooltip formatter={(value) => [`${formatNumber(Number(value))} người`, "Số lượng"]} />
              <Bar dataKey="count" fill={COLORS.paid} name="Số lượng" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            Chưa liên kết được: {formatNumber(unlinkedCount)} bản ghi
          </p>
        </>
      )}
    </ChartCard>
  );
}

function StudentGrowthChart({
  rows,
  status,
}: {
  rows: SoloCommandCenterModel["studentGrowth"];
  status: CommandCenterDataStatus;
}) {
  const byDate = new Map<string, { date: string; paid: number; free: number; trial: number }>();
  for (const row of rows) {
    const current = byDate.get(row.date) ?? { date: row.date, paid: 0, free: 0, trial: 0 };
    current[row.kind] = row.count;
    byDate.set(row.date, current);
  }
  const chartRows = [...byDate.values()];
  const empty = !rows.some((row) => row.count > 0);
  return (
    <ChartCard className="xl:col-span-8" description="Học viên mới theo ngày và loại quyền học." title="Tăng trưởng học viên">
      {status === "error" || empty ? <ChartState empty={empty} error={status === "error"} /> : (
        <ResponsiveContainer height={320} width="100%">
          <BarChart accessibilityLayer data={chartRows} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} tickLine={false} />
            <YAxis allowDecimals={false} tickLine={false} />
            <Tooltip
              formatter={(value, name) => {
                const config = STUDENT_KINDS.find((item) => item.key === name);
                return [`${formatNumber(Number(value))} học viên`, config?.label ?? String(name)];
              }}
              labelFormatter={(label) => `Ngày ${formatDateLabel(String(label))}`}
            />
            <Legend formatter={(value) => STUDENT_KINDS.find((item) => item.key === value)?.label ?? value} />
            {STUDENT_KINDS.map((kind) => (
              <Bar dataKey={kind.key} fill={kind.color} key={kind.key} name={kind.key} stackId="students" />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function AccessHealthChart({
  rows,
  status,
}: {
  rows: SoloCommandCenterModel["accessHealth"];
  status: CommandCenterDataStatus;
}) {
  const chartRows = rows.map((row) => ({ ...row, label: ACCESS_LABELS[row.status] }));
  const empty = !rows.some((row) => row.count > 0);
  return (
    <ChartCard className="xl:col-span-4" description="Tình trạng quyền học hiện có và lỗi vận hành gần nhất." title="Sức khỏe quyền học">
      {status === "error" || empty ? <ChartState empty={empty} error={status === "error"} /> : (
        <ResponsiveContainer height={320} width="100%">
          <PieChart accessibilityLayer>
            <Pie data={chartRows} dataKey="count" innerRadius={62} nameKey="label" outerRadius={102} paddingAngle={2}>
              {chartRows.map((row) => <Cell fill={COLORS[row.status]} key={row.status} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${formatNumber(Number(value))} quyền`, String(name)]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function combinedStatus(...statuses: CommandCenterDataStatus[]): CommandCenterDataStatus {
  return statuses.includes("error") ? "error" : "ready";
}

export function CommandCenterCharts({ model }: { model: SoloCommandCenterModel }) {
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <RevenueTrendChart rows={model.revenueTrend} status={model.dataStatus.orders} />
      <OrderStatusChart rows={model.orderStatuses} status={model.dataStatus.orders} />
      <TopCoursesChart
        rows={model.topCourses}
        status={combinedStatus(model.dataStatus.orders, model.dataStatus.courses)}
      />
      <FunnelChart
        rows={model.funnel.rows}
        status={combinedStatus(model.dataStatus.leads, model.dataStatus.orders, model.dataStatus.students)}
        unlinkedCount={model.funnel.unlinkedCount}
      />
      <StudentGrowthChart rows={model.studentGrowth} status={model.dataStatus.students} />
      <AccessHealthChart
        rows={model.accessHealth}
        status={combinedStatus(model.dataStatus.students, model.dataStatus.activities)}
      />
    </div>
  );
}
