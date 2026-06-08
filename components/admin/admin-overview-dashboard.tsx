"use client";

import { useMemo, useState } from "react";
import type { Course } from "@/data/courses";
import {
  buildAdminOverviewModel,
  toVietnamDateKey,
  type CourseOverviewRow,
  type DailyOverviewRow,
} from "@/lib/admin/overview-dashboard";
import { formatAdminDate } from "@/lib/admin/crm-dashboard";
import type { LeadActivity } from "@/services/leadActivityService";
import type { LeadItem } from "@/services/leadService";
import type { PaymentOrder } from "@/services/orderService";

type OverviewProps = {
  orders: PaymentOrder[];
  leads: LeadItem[];
  courses: Course[];
  activities: LeadActivity[];
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number | null) {
  if (value === null) return "Mới";
  if (value > 0) return `+${value}%`;
  return `${value}%`;
}

function trendClass(value: number | null) {
  if (value === null || value > 0) return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (value < 0) return "text-red-700 bg-red-50 border-red-100";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function shortDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getActivityTone(kind: string, isDone: boolean) {
  if (/failed|bounced|complained/.test(kind)) return "bg-red-50 text-red-700 ring-red-100";
  if (/note|status|contacted/.test(kind)) return "bg-orange-50 text-orange-700 ring-orange-100";
  if (isDone || /sent|delivered/.test(kind)) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-blue-50 text-blue-700 ring-blue-100";
}

function ActivityIcon({ kind, isDone }: { kind: string; isDone: boolean }) {
  const className = getActivityTone(kind, isDone);

  return (
    <span className={`grid size-9 shrink-0 place-items-center rounded-full ring-1 ${className}`}>
      {kind === "contacted" || kind.includes("status") || kind.includes("note") ? (
        <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.2a2 2 0 0 1 2.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92Z" />
        </svg>
      ) : kind === "mail" || kind.includes("email") ? (
        <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <rect height="16" rx="2" width="20" x="2" y="4" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      ) : (
        <svg className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "emerald" | "orange" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  }[tone];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <p className="text-sm font-black text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${toneClass}`}>{detail}</p>
    </section>
  );
}

function DailyRow({ row }: { row: DailyOverviewRow }) {
  return (
    <tr className="border-t border-slate-100 align-middle hover:bg-blue-50/30">
      <td className="px-3 py-3 font-bold text-slate-900">{shortDate(row.date)}</td>
      <td className="px-3 py-3 font-black text-slate-950">{formatVnd(row.revenue)}</td>
      <td className="px-3 py-3">
        <span className={`rounded-full border px-2 py-1 text-xs font-black ${trendClass(row.revenueChangePercent)}`}>
          {formatPercent(row.revenueChangePercent)}
        </span>
      </td>
      <td className="px-3 py-3 text-slate-700">{row.paidOrders}</td>
      <td className="px-3 py-3 text-slate-700">{row.leads}</td>
    </tr>
  );
}

function CourseRow({ row }: { row: CourseOverviewRow }) {
  return (
    <tr className="border-t border-slate-100 align-middle hover:bg-slate-50">
      <td className="px-3 py-3">
        <p className="max-w-[320px] truncate font-black text-slate-950">{row.courseTitle}</p>
        <p className="mt-1 font-mono text-xs text-slate-400">{row.courseKey}</p>
      </td>
      <td className="px-3 py-3 font-black text-slate-950">{formatVnd(row.revenue)}</td>
      <td className="px-3 py-3 text-slate-700">{row.paidOrders}</td>
      <td className="px-3 py-3 text-slate-700">{row.leads}</td>
    </tr>
  );
}

type ActivitiesResult = {
  ok: boolean;
  activities?: LeadActivity[];
  refreshedAt?: string;
  message?: string;
};

const reportRowLimitOptions = [14, 30, 60, 100];

function getRangePresets(todayKey: string) {
  const today = new Date(`${todayKey}T12:00:00+07:00`);
  const yesterday = addDays(today, -1);
  const thisMonthStart = startOfMonth(today);
  const previousMonthAnchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  return [
    { key: "today", label: "Hôm nay", from: todayKey, to: todayKey },
    { key: "yesterday", label: "Hôm qua", from: toVietnamDateKey(yesterday), to: toVietnamDateKey(yesterday) },
    { key: "last7", label: "7 ngày qua", from: toVietnamDateKey(addDays(today, -6)), to: todayKey },
    { key: "thisMonth", label: "Tháng này", from: toVietnamDateKey(thisMonthStart), to: todayKey },
    {
      key: "lastMonth",
      label: "Tháng trước",
      from: toVietnamDateKey(startOfMonth(previousMonthAnchor)),
      to: toVietnamDateKey(endOfMonth(previousMonthAnchor)),
    },
  ];
}

function mapActivityForUi(activity: LeadActivity) {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    createdAt: activity.createdAt,
    kind: activity.activityType,
    isDone: /sent|delivered|contacted|paid|created|updated|note/.test(activity.activityType),
  };
}

export function AdminOverviewDashboard({ orders, leads, courses, activities }: OverviewProps) {
  const todayKey = toVietnamDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedRange, setSelectedRange] = useState({ from: todayKey, to: todayKey, label: "Hôm nay" });
  const [activityItems, setActivityItems] = useState(activities);
  const [isRefreshingActivities, setIsRefreshingActivities] = useState(false);
  const [activityMessage, setActivityMessage] = useState("");
  const [reportRowLimit, setReportRowLimit] = useState(14);
  const model = useMemo(() => buildAdminOverviewModel({ orders, leads, courses }), [courses, leads, orders]);
  const rangePresets = useMemo(() => getRangePresets(todayKey), [todayKey]);
  const recentActivities = activityItems.length > 0 ? activityItems.map(mapActivityForUi) : model.recentLeadActivities;
  const selectedDailyRow = model.dailyRows.find((row) => row.date === selectedDate) ?? model.dailyRows[model.dailyRows.length - 1];
  const selectedRangeRows = model.dailyRows.filter((row) => row.date >= selectedRange.from && row.date <= selectedRange.to);
  const selectedRangeRevenue = selectedRangeRows.reduce((sum, row) => sum + row.revenue, 0);
  const selectedRangePaidOrders = selectedRangeRows.reduce((sum, row) => sum + row.paidOrders, 0);
  const selectedRangeLeads = selectedRangeRows.reduce((sum, row) => sum + row.leads, 0);
  const selectedRangePreviousRevenue = selectedRangeRows.reduce((sum, row) => sum + row.previousRevenue, 0);
  const selectedRangeChange =
    selectedRangePreviousRevenue === 0
      ? selectedRangeRevenue === 0
        ? 0
        : null
      : Number((((selectedRangeRevenue - selectedRangePreviousRevenue) / selectedRangePreviousRevenue) * 100).toFixed(1));
  const selectedRangeLabel =
    selectedRange.from === selectedRange.to ? shortDate(selectedRange.from) : `${shortDate(selectedRange.from)} - ${shortDate(selectedRange.to)}`;
  const visibleDailyRows = [...model.dailyRows].reverse().slice(0, reportRowLimit);
  const maxRevenue = Math.max(...model.dailyRows.map((row) => row.revenue), 1);

  async function refreshActivities() {
    setIsRefreshingActivities(true);
    setActivityMessage("");
    const response = await fetch("/api/admin/activities/recent?refresh=1", { cache: "no-store" });
    const result = (await response.json()) as ActivitiesResult;
    setIsRefreshingActivities(false);

    if (!response.ok || !result.ok) {
      setActivityMessage(result.message ?? "Không tải được hoạt động mới.");
      return;
    }

    setActivityItems(result.activities ?? []);
    setActivityMessage(`Refresh lúc ${new Date().toLocaleString("vi-VN")}`);
  }

  function setSingleDateRange(dateKey: string) {
    setSelectedDate(dateKey);
    setSelectedRange({ from: dateKey, to: dateKey, label: "Ngày xem" });
  }

  function applyRangePreset(preset: { label: string; from: string; to: string }) {
    setSelectedDate(preset.to);
    setSelectedRange(preset);
  }

  return (
    <div className="mx-auto max-w-[1480px] text-slate-950">
      <header className="flex flex-col gap-4 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Tổng quan</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Theo dõi lead, doanh thu, đơn paid và khóa bán chạy theo ngày.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
            Ngày xem
            <input
              className="bg-transparent font-black text-slate-950 outline-none"
              onChange={(event) => setSingleDateRange(event.target.value)}
              type="date"
              value={selectedDate}
            />
          </label>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            <span className="text-xs font-black uppercase text-slate-400">Truy cập nhanh</span>
            {rangePresets.map((preset) => (
              <button
                className={`h-8 rounded-md border px-3 text-xs font-black transition ${
                  selectedRange.from === preset.from && selectedRange.to === preset.to
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
                key={preset.key}
                onClick={() => applyRangePreset(preset)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail={`${selectedRange.label}: ${selectedRangeLabel}`}
          label="Tổng doanh thu"
          tone="blue"
          value={formatVnd(selectedRangeRevenue)}
        />
        <MetricCard
          detail="So với cùng số dòng liền trước"
          label="Biến động doanh thu"
          tone={selectedRangeChange !== null && selectedRangeChange < 0 ? "red" : "emerald"}
          value={formatPercent(selectedRangeChange)}
        />
        <MetricCard detail={`Đơn đã thanh toán trong ${selectedRange.label.toLowerCase()}`} label="Đơn paid" tone="emerald" value={String(selectedRangePaidOrders)} />
        <MetricCard detail={`Lead phát sinh trong ${selectedRange.label.toLowerCase()}`} label="Lead" tone="orange" value={String(selectedRangeLeads)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Doanh thu từng ngày</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Có cột so sánh % với ngày liền trước.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
              {selectedDailyRow ? formatVnd(selectedDailyRow.revenue) : formatVnd(0)}
            </span>
          </div>
          <div className="mt-5 flex h-44 items-end gap-2 rounded-md bg-slate-50 p-3">
            {model.dailyRows.slice(-10).map((row) => (
              <button
                className="flex h-full flex-1 flex-col justify-end gap-2"
                key={row.date}
                onClick={() => setSingleDateRange(row.date)}
                title={`${shortDate(row.date)}: ${formatVnd(row.revenue)}`}
                type="button"
              >
                <span
                  className={`rounded-t-md ${selectedDate === row.date ? "bg-blue-600" : "bg-blue-200"}`}
                  style={{ height: `${Math.max(8, Math.round((row.revenue / maxRevenue) * 100))}%` }}
                />
                <span className="text-[11px] font-bold text-slate-500">{row.date.slice(5)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Hoạt động Lead gần đây</h2>
              {activityMessage ? <p className="mt-1 text-xs font-bold text-blue-700">{activityMessage}</p> : null}
            </div>
            <button
              className="h-9 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              disabled={isRefreshingActivities}
              onClick={refreshActivities}
              type="button"
            >
              {isRefreshingActivities ? "Đang tải..." : "Refresh"}
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 10).map((activity) => (
                <div className="flex items-start gap-3" key={activity.id}>
                  <ActivityIcon isDone={activity.isDone} kind={activity.kind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">{activity.title}</p>
                    {"description" in activity && activity.description ? (
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-600">{activity.description}</p>
                    ) : null}
                    <p className="mt-1 text-sm font-semibold text-slate-500">{formatAdminDate(activity.createdAt)}</p>
                  </div>
                  <span
                    className={`mt-1 grid size-6 place-items-center rounded-full text-xs font-black ${
                      activity.isDone ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {activity.isDone ? "✓" : "!"}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-500">Chưa có lead gần đây.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4">
        <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Báo cáo ngày</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Doanh thu paid, số đơn và lead theo từng ngày.</p>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
              Số dòng
              <select
                className="bg-transparent font-black text-slate-950 outline-none"
                onChange={(event) => setReportRowLimit(Number(event.target.value))}
                value={reportRowLimit}
              >
                {reportRowLimitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} dòng
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="px-3 py-3">Ngày</th>
                  <th className="px-3 py-3">Doanh thu</th>
                  <th className="px-3 py-3">So với hôm trước</th>
                  <th className="px-3 py-3">Đơn paid</th>
                  <th className="px-3 py-3">Lead</th>
                </tr>
              </thead>
              <tbody>
                {visibleDailyRows.map((row) => (
                  <DailyRow key={row.date} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-black text-slate-950">Khóa bán chạy</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Gom theo đơn paid, doanh thu và lead đang có trong hệ thống.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-500">
              <tr>
                <th className="px-3 py-3">Khóa học</th>
                <th className="px-3 py-3">Doanh thu</th>
                <th className="px-3 py-3">Đơn paid</th>
                <th className="px-3 py-3">Lead</th>
              </tr>
            </thead>
            <tbody>
              {model.courseRows.length > 0 ? (
                model.courseRows.map((row) => <CourseRow key={row.courseKey} row={row} />)
              ) : (
                <tr>
                  <td className="px-3 py-5 text-sm font-semibold text-slate-500" colSpan={4}>
                    Chưa có doanh thu theo khóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
