"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useTransition } from "react";
import { ChartErrorBoundary } from "@/components/admin/solo-command-center/chart-error-boundary";
import { safeCourseDisplayTitle } from "@/lib/admin/course-display";
import type { SoloCommandCenterModel } from "@/lib/admin/solo-command-center";

const CommandCenterCharts = dynamic(
  () => import("@/components/admin/solo-command-center/command-center-charts").then((module) => module.CommandCenterCharts),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const TIME_ZONE = "Asia/Ho_Chi_Minh";

function ChartSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2" role="status">
      <div className="h-[360px] animate-pulse rounded-3xl bg-slate-100" />
      <div className="h-[360px] animate-pulse rounded-3xl bg-slate-100" />
      <span className="sr-only">Đang tải biểu đồ báo cáo</span>
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

export function CommandCenterReport({ model }: { model: SoloCommandCenterModel }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const exportQuery = new URLSearchParams(model.range).toString();
  const courseSourceReady = model.dataStatus.orders === "ready" && model.dataStatus.courses === "ready";
  const funnelSourceReady = ["leads", "orders", "students"].every(
    (source) => model.dataStatus[source as "leads" | "orders" | "students"] === "ready",
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <main className="mx-auto max-w-[1600px] text-slate-950">
      <header className="rounded-3xl bg-[#f2eadf] p-5 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9a5a12]">Báo cáo điều hành</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Báo cáo kinh doanh chi tiết</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              Số liệu tổng hợp theo ngày Việt Nam. Múi giờ: {TIME_ZONE}.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">Cập nhật lần cuối: {formatGeneratedAt(model.generatedAt)}</p>
          </div>

          <form action="/admin/bao-cao" className="flex flex-wrap items-end gap-2" method="get">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Từ ngày
              <input className="min-h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold" defaultValue={model.range.from} disabled={isPending} name="from" required type="date" />
            </label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">
              Đến ngày
              <input className="min-h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold" defaultValue={model.range.to} disabled={isPending} name="to" required type="date" />
            </label>
            <button className="min-h-11 rounded-full bg-slate-950 px-5 text-sm font-black text-white" disabled={isPending} type="submit">Áp dụng</button>
          </form>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="min-h-11 rounded-full border border-slate-300 bg-white px-5 text-sm font-black" disabled={isPending} onClick={refresh} type="button">
            {isPending ? "Đang làm mới..." : "Làm mới báo cáo"}
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-black text-white" href={`/api/admin/reports/export?${exportQuery}`}>
            Xuất CSV tổng hợp
          </Link>
        </div>
      </header>

      <section aria-labelledby="chart-report-title" className="mt-6">
        <h2 className="text-2xl font-black tracking-tight" id="chart-report-title">Sáu góc nhìn dữ liệu</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">Mỗi biểu đồ tự hiển thị lỗi hoặc trạng thái trống theo đúng nguồn phụ thuộc.</p>
        <div className="mt-4">
          <ChartErrorBoundary onRetry={refresh} resetKey={model.generatedAt}>
            <Suspense fallback={<ChartSkeleton />}>
              <CommandCenterCharts model={model} />
            </Suspense>
          </ChartErrorBoundary>
        </div>
      </section>

      <section aria-labelledby="course-report-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-black" id="course-report-title">So sánh khóa học</h2>
        {!courseSourceReady ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-800" role="status">Không tải đủ nguồn đơn hàng hoặc khóa học.</p>
        ) : model.topCourses.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Chưa có khóa học phát sinh đơn paid trong kỳ.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 font-black">Khóa học</th><th className="px-3 py-3 text-right font-black">Doanh thu paid</th><th className="px-3 py-3 text-right font-black">Đơn paid</th></tr></thead>
              <tbody>{model.topCourses.map((row) => (
                <tr className="border-b border-slate-100" key={row.slug}><td className="px-3 py-3 font-bold">{safeCourseDisplayTitle(row)}</td><td className="px-3 py-3 text-right font-bold">{formatVnd(row.revenue)}</td><td className="px-3 py-3 text-right font-bold">{formatNumber(row.paidOrders)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="funnel-report-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-black" id="funnel-report-title">Chi tiết phễu cohort</h2>
        {!funnelSourceReady ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-800" role="status">Không tải đủ nguồn leads, đơn hàng hoặc học viên.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 font-black">Giai đoạn</th><th className="px-3 py-3 text-right font-black">Số lượng</th><th className="px-3 py-3 text-right font-black">Tỷ lệ từ lead</th></tr></thead>
                <tbody>{model.funnel.rows.map((row) => (
                  <tr className="border-b border-slate-100" key={row.stage}><td className="px-3 py-3 font-bold">{row.label}</td><td className="px-3 py-3 text-right font-bold">{formatNumber(row.count)}</td><td className="px-3 py-3 text-right font-bold">{row.conversionPercent}%</td></tr>
                ))}</tbody>
              </table>
            </div>
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-800">Bản ghi chưa liên kết: {formatNumber(model.funnel.unlinkedCount)}</p>
          </>
        )}
      </section>

      <section aria-labelledby="definitions-title" className="mt-6 rounded-3xl bg-slate-950 p-5 text-white sm:p-7">
        <h2 className="text-xl font-black" id="definitions-title">Định nghĩa dữ liệu</h2>
        <dl className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-2">
          <div><dt className="font-black">Doanh thu và đơn paid</dt><dd className="mt-1 text-white/70">Chỉ tính đơn có trạng thái đã thanh toán trong khoảng ngày được chọn.</dd></div>
          <div><dt className="font-black">Học viên mới</dt><dd className="mt-1 text-white/70">Lần cấp quyền đầu tiên của học viên trong kỳ, phân loại paid, miễn phí hoặc dùng thử.</dd></div>
          <div><dt className="font-black">Lead mới</dt><dd className="mt-1 text-white/70">Lead được tạo trong khoảng ngày được chọn.</dd></div>
          <div><dt className="font-black">Liên kết phễu</dt><dd className="mt-1 text-white/70">Ghép email trước, sau đó số điện thoại; số chưa ghép được công bố riêng.</dd></div>
        </dl>
      </section>
    </main>
  );
}
