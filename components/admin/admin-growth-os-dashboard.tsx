"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { Course } from "@/data/courses";
import { formatAdminDate } from "@/lib/admin/crm-dashboard";
import type { LeadItem } from "@/services/leadService";
import type { PaymentOrder, OrderStatus } from "@/services/orderService";
import type { StudentAccessRecord } from "@/services/studentAccessService";

type AdminTabId =
  | "dashboard"
  | "crm"
  | "students"
  | "courses"
  | "automation"
  | "clicks"
  | "payments"
  | "reports";

type DashboardProps = {
  orders: PaymentOrder[];
  leads: LeadItem[];
  students: StudentAccessRecord[];
  courses: Course[];
};

type CrmRow = {
  id: string;
  orderCode: string;
  customerName: string;
  contact: string;
  courseTitle: string;
  paymentStatus: OrderStatus | "lead";
  careStatus: string;
  owner: string;
  amountLabel: string;
  createdAt: string;
  source: string;
};

type ClickEventRow = {
  id: string;
  leadName: string;
  source: string;
  landingPage: string;
  eventName: string;
  orderCode: string;
  paymentStatus: string;
  pixelStatus: string;
  createdAt: string;
};

const tabs: { id: AdminTabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "crm", label: "CRM" },
  { id: "students", label: "Học viên" },
  { id: "courses", label: "Khóa học" },
  { id: "automation", label: "Automation" },
  { id: "clicks", label: "Click events" },
  { id: "payments", label: "Payments" },
  { id: "reports", label: "Reports" },
];

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizeContact(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function contactKeys(input: { email?: string; phone?: string; name?: string }) {
  const keys = [
    normalizeContact(input.email),
    normalizeContact(input.phone).replace(/\D/g, ""),
    normalizeContact(input.name),
  ].filter(Boolean);

  return Array.from(new Set(keys));
}

function compactText(value: string, maxLength = 90) {
  const text = value.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function getTrackingField(note: string, label: string) {
  const prefix = `${label}:`;
  const line = note
    .split(/\r?\n/)
    .find((item) => item.trim().toLowerCase().startsWith(prefix.toLowerCase()));

  return line?.slice(prefix.length).trim() ?? "";
}

function newestFirst(a?: string | null, b?: string | null) {
  return Date.parse(b ?? "") - Date.parse(a ?? "");
}

function getPaidTotal(orders: PaymentOrder[]) {
  return orders.filter((order) => order.status === "paid").reduce((total, order) => total + order.amount, 0);
}

function getTodayPaidTotal(orders: PaymentOrder[]) {
  const today = new Date().toLocaleDateString("vi-VN");

  return orders
    .filter((order) => order.status === "paid")
    .filter((order) => new Date(order.paidAt ?? order.createdAt).toLocaleDateString("vi-VN") === today)
    .reduce((total, order) => total + order.amount, 0);
}

function buildDailyRevenue(orders: PaymentOrder[]) {
  const paidOrders = orders.filter((order) => order.status === "paid");
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      value: 0,
    };
  });

  for (const order of paidOrders) {
    const timestamp = Date.parse(order.paidAt ?? order.createdAt);

    if (Number.isNaN(timestamp)) {
      continue;
    }

    const key = new Date(timestamp).toISOString().slice(0, 10);
    const day = days.find((item) => item.key === key);

    if (day) {
      day.value += order.amount;
    }
  }

  const max = Math.max(...days.map((day) => day.value), 1);

  return days.map((day) => ({
    ...day,
    height: Math.max(10, Math.round((day.value / max) * 100)),
  }));
}

function buildCrmRows(orders: PaymentOrder[], leads: LeadItem[]) {
  const contactIndex = new Set<string>();
  const rows: CrmRow[] = orders.map((order) => {
    for (const key of contactKeys({ email: order.email, phone: order.phone, name: order.studentName })) {
      contactIndex.add(key);
    }

    return {
      id: `order:${order.id}`,
      orderCode: order.orderCode,
      customerName: order.studentName || "Chưa có tên",
      contact: order.email || order.phone || "Chưa có liên hệ",
      courseTitle: order.courseTitle || "Chưa chọn khóa học",
      paymentStatus: order.status,
      careStatus: order.status === "paid" ? "Đã cấp quyền" : "Chờ thanh toán",
      owner: "Admin",
      amountLabel: order.amountLabel,
      createdAt: order.createdAt,
      source: order.paymentMethod || "Website",
    };
  });

  for (const lead of leads) {
    const keys = contactKeys({ email: lead.email, phone: lead.phone, name: lead.name });
    const noteCourse = getTrackingField(lead.need, "Khóa");
    const noteOrderCode = getTrackingField(lead.need, "Mã đơn");
    const notePaymentStatus = getTrackingField(lead.need, "Trạng thái");

    if (keys.some((key) => contactIndex.has(key))) {
      continue;
    }

    rows.push({
      id: `lead:${lead.id ?? `${lead.name}-${lead.phone}`}`,
      orderCode: noteOrderCode || "Chưa có đơn",
      customerName: lead.name || "Chưa có tên",
      contact: lead.email || lead.phone || "Chưa có liên hệ",
      courseTitle: noteCourse || compactText(lead.need, 70) || "Chưa chọn khóa học",
      paymentStatus: "lead",
      careStatus: notePaymentStatus || lead.status || "Lead mới",
      owner: "Sale",
      amountLabel: "0đ",
      createdAt: lead.createdAt ?? "",
      source: lead.source || "Website",
    });
  }

  return rows.sort((a, b) => newestFirst(a.createdAt, b.createdAt));
}

function paymentLabel(status: CrmRow["paymentStatus"]) {
  if (status === "paid") {
    return "Đã thanh toán";
  }

  if (status === "failed") {
    return "Không thành công";
  }

  if (status === "expired") {
    return "Hết hạn";
  }

  if (status === "lead") {
    return "Lead mới";
  }

  return "Chưa thanh toán";
}

function statusClass(status: CrmRow["paymentStatus"] | "access" | "pendingAccess") {
  if (status === "paid" || status === "access") {
    return "border-emerald-300/20 bg-emerald-400/12 text-emerald-200";
  }

  if (status === "failed" || status === "expired") {
    return "border-red-300/20 bg-red-400/12 text-red-200";
  }

  if (status === "lead") {
    return "border-sky-300/20 bg-sky-400/12 text-sky-200";
  }

  return "border-amber-300/20 bg-amber-300/10 text-amber-100";
}

function metricTrend(current: number, total: number) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((current / total) * 100)}%`;
}

function topCounts(rows: ClickEventRow[], selector: (row: ClickEventRow) => string) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const value = selector(row) || "Không rõ";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);
}

function buildClickEventAnalytics(leads: LeadItem[], orders: PaymentOrder[]) {
  const paidOrderCodes = new Set(
    orders.filter((order) => order.status === "paid").map((order) => order.orderCode),
  );
  const eventTimeline: ClickEventRow[] = leads
    .map((lead) => {
      const note = lead.need || "";
      const orderCode = getTrackingField(note, "Mã đơn");
      const landingPage = getTrackingField(note, "Landing") || getTrackingField(note, "URL") || lead.source || "Website";
      const utmSource = getTrackingField(note, "UTM source");
      const utmCampaign = getTrackingField(note, "UTM campaign");
      const fbp = getTrackingField(note, "fbp");
      const fbc = getTrackingField(note, "fbc");
      const paymentStatus = getTrackingField(note, "Trạng thái");
      const hasPixel = Boolean(fbp || fbc);
      const hasPaidOrder = orderCode ? paidOrderCodes.has(orderCode) : false;

      return {
        id: lead.id ?? `${lead.name}-${lead.phone}-${lead.createdAt ?? ""}`,
        leadName: lead.name || "Chưa có tên",
        source: utmSource || lead.source || "Website",
        landingPage: compactText(landingPage, 56),
        eventName: hasPaidOrder ? "Payment success" : paymentStatus ? "Start checkout" : "Submit form",
        orderCode: orderCode || "Chưa có đơn",
        paymentStatus: hasPaidOrder ? "paid" : paymentStatus || "lead",
        pixelStatus: hasPixel ? "Pixel Facebook" : "Chưa có pixel",
        createdAt: lead.createdAt ?? "",
        utmCampaign,
      };
    })
    .sort((a, b) => newestFirst(a.createdAt, b.createdAt));
  const pixelReadyCount = eventTimeline.filter((row) => row.pixelStatus === "Pixel Facebook").length;
  const paymentEventCount = eventTimeline.filter((row) => row.eventName === "Payment success").length;

  return {
    eventTimeline,
    topSources: topCounts(eventTimeline, (row) => row.source),
    landingPages: topCounts(eventTimeline, (row) => row.landingPage),
    pixelReadyCount,
    paymentEventCount,
    clickToPaymentRate: metricTrend(paymentEventCount, eventTimeline.length),
  };
}

function MetricCard({
  label,
  value,
  detail,
  tone = "sky",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "sky" | "emerald" | "amber" | "rose";
}) {
  const toneClass = {
    sky: "text-sky-200 bg-sky-400/12 border-sky-300/20",
    emerald: "text-emerald-200 bg-emerald-400/12 border-emerald-300/20",
    amber: "text-amber-100 bg-amber-300/10 border-amber-200/20",
    rose: "text-red-200 bg-red-400/12 border-red-300/20",
  }[tone];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-sky-300/24">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-400">{label}</p>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${toneClass}`}>Live</span>
      </div>
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-white/10 bg-[#111827]/82 ${className}`}>{children}</section>;
}

export function AdminGrowthOsDashboard({ orders, leads, students, courses }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTabId>("dashboard");
  const crmRows = useMemo(() => buildCrmRows(orders, leads), [orders, leads]);
  const revenueSeries = useMemo(() => buildDailyRevenue(orders), [orders]);
  const clickAnalytics = useMemo(() => buildClickEventAnalytics(leads, orders), [leads, orders]);
  const paidOrders = orders.filter((order) => order.status === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const failedOrders = orders.filter((order) => order.status === "failed" || order.status === "expired");
  const grantedStudents = students.filter((student) => student.accessStatus.includes("Có") || student.accessStatus.includes("CÃ³"));
  const revenue = getPaidTotal(orders);
  const todayRevenue = getTodayPaidTotal(orders);
  const conversionRate = metricTrend(paidOrders.length, orders.length);

  return (
    <div className="mx-auto max-w-[1480px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-300/24 bg-sky-400/12 px-3 py-1 text-xs font-bold text-sky-200">
              Growth OS
            </span>
            <span className="rounded-full border border-amber-200/22 bg-amber-200/10 px-3 py-1 text-xs font-bold text-amber-100">
              Realtime
            </span>
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
            CRM + LMS + Marketing Automation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-sky-100/78 md:text-base">
            Vận hành lead, học viên, khóa học, thanh toán, tracking và automation bằng dữ liệu đang có trong website chính.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/leads"
            className="rounded-md border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white transition hover:border-sky-300/30 hover:bg-sky-400/12"
          >
            Thêm lead
          </Link>
          <Link
            href="/admin/hoc-vien"
            className="rounded-md bg-sky-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-300"
          >
            Tạo học viên
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.04] p-1">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-9 rounded-md px-4 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Tổng doanh thu" value={formatVnd(revenue)} detail={`${paidOrders.length} đơn đã thanh toán`} tone="emerald" />
            <MetricCard label="Doanh thu hôm nay" value={formatVnd(todayRevenue)} detail="Tính theo đơn paid trong ngày" tone="sky" />
            <MetricCard label="Tổng học viên" value={String(students.length)} detail={`${grantedStudents.length} hồ sơ đã có quyền học`} tone="amber" />
            <MetricCard label="Tổng khóa học" value={String(courses.length)} detail="Giữ nguyên dữ liệu khóa học hiện có" tone="sky" />
            <MetricCard label="Tổng leads" value={String(leads.length)} detail={`${crmRows.length} dòng CRM sau khi gộp trùng`} tone="rose" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Panel className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Revenue chart</p>
                  <h2 className="mt-2 text-xl font-black text-white">Doanh thu 7 ngày gần nhất</h2>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1 text-xs font-bold text-emerald-200">
                  Conversion {conversionRate}
                </span>
              </div>
              <div className="mt-6 flex h-64 items-end gap-3 rounded-lg border border-white/8 bg-[#0b0f19] p-4">
                {revenueSeries.map((day) => (
                  <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-2">
                    <div
                      className="rounded-t-md bg-sky-400/78 shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                      style={{ height: `${day.height}%` }}
                      title={`${day.key}: ${formatVnd(day.value)}`}
                    />
                    <span className="truncate text-center text-[11px] font-medium text-slate-500">{day.key.slice(5)}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="text-xs font-bold uppercase text-slate-500">Funnel conversion</p>
              <h2 className="mt-2 text-xl font-black text-white">Từ lead đến quyền học</h2>
              <div className="mt-5 grid gap-3">
                {[
                  ["Lead mới", leads.length, "Cần chăm sóc"],
                  ["Chờ thanh toán", pendingOrders.length, "Đơn cần theo dõi"],
                  ["Đã thanh toán", paidOrders.length, "Doanh thu ghi nhận"],
                  ["Đã cấp quyền", grantedStudents.length, "Học viên có quyền học"],
                ].map(([label, value, detail]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-white">{label}</p>
                        <p className="mt-1 text-sm text-slate-400">{detail}</p>
                      </div>
                      <span className="text-2xl font-black text-sky-200">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === "crm" ? (
        <Panel className="mt-4 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Lead CRM management</h2>
              <p className="mt-1 text-sm text-sky-100/72">{crmRows.length} dòng từ Supabase, đơn hàng và website cũ</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/leads" className="rounded-md bg-sky-400 px-3 py-2 text-sm font-black text-slate-950">
                Thêm lead
              </Link>
              <Link href="/admin/don-hang" className="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-slate-200">
                Export
              </Link>
              <Link href="/admin/hoc-vien" className="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-slate-200">
                Bulk action
              </Link>
            </div>
          </div>
          <div className="border-b border-white/10 p-4">
            <div className="flex max-w-lg items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-400">
              <span aria-hidden="true">⌕</span>
              <span>Tìm lead, SĐT, khóa học, nguồn...</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-white/[0.035] text-xs uppercase text-sky-200/70">
                <tr>
                  <th className="px-4 py-3">STT - Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Khóa học</th>
                  <th className="px-4 py-3">Thanh toán</th>
                  <th className="px-4 py-3">Chăm sóc</th>
                  <th className="px-4 py-3">Phụ trách</th>
                  <th className="px-4 py-3">Đã thu</th>
                  <th className="px-4 py-3">Nguồn</th>
                </tr>
              </thead>
              <tbody>
                {crmRows.map((row, index) => (
                  <tr key={row.id} className="border-t border-white/8 align-top transition hover:bg-white/[0.035]">
                    <td className="px-4 py-4 font-mono text-xs text-sky-200">
                      {index + 1} - {row.orderCode}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-white">{row.customerName}</p>
                      <p className="mt-1 text-xs text-slate-400">{row.contact}</p>
                    </td>
                    <td className="max-w-sm px-4 py-4 text-slate-300">{row.courseTitle}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(row.paymentStatus)}`}>
                        {paymentLabel(row.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{row.careStatus}</td>
                    <td className="px-4 py-4 text-slate-300">{row.owner}</td>
                    <td className="px-4 py-4 font-bold text-white">{row.amountLabel}</td>
                    <td className="px-4 py-4 text-slate-400">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {activeTab === "students" ? (
        <Panel className="mt-4 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Học viên và quyền khóa học</h2>
              <p className="mt-1 text-sm text-slate-400">Danh sách tổng hợp từ đơn hàng paid và hồ sơ admin-student.</p>
            </div>
            <Link href="/admin/hoc-vien" className="rounded-md bg-sky-400 px-3 py-2 text-sm font-black text-slate-950">
              Thêm học viên
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white/[0.035] text-xs uppercase text-sky-200/70">
                <tr>
                  <th className="px-4 py-3">Học viên</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Khóa học</th>
                  <th className="px-4 py-3">Đơn hàng</th>
                  <th className="px-4 py-3">Quyền học</th>
                  <th className="px-4 py-3">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const hasAccess = student.accessStatus.includes("Có") || student.accessStatus.includes("CÃ³");

                  return (
                    <tr key={student.id} className="border-t border-white/8 align-top">
                      <td className="px-4 py-4 font-bold text-white">{student.name || "Chưa có tên"}</td>
                      <td className="px-4 py-4 text-slate-300">
                        {student.email || "Chưa có email"}
                        <p className="mt-1 text-xs text-slate-500">{student.phone || "Chưa có SĐT"}</p>
                      </td>
                      <td className="max-w-sm px-4 py-4 text-slate-300">
                        {student.courseTitles.length > 0 ? student.courseTitles.join(", ") : "Chưa chọn khóa"}
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {student.paidOrderCodes[0] ?? student.pendingOrderCodes[0] ?? "Chưa có đơn"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(hasAccess ? "access" : "pendingAccess")}`}>
                          {hasAccess ? "Có quyền học" : "Chờ cấp quyền"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatAdminDate(student.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {activeTab === "courses" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Panel key={course.slug} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{course.statusLabel}</p>
                  <h2 className="mt-2 text-lg font-black text-white">{course.title}</h2>
                </div>
                <span className="rounded-full border border-sky-300/20 bg-sky-400/12 px-2 py-1 text-xs font-bold text-sky-200">
                  {course.modules.length} module
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{course.shortDescription || course.description}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="font-black text-amber-100">{course.price || "Chưa đặt giá"}</span>
                <Link href="/admin/khoa-hoc" className="text-sm font-bold text-sky-200 hover:text-sky-100">
                  Quản lý
                </Link>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {activeTab === "automation" ? (
        <Panel className="mt-4 p-5">
          <p className="text-xs font-bold uppercase text-slate-500">Email Marketing Automation</p>
          <h2 className="mt-2 text-xl font-black text-white">Luồng chăm sóc đang dùng logic website chính</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {["Đăng ký mới", "Nhắc thanh toán", "Thanh toán thành công"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="font-bold text-white">{item}</p>
                <p className="mt-2 text-sm text-slate-400">Kết nối qua API email hiện có, không đổi dữ liệu học viên.</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "clicks" ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard
              label="Tracked events"
              value={String(clickAnalytics.eventTimeline.length)}
              detail="Submit form, checkout và payment từ CRM"
              tone="sky"
            />
            <MetricCard
              label="Pixel Facebook"
              value={String(clickAnalytics.pixelReadyCount)}
              detail="Lead có fbp/fbc để retarget"
              tone="emerald"
            />
            <MetricCard
              label="Click → payment"
              value={clickAnalytics.clickToPaymentRate}
              detail="Đơn paid trên tổng event có tracking"
              tone="amber"
            />
            <MetricCard
              label="UTM source"
              value={String(clickAnalytics.topSources.length)}
              detail="Nguồn traffic đang ghi nhận"
              tone="rose"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.75fr_0.75fr_1.5fr]">
            <Panel className="p-5">
              <p className="text-xs font-bold uppercase text-slate-500">Top sources</p>
              <h2 className="mt-2 text-xl font-black text-white">Nguồn traffic</h2>
              <div className="mt-5 grid gap-3">
                {clickAnalytics.topSources.length > 0 ? (
                  clickAnalytics.topSources.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <span className="truncate text-sm font-bold text-slate-200">{item.label}</span>
                      <span className="rounded-full border border-sky-300/20 bg-sky-400/12 px-2 py-1 text-xs font-black text-sky-200">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Chưa có UTM source.</p>
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="text-xs font-bold uppercase text-slate-500">Landing pages</p>
              <h2 className="mt-2 text-xl font-black text-white">Trang tạo chuyển đổi</h2>
              <div className="mt-5 grid gap-3">
                {clickAnalytics.landingPages.length > 0 ? (
                  clickAnalytics.landingPages.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <span className="truncate text-sm font-bold text-slate-200">{item.label}</span>
                      <span className="rounded-full border border-amber-200/20 bg-amber-200/10 px-2 py-1 text-xs font-black text-amber-100">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Chưa có landing page.</p>
                )}
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="border-b border-white/10 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Event timeline</p>
                <h2 className="mt-2 text-xl font-black text-white">Click events từ lead/order hiện có</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-white/[0.035] text-xs uppercase text-sky-200/70">
                    <tr>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Landing</th>
                      <th className="px-4 py-3">Nguồn</th>
                      <th className="px-4 py-3">Mã đơn</th>
                      <th className="px-4 py-3">Pixel</th>
                      <th className="px-4 py-3">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickAnalytics.eventTimeline.map((event) => (
                      <tr key={event.id} className="border-t border-white/8 align-top transition hover:bg-white/[0.035]">
                        <td className="px-4 py-4 font-bold text-white">{event.leadName}</td>
                        <td className="px-4 py-4">
                          <span className="rounded-full border border-sky-300/20 bg-sky-400/12 px-2 py-1 text-xs font-bold text-sky-200">
                            {event.eventName}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-4 text-slate-300">{event.landingPage}</td>
                        <td className="px-4 py-4 text-slate-300">{event.source}</td>
                        <td className="px-4 py-4 font-mono text-xs text-sky-200">{event.orderCode}</td>
                        <td className="px-4 py-4 text-slate-300">{event.pixelStatus}</td>
                        <td className="px-4 py-4 text-slate-500">{formatAdminDate(event.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === "payments" ? (
        <Panel className="mt-4 overflow-hidden">
          <div className="border-b border-white/10 p-4">
            <h2 className="text-xl font-black text-white">Payment management</h2>
            <p className="mt-1 text-sm text-slate-400">
              {paidOrders.length} thành công, {pendingOrders.length} chờ thanh toán, {failedOrders.length} không thành công hoặc hết hạn.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-white/[0.035] text-xs uppercase text-sky-200/70">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Học viên</th>
                  <th className="px-4 py-3">Khóa học</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-white/8">
                    <td className="px-4 py-4 font-mono text-xs text-sky-200">{order.orderCode}</td>
                    <td className="px-4 py-4 text-white">{order.studentName || "Chưa có tên"}</td>
                    <td className="px-4 py-4 text-slate-300">{order.courseTitle || "Chưa chọn khóa"}</td>
                    <td className="px-4 py-4 font-bold text-white">{order.amountLabel}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(order.status)}`}>
                        {paymentLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {activeTab === "reports" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MetricCard label="Revenue" value={formatVnd(revenue)} detail="Tổng doanh thu đã ghi nhận" tone="emerald" />
          <MetricCard label="Funnel" value={conversionRate} detail="Đơn paid trên tổng đơn" tone="sky" />
          <MetricCard label="Student activity" value={String(grantedStudents.length)} detail="Học viên đang có quyền học" tone="amber" />
        </div>
      ) : null}
    </div>
  );
}
