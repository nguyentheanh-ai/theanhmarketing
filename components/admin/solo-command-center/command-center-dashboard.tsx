"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useTransition, type FormEvent } from "react";
import type {
  CommandCenterDataStatus,
  Metric,
  SoloCommandCenterModel,
} from "@/lib/admin/solo-command-center";
import { ChartErrorBoundary } from "@/components/admin/solo-command-center/chart-error-boundary";
import { PriorityQueue } from "@/components/admin/solo-command-center/priority-queue";
import { getVietnamCurrentMonthRange } from "@/lib/admin/command-center-date";

const CommandCenterCharts = dynamic(
  () => import("@/components/admin/solo-command-center/command-center-charts").then((module) => module.CommandCenterCharts),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const FRESHNESS_MS = 60_000;
const TIME_ZONE = "Asia/Ho_Chi_Minh";

function ChartSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2" role="status">
      <div className="h-[320px] animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-[320px] animate-pulse rounded-3xl bg-slate-100" />
      <span className="sr-only">Đang tải biểu đồ</span>
    </div>
  );
}

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

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function metricComparison(metric: Metric) {
  if (metric.previousValue === 0) return "Chưa có kỳ so sánh";
  if (metric.changePercent === null) return "Chưa có kỳ so sánh";
  const prefix = metric.changePercent > 0 ? "+" : "";
  return `${prefix}${metric.changePercent}% so với kỳ trước`;
}

function MetricCard({
  label,
  metric,
  status,
  format,
}: {
  label: string;
  metric: Metric;
  status: CommandCenterDataStatus;
  format: (value: number) => string;
}) {
  const isError = status === "error";
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <p className="text-sm font-black text-slate-500">{label}</p>
      <p className={`mt-3 text-2xl font-black tracking-tight ${isError ? "text-red-700" : "text-slate-950"}`}>
        {isError ? "Không tải được dữ liệu" : format(metric.value)}
      </p>
      <p className="mt-3 text-xs font-bold text-slate-500">
        {isError ? "Nguồn dữ liệu đang lỗi" : metricComparison(metric)}
      </p>
    </section>
  );
}

function addDateKeyDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function DateControls({ model }: { model: SoloCommandCenterModel }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentMonth = getVietnamCurrentMonthRange(model.generatedAt);
  const presets = [
    { label: "7 ngày", from: addDateKeyDays(model.range.to, -6), to: model.range.to },
    { label: "30 ngày", from: addDateKeyDays(model.range.to, -29), to: model.range.to },
    { label: "Tháng này", ...currentMonth },
  ];

  function goToRange(from: string, to: string) {
    const query = new URLSearchParams({ from, to });
    startTransition(() => router.push(`/admin/dashboard?${query.toString()}`));
  }

  function submitRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    goToRange(String(formData.get("from") ?? ""), String(formData.get("to") ?? ""));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" aria-label="Khoảng ngày nhanh">
        {presets.map((preset) => {
          const active = preset.from === model.range.from && preset.to === model.range.to;
          return (
            <button
              className={`min-h-10 rounded-full border px-4 text-sm font-black transition ${
                active
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
              disabled={isPending}
              key={preset.label}
              onClick={() => goToRange(preset.from, preset.to)}
              type="button"
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <form
        action="/admin/dashboard"
        className="flex flex-wrap items-end gap-2"
        key={`${model.range.from}:${model.range.to}`}
        method="get"
        onSubmit={submitRange}
      >
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
          Từ ngày
          <input
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
            defaultValue={model.range.from}
            disabled={isPending}
            name="from"
            required
            type="date"
          />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
          Đến ngày
          <input
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
            defaultValue={model.range.to}
            disabled={isPending}
            name="to"
            required
            type="date"
          />
        </label>
        <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white" disabled={isPending} type="submit">
          Áp dụng
        </button>
      </form>
    </div>
  );
}

export function CommandCenterDashboard({
  model,
  selectedTaskId,
}: {
  model: SoloCommandCenterModel;
  selectedTaskId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const generatedTime = new Date(model.generatedAt).getTime();
  const [clock, setClock] = useState(generatedTime);
  const hasSourceError = Object.values(model.dataStatus).some((status) => status === "error");
  const refreshWaitMs = Math.max(0, generatedTime + FRESHNESS_MS - clock);
  const canRefresh = hasSourceError || refreshWaitMs === 0;

  useEffect(() => {
    const wait = Math.max(0, generatedTime + FRESHNESS_MS - Date.now());
    const timer = window.setTimeout(() => setClock(Date.now()), wait + 20);
    return () => window.clearTimeout(timer);
  }, [generatedTime]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  const reportQuery = new URLSearchParams(model.range).toString();

  return (
    <main className="mx-auto max-w-[1480px] text-slate-950">
      <header className="rounded-3xl bg-[#f2eadf] p-5 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5a12]">Trung tâm điều hành cá nhân</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Tổng quan kinh doanh</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Doanh thu paid, học viên, lead và các việc vận hành cần xử lý trong múi giờ {TIME_ZONE}.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">Cập nhật lần cuối: {formatGeneratedAt(model.generatedAt)}</p>
          </div>
          <DateControls model={model} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="min-h-11 rounded-full border border-slate-300 bg-white px-5 text-sm font-black text-slate-900 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending || !canRefresh}
            onClick={refresh}
            type="button"
          >
            {isPending
              ? "Đang làm mới..."
              : canRefresh
                ? "Làm mới dữ liệu"
                : `Làm mới sau ${Math.ceil(refreshWaitMs / 1_000)} giây`}
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-black text-white" href="/admin/hoc-vien?add_student=1">
            Tạo học viên
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-black text-slate-900"
            href={`/admin/bao-cao?${reportQuery}`}
          >
            Xem báo cáo / xuất dữ liệu
          </Link>
        </div>
      </header>

      <section aria-label="Chỉ số chính" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard format={formatVnd} label="Doanh thu đã thanh toán" metric={model.kpis.revenue} status={model.dataStatus.orders} />
        <MetricCard format={formatNumber} label="Đơn đã thanh toán" metric={model.kpis.paidOrders} status={model.dataStatus.orders} />
        <MetricCard format={formatNumber} label="Học viên mới" metric={model.kpis.newStudents} status={model.dataStatus.students} />
        <MetricCard format={formatNumber} label="Lead mới" metric={model.kpis.newLeads} status={model.dataStatus.leads} />
      </section>

      <div className="mt-5">
        <Suspense fallback={<div className="h-[320px] animate-pulse rounded-3xl bg-slate-100" />}>
          <PriorityQueue model={model} selectedTaskId={selectedTaskId} />
        </Suspense>
      </div>

      <section aria-labelledby="reports-title" className="mt-5 scroll-mt-24" id="bao-cao">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Báo cáo trực quan</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight" id="reports-title">Sức khỏe kinh doanh</h2>
        </div>
        <ChartErrorBoundary onRetry={refresh} resetKey={model.generatedAt}>
          <Suspense fallback={<ChartSkeleton />}>
            <CommandCenterCharts model={model} />
          </Suspense>
        </ChartErrorBoundary>
      </section>
    </main>
  );
}
