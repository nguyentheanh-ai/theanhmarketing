"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Filter,
  Gauge,
  GitBranch,
  Inbox,
  Mail,
  Plug,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEventHandler, ReactNode } from "react";
import type { CrmEvent, CrmListQuery, CrmTableColumn, KpiMetric } from "@/lib/crm-v2/types";

const primaryNavItems = [
  { href: "/admin/crm-v2", label: "Tổng quan", icon: Gauge, exact: true },
  { href: "/admin/crm-v2/leads", label: "Khách hàng", icon: GitBranch },
  { href: "/admin/crm-v2/orders", label: "Đơn hàng", icon: CreditCard },
  { href: "/admin/crm-v2/students", label: "Học viên", icon: Users, excludeView: "courses" },
  { href: "/admin/crm-v2/students?view=courses", label: "Khóa học", icon: BookOpen, requiredView: "courses" },
  { href: "/admin/crm-v2/email", label: "Email", icon: Mail },
  { href: "/admin/crm-v2/automation", label: "Automation", icon: Bot },
  { href: "/admin/crm-v2/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/admin/cai-dat", label: "Cài đặt", icon: Settings2 },
];

const advancedNavItems = [
  { href: "/admin/crm-v2/activity", label: "Lịch sử hoạt động", icon: Activity },
  { href: "/admin/crm-v2/segments", label: "Phân khúc & Tag", icon: Tags },
  { href: "/admin/crm-v2/team", label: "Team & Phân quyền", icon: ShieldCheck },
  { href: "/admin/crm-v2/integrations", label: "Tích hợp", icon: Plug },
];

type CrmNavItem = (typeof primaryNavItems)[number] | (typeof advancedNavItems)[number];

const toneClasses = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

const solidToneClasses = {
  blue: "bg-blue-600",
  green: "bg-emerald-600",
  orange: "bg-orange-500",
  purple: "bg-violet-600",
  red: "bg-rose-600",
  slate: "bg-slate-500",
};

const actionButtonClassName =
  "inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50";

const crmRangeOptions = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
];

type FilterBarItem = {
  label: string;
  value?: string;
  href?: string;
  param?: string;
  options?: Array<{ label: string; value: string }>;
};

type CrmRouteFeedbackDetail = {
  label?: string;
  fallbackMs?: number;
};

const crmRouteFeedbackEvent = "crm-v2:route-feedback";

function announceCrmRouteFeedback(detail: CrmRouteFeedbackDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CrmRouteFeedbackDetail>(crmRouteFeedbackEvent, { detail }));
}

export function CrmShell({ children, disabled = false }: { children: ReactNode; disabled?: boolean }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f6f9] text-slate-950">
      <CrmRouteFeedback />
      <div className="flex min-h-screen">
        <CrmSidebar />
        <div className="min-w-0 flex-1 overflow-x-hidden">
          <CrmTopbar disabled={disabled} />
          <CrmMobileNav />
          <main className="mx-auto w-full min-w-0 max-w-[1560px] px-4 py-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function CrmRouteFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState("Đang tải màn CRM");
  const [width, setWidth] = useState(0);
  const fallbackRef = useRef<number | null>(null);
  const finishRef = useRef<number | null>(null);
  const widthRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (fallbackRef.current !== null) window.clearTimeout(fallbackRef.current);
      if (finishRef.current !== null) window.clearTimeout(finishRef.current);
      if (widthRef.current !== null) window.clearTimeout(widthRef.current);
      fallbackRef.current = null;
      finishRef.current = null;
      widthRef.current = null;
    };

    const stop = () => {
      clearTimers();
      setWidth(100);
      document.documentElement.removeAttribute("data-crm-route-pending");
      finishRef.current = window.setTimeout(() => {
        setActive(false);
        setWidth(0);
        finishRef.current = null;
      }, 220);
    };

    const start = (detail: CrmRouteFeedbackDetail = {}) => {
      clearTimers();
      setLabel(detail.label ?? "Đang tải màn CRM");
      setActive(true);
      setWidth(16);
      document.documentElement.setAttribute("data-crm-route-pending", "true");
      widthRef.current = window.setTimeout(() => {
        setWidth(78);
        widthRef.current = null;
      }, 80);
      fallbackRef.current = window.setTimeout(stop, detail.fallbackMs ?? 5200);
    };

    const onFeedbackStart = (event: Event) => {
      start((event as CustomEvent<CrmRouteFeedbackDetail>).detail ?? {});
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const downloadAttr = anchor.getAttribute("download");
      if (!href || targetAttr === "_blank" || downloadAttr !== null || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const destination = new URL(href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin || !destination.pathname.startsWith("/admin/crm-v2")) {
        return;
      }
      if (destination.href === current.href) {
        return;
      }

      start({ label: "Đang chuyển màn CRM" });
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      const action = new URL(form.action || window.location.href, window.location.href);
      if (action.origin === window.location.origin && action.pathname.startsWith("/admin/crm-v2")) {
        start({ label: "Đang lọc dữ liệu CRM" });
      }
    };

    window.addEventListener(crmRouteFeedbackEvent, onFeedbackStart);
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener(crmRouteFeedbackEvent, onFeedbackStart);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      clearTimers();
      document.documentElement.removeAttribute("data-crm-route-pending");
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const finish = window.setTimeout(() => {
      setWidth(100);
      document.documentElement.removeAttribute("data-crm-route-pending");
      finishRef.current = window.setTimeout(() => {
        setActive(false);
        setWidth(0);
        finishRef.current = null;
      }, 220);
    }, 120);
    return () => window.clearTimeout(finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return (
    <>
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-[85] h-1 bg-transparent" aria-hidden="true">
        <div
          className={`h-full bg-gradient-to-r from-sky-400 via-blue-600 to-violet-500 shadow-[0_0_18px_rgba(37,99,235,0.35)] transition-all duration-300 ease-out ${
            active ? "opacity-100" : "opacity-0"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      {active ? (
        <div
          className="pointer-events-none fixed right-4 top-20 z-[85] hidden items-center gap-2 rounded-lg border border-blue-100 bg-white/95 px-3 py-2 text-xs font-black text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur sm:flex"
          aria-live="polite"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
          {label}
        </div>
      ) : null}
    </>
  );
}

export function CrmSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = (item: CrmNavItem) => {
    const itemPath = item.href.split("?")[0];
    const pathMatches = "exact" in item && item.exact ? pathname === itemPath : pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    if (!pathMatches) return false;
    if ("requiredView" in item && item.requiredView) return searchParams.get("view") === item.requiredView;
    if ("excludeView" in item && item.excludeView) return searchParams.get("view") !== item.excludeView;
    return true;
  };

  const renderItem = (item: CrmNavItem) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
          active
            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
        }`}
      >
        <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-800"}`} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">TA</div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">Executive Operating System</div>
              <div className="mt-0.5 text-base font-black text-slate-950">The Anh Marketing</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">{primaryNavItems.map(renderItem)}</div>
          <div className="my-4 border-t border-slate-200" />
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Nâng cao</p>
          <div className="space-y-1">{advancedNavItems.map(renderItem)}</div>
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-black"><ShieldCheck className="size-4" /> Chế độ vận hành an toàn</div>
            <div className="mt-1.5 leading-5 text-emerald-800">Mọi chỉ số trên màn hình được đọc từ dữ liệu thật.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function CrmMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden" aria-label="Điều hướng quản trị">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {primaryNavItems.map((item) => {
          const itemPath = item.href.split("?")[0];
          const active = pathname === itemPath;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CrmTopbar({ disabled = false }: { disabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hiddenParams: Array<[string, string]> = [];
  searchParams.forEach((value, key) => {
    if (key !== "q" && key !== "page" && value) hiddenParams.push([key, value]);
  });
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1560px] flex-wrap items-center gap-3 px-4 py-2 sm:flex-nowrap sm:px-6 lg:px-8">
        <form action={pathname} method="get" className="order-2 flex w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:order-none sm:min-w-[320px] sm:flex-1 lg:min-w-[360px] xl:min-w-[420px]">
          {hiddenParams.map(([key, value]) => (
            <input key={`${key}:${value}`} type="hidden" name={key} value={value} />
          ))}
          <Search className="h-4 w-4 shrink-0" />
          <input
            aria-label="Tìm kiếm CRM v2"
            className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
            defaultValue={searchParams.get("q") ?? ""}
            name="q"
            placeholder="Tìm tên, email, số điện thoại, mã đơn..."
            type="search"
          />
          <button className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-black text-white" type="submit">
            Tìm
          </button>
        </form>
        <CrmGlobalDateControl />
        <button
          aria-label="Đồng bộ CRM v2"
          className="order-1 inline-flex min-h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:order-none"
          data-crm-action="button"
          onClick={() => {
            announceCrmRouteFeedback({ label: "Đang đồng bộ CRM", fallbackMs: 1200 });
            router.refresh();
          }}
          title="Đồng bộ"
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="order-1 sm:order-none">
          <StatusBadge tone={disabled ? "orange" : "green"}>{disabled ? "Chưa khả dụng" : "Bản CRM mới"}</StatusBadge>
        </span>
      </div>
    </header>
  );
}

export function CrmGlobalDateControl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeRange = searchParams.get("range") ?? "30d";
  const customButtonLabel = pathname === "/admin/crm-v2/reports" && searchParams.get("view") === "period" ? "Xem giai đoạn" : "Xem";
  const makeRangeHref = (option: (typeof crmRangeOptions)[number]) => {
    const rangeParams = new URLSearchParams(searchParams.toString());
    rangeParams.set("range", option.value);
    rangeParams.delete("dateFrom");
    rangeParams.delete("dateTo");
    rangeParams.delete("page");
    const rangeQuery = rangeParams.toString();
    return `${pathname}${rangeQuery ? `?${rangeQuery}` : ""}`;
  };

  return (
    <div className="order-1 flex shrink-0 flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 sm:order-none">
      <CalendarDays className="ml-2 h-4 w-4 text-slate-500" />
      {crmRangeOptions.map((option) => (
        <Link
          key={option.value}
          className={`inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-black ${
            activeRange === option.value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
          data-crm-action="link"
          href={makeRangeHref(option)}
        >
          {option.label}
        </Link>
      ))}
      <form action={pathname} className="ml-1 flex items-center gap-1" method="get">
        {Array.from(searchParams.entries())
          .filter(([key]) => !["range", "dateFrom", "dateTo", "page"].includes(key))
          .map(([key, value]) => (
            <input key={`${key}:${value}`} type="hidden" name={key} value={value} />
          ))}
        <input type="hidden" name="range" value="custom" />
        <input aria-label="Từ ngày" className="h-7 w-28 rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-700" defaultValue={searchParams.get("dateFrom") ?? ""} name="dateFrom" type="date" />
        <input aria-label="Đến ngày" className="h-7 w-28 rounded-md border border-slate-200 px-2 text-xs font-bold text-slate-700" defaultValue={searchParams.get("dateTo") ?? ""} name="dateTo" type="date" />
        <button className="h-7 rounded-md bg-slate-950 px-2 text-xs font-black text-white" type="submit">
          {customButtonLabel}
        </button>
      </form>
    </div>
  );
}

export function CrmPaginationBar({
  basePath,
  query,
  page,
  pageSize,
  pageCount,
  total,
}: {
  basePath: string;
  query: CrmListQuery;
  page: number;
  pageSize: 10 | 20 | 50;
  pageCount: number;
  total: number;
}) {
  const createPath = (nextPage: number, nextPageSize = query.pageSize) => {
    const params = new URLSearchParams();
    if (query.search) params.set("q", query.search);
    if (query.range) params.set("range", query.range);
    if (query.dateFrom) params.set("dateFrom", query.dateFrom);
    if (query.dateTo) params.set("dateTo", query.dateTo);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    if (query.filters?.stage) params.set("stage", query.filters.stage);
    if (query.filters?.source) params.set("source", query.filters.source);
    if (query.filters?.owner) params.set("owner", query.filters.owner);
    if (query.filters?.course) params.set("course", query.filters.course);
    if (query.filters?.status) params.set("status", query.filters.status);
    if (query.filters?.role) params.set("role", query.filters.role);
    params.set("page", String(nextPage));
    params.set("pageSize", String(nextPageSize));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <form className="flex flex-wrap gap-2" action={basePath} method="get">
          <input
            name="q"
            defaultValue={query.search ?? ""}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            placeholder="Tìm tên/email/sđt/mã đơn..."
            aria-label="Tìm kiếm CRM"
          />
          <input type="hidden" name="sortBy" value={query.sortBy ?? ""} />
          <input type="hidden" name="sortDirection" value={query.sortDirection ?? ""} />
          {query.filters?.stage ? <input type="hidden" name="stage" value={query.filters.stage} /> : null}
          {query.filters?.source ? <input type="hidden" name="source" value={query.filters.source} /> : null}
          {query.filters?.owner ? <input type="hidden" name="owner" value={query.filters.owner} /> : null}
          {query.filters?.course ? <input type="hidden" name="course" value={query.filters.course} /> : null}
          {query.filters?.status ? <input type="hidden" name="status" value={query.filters.status} /> : null}
          {query.filters?.role ? <input type="hidden" name="role" value={query.filters.role} /> : null}
          <input type="hidden" name="range" value={query.range} />
          {query.dateFrom ? <input type="hidden" name="dateFrom" value={query.dateFrom} /> : null}
          {query.dateTo ? <input type="hidden" name="dateTo" value={query.dateTo} /> : null}
          <label htmlFor="pageSize" className="sr-only">
            Lựa chọn số dòng/trang
          </label>
          <select
            name="pageSize"
            id="pageSize"
            defaultValue={pageSize}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            onChange={(event) => {
              const nextPageSize = Number(event.currentTarget.value);
              if (Number.isFinite(nextPageSize)) {
                const safePageSize =
                  nextPageSize === 10 || nextPageSize === 20 || nextPageSize === 50 ? (nextPageSize as 10 | 20 | 50) : 20;
                window.location.href = createPath(1, safePageSize);
              }
            }}
          >
            {[10, 20, 50].map((value) => (
              <option key={value} value={value}>
                {value}/trang
              </option>
            ))}
          </select>
          <button type="submit" className="inline-flex min-w-16 items-center justify-center rounded-lg border border-slate-200 bg-blue-600 px-3 text-sm font-bold text-white">
            Lọc
          </button>
        </form>
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex min-w-16 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
            href={createPath(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
          >
            Trước
          </Link>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            {page}/{pageCount}
          </span>
          <span className="text-sm text-slate-500">({total} bản ghi)</span>
          <Link
            className="inline-flex min-w-16 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
            href={createPath(Math.min(pageCount, page + 1))}
            aria-disabled={page >= pageCount}
          >
            Sau
          </Link>
        </div>
      </div>
    </section>
  );
}

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const tone = metric.tone ?? "slate";
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{metric.label}</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{metric.value}</div>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${toneClasses[tone]}`}>{metric.delta ?? "On track"}</span>
      </div>
      <div className="mt-4">
        <Sparkline values={metric.series ?? [1, 2, 3, 4, 5]} tone={tone} />
      </div>
    </section>
  );
}

export function Sparkline({ values, tone = "blue" }: { values: number[]; tone?: NonNullable<KpiMetric["tone"]> }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 160;
      const y = 42 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg aria-hidden="true" className="h-12 w-full" preserveAspectRatio="none" viewBox="0 0 160 48">
      <polyline fill="none" points={points} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className={toneTextClass(tone)} />
    </svg>
  );
}

export function MetricGrid({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <KpiCard key={metric.label} metric={metric} />
      ))}
    </div>
  );
}

export function CrmDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyLabel = "Không có dữ liệu",
  selectable = false,
  selectedIds,
  onSelectedRowsChange,
  rowIdKey = "id",
}: {
  columns: CrmTableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedRowsChange?: (ids: string[]) => void;
  rowIdKey?: keyof T | "id";
}) {
  const controlledSelectedIds = selectedIds ?? [];
  const rowIds = rows.map((row) => String(row[rowIdKey as keyof T] ?? ""));
  const hasAllRowsSelected = rows.length > 0 && rowIds.every((id) => id && controlledSelectedIds.includes(id));

  const setSelection = (nextIds: string[]) => {
    if (!onSelectedRowsChange) return;
    onSelectedRowsChange(Array.from(new Set(nextIds.filter(Boolean))));
  };

  const toggleAll = (checked: boolean) => {
    if (!onSelectedRowsChange) return;
    if (checked) {
      setSelection([...controlledSelectedIds, ...rowIds.filter(Boolean)]);
    } else {
      setSelection(controlledSelectedIds.filter((id) => !rowIds.includes(id)));
    }
  };

  const tableColumns: ColumnDef<T>[] = [
    ...(selectable
      ? [
          {
            id: "_select",
            header: () => (
              <input
                type="checkbox"
                aria-label="chọn toàn bộ dòng trên trang"
                checked={hasAllRowsSelected}
                onChange={(event) => toggleAll(event.target.checked)}
              />
            ),
            cell: ({ row }: { row: { original: T } }) => {
              const rowId = String(row.original[rowIdKey as keyof T] ?? "");
              if (!rowId) return null;
              return (
                <input
                  type="checkbox"
                  aria-label={`chọn dòng ${rowId}`}
                  checked={controlledSelectedIds.includes(rowId)}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelection([...controlledSelectedIds, rowId]);
                    } else {
                      setSelection(controlledSelectedIds.filter((value) => value !== rowId));
                    }
                  }}
                />
              );
            },
          },
        ]
      : []),
    ...columns.map((column) => ({
      id: String(column.key),
      accessorFn: (row: T) => row[column.key as keyof T],
      header: column.label,
      cell: ({ row }: { row: { original: T } }) =>
        column.render ? column.render(row.original) : renderCell(String(column.key), row.original[column.key as keyof T]),
    })),
  ];

  // TanStack Table intentionally returns non-memoizable APIs in this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row[rowIdKey as keyof T] ?? ""),
  });

  if (!rows.length) return <EmptyState title={emptyLabel} description="Điều chỉnh bộ lọc hoặc kiểm tra trạng thái sync CRM v2." />;

  return (
    <div className="max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[1360px] table-fixed border-separate border-spacing-0 text-[13px]">
          <colgroup>
            {table.getAllLeafColumns().map((column) => (
              <col key={column.id} style={{ width: getColumnWidth(column.id, columns) }} />
            ))}
          </colgroup>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="whitespace-normal border-b border-slate-200 px-3 py-3 text-left font-bold leading-snug">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {row.getVisibleCells().map((cell) => {
                  const cellKey = cell.column.id;
                  const compact = isCompactTableCell(cellKey);
                  return (
                    <td
                      key={cell.id}
                      className={`border-b border-slate-100 px-3 py-3 align-top text-slate-700 ${
                        compact ? "whitespace-nowrap" : "min-w-0 whitespace-normal break-words leading-5"
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderCell(key: string, value: unknown) {
  if (key === "stage" || key === "status" || key === "emailStatus") {
    return <StatusBadge tone={statusTone(String(value))}>{displayStatusLabel(key, String(value))}</StatusBadge>;
  }
  if (key === "owner") return <OwnerAvatar name={String(value)} showName />;
  if (typeof value === "number" && (key.toLowerCase().includes("value") || key.toLowerCase().includes("revenue"))) {
    return <span className="font-bold text-slate-950">{new Intl.NumberFormat("vi-VN").format(value)}đ</span>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item) => (
          <StatusBadge key={String(item)} tone="slate">
            {String(item)}
          </StatusBadge>
        ))}
      </div>
    );
  }
  const text = String(value ?? "");
  if (key === "course" || key === "product" || key === "nextAction") {
    return (
      <span className="line-clamp-2 leading-5 text-slate-700" title={text}>
        {text}
      </span>
    );
  }
  return <span>{text}</span>;
}

function isCompactTableCell(key: string) {
  return ["_select", "phone", "leadScore", "value", "discount", "payment", "status", "stage", "emailStatus", "owner", "created", "createdAt", "due"].includes(key);
}

function getColumnWidth<T extends Record<string, unknown>>(key: string, columns: CrmTableColumn<T>[]) {
  if (key === "_select") return "44px";
  const column = columns.find((item) => String(item.key) === key);
  if (column?.width) return column.width;
  const widths: Record<string, string> = {
    name: "210px",
    customer: "210px",
    phone: "116px",
    source: "140px",
    course: "250px",
    product: "260px",
    leadScore: "88px",
    owner: "150px",
    stage: "140px",
    status: "140px",
    emailStatus: "110px",
    lastTouch: "140px",
    nextAction: "150px",
    potentialValue: "128px",
    orderCode: "170px",
    value: "112px",
    discount: "100px",
    payment: "110px",
    created: "135px",
    createdAt: "135px",
    due: "135px",
  };
  return widths[key] ?? "140px";
}

function displayStatusLabel(key: string, value: string) {
  if (key === "stage") {
    const stageLabels: Record<string, string> = {
      new: "Mới",
      not_contacted: "Chưa liên hệ",
      consulting: "Đang tư vấn",
      high_intent: "Quan tâm cao",
      pending_payment: "Chờ thanh toán",
      paid: "Đã thanh toán",
      disqualified: "Không phù hợp",
    };
    return stageLabels[value] ?? value;
  }

  const statusLabels: Record<string, string> = {
    unknown: "Chưa rõ",
    open: "Đang mở",
    won: "Đã chốt",
    lost: "Đã loại",
    pending: "Chờ thanh toán",
    paid: "Đã thanh toán",
    expired: "Hết hạn",
    sent: "Đã gửi",
    delivered: "Đã nhận",
    opened: "Đã mở",
    clicked: "Đã click",
    unsubscribed: "Hủy nhận",
    hard_bounce: "Bounce cứng",
    complained: "Complaint",
  };
  return statusLabels[value] ?? value;
}

export function FilterBar({ items }: { items: FilterBarItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createClearHref = (param: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(param);
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };
  const createFilterHref = (param: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(param, value);
    } else {
      params.delete(param);
    }
    if (param === "dateFrom" || param === "dateTo" || param === "q" || param === "search") {
      if (value) {
        params.set("range", "custom");
      } else if (!params.get("dateFrom") && !params.get("dateTo")) {
        params.set("range", "30d");
      }
    }
    params.delete("page");
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2 pr-2 text-sm font-bold text-slate-700">
        <Filter className="h-4 w-4" />
        Lọc
      </div>
      {items.map((item) => {
        const rawValue = item.value?.trim();
        const value = rawValue && rawValue !== "Tất cả" ? rawValue : undefined;
        const options = item.options ?? [];
        const content = (
          <>
            {item.label}
            <span className="text-slate-400">{value ?? "Tất cả"}</span>
            {item.href || (item.param && value) ? <ChevronDown className="h-4 w-4" /> : null}
          </>
        );

        if (item.href) {
          return (
            <Link
              key={item.label}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              data-crm-action="link"
              href={item.href}
            >
              {content}
            </Link>
          );
        }

        if (item.param && options.length > 0) {
          const optionValues = new Set(options.map((option) => option.value));
          const normalizedOptions = value && !optionValues.has(value) ? [{ label: value, value }, ...options] : options;
          return (
            <label
              key={item.label}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
            >
              <span>{item.label}</span>
              <select
                className="max-w-[180px] bg-transparent text-sm font-bold text-slate-500 outline-none"
                name={item.param}
                value={value ?? ""}
                onChange={(event) => {
                  announceCrmRouteFeedback({ label: "Đang áp dụng bộ lọc" });
                  router.push(createFilterHref(item.param!, event.currentTarget.value));
                }}
              >
                <option value="">Tất cả</option>
                {normalizedOptions.map((option) => (
                  <option key={`${item.label}:${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        }

        if (item.param && options.length === 0) {
          const isDateField = item.param === "dateFrom" || item.param === "dateTo";
          const isSearchField = item.param === "q" || item.param === "search";
          return (
            <label
              key={item.label}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
            >
              <span>{item.label}</span>
              {isDateField ? (
                <input
                  className="min-w-[130px] bg-transparent text-sm font-bold text-slate-500 outline-none"
                  name={item.param}
                  defaultValue={value ?? ""}
                  onChange={(event) => {
                    announceCrmRouteFeedback({ label: "Đang áp dụng ngày lọc" });
                    router.push(createFilterHref(item.param!, event.currentTarget.value));
                  }}
                  type="date"
                  placeholder="2026-06-16"
                />
              ) : (
                <input
                  aria-label={`Lọc ${item.label}`}
                  className="max-w-[170px] bg-transparent text-sm font-bold text-slate-500 outline-none"
                  name={item.param}
                  defaultValue={value ?? ""}
                  onChange={(event) => {
                    announceCrmRouteFeedback({ label: "Đang áp dụng bộ lọc" });
                    router.push(createFilterHref(item.param!, event.currentTarget.value));
                  }}
                  type={isSearchField ? "search" : "text"}
                  placeholder={isSearchField ? "Tìm ..." : "Nhập giá trị"}
                />
              )}
            </label>
          );
        }

        if (item.param && value) {
          return (
            <Link
              key={item.label}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              data-crm-action="link"
              href={createClearHref(item.param)}
              title={`Bỏ lọc ${item.label}`}
            >
              {content}
            </Link>
          );
        }

        return (
          <span
            key={item.label}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600"
            data-crm-action="status"
            title={`${item.label}: ${value ?? "Tất cả"}`}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function StatusBadge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof toneClasses }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold ${toneClasses[tone]}`}>{children}</span>;
}

export function OwnerAvatar({ name, showName = false }: { name: string; showName?: boolean }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{initials || "TA"}</span>
      {showName ? <span className="font-semibold text-slate-700">{name}</span> : null}
    </span>
  );
}

export function RightInsightPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        <Sparkles className="h-4 w-4 text-violet-600" />
      </div>
      <div className="space-y-3">{children}</div>
    </aside>
  );
}

export function Timeline({ events }: { events: CrmEvent[] }) {
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className={`mt-1 h-2.5 w-2.5 rounded-full ${solidToneClasses[event.tone ?? "slate"]}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold text-slate-900">{event.title}</div>
              <div className="shrink-0 text-xs font-semibold text-slate-400">{event.occurredAt}</div>
            </div>
            {event.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{event.description}</p> : null}
            {event.source ? <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{event.source}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" />
      <div className="mt-3 font-black text-slate-900">{title}</div>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export function LoadingState({ title = "Đang tải dữ liệu CRM v2" }: { title?: string }) {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
      <span className="sr-only">{title}</span>
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
      <div className="flex items-center gap-2 font-black">
        <AlertCircle className="h-4 w-4" />
        {title}
      </div>
      {description ? <p className="mt-2 text-sm leading-6">{description}</p> : null}
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SimpleBars({ rows }: { rows: Array<{ label: string; value: number; displayValue?: string; tone?: string }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{row.label}</span>
            <span>{row.displayValue ?? row.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${solidToneClasses[(row.tone as keyof typeof solidToneClasses) ?? "blue"]}`} style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <div className="text-xs font-bold uppercase tracking-[0.08em] text-blue-600">{eyebrow}</div> : null}
        <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function IconButton({
  children,
  disabled = false,
  href,
  label,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  href?: string;
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
}) {
  const content = (
    <>
      {children}
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link className={actionButtonClassName} data-crm-action="link" href={href} title={label}>
        {content}
      </Link>
    );
  }

  if (onClick || type !== "button") {
    return (
      <button
        className={`${actionButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
        data-crm-action="button"
        disabled={disabled}
        onClick={onClick}
        title={label}
        type={type}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      aria-disabled="true"
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500"
      data-crm-action="status"
      title={`${label} chua co hanh dong gan ket`}
    >
      {content}
    </span>
  );
}

export function InsightRow({ label, value, tone = "slate" }: { label: string; value: string; tone?: keyof typeof toneClasses }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}

function toneTextClass(tone: keyof typeof toneClasses) {
  if (tone === "green") return "text-emerald-600";
  if (tone === "orange") return "text-orange-500";
  if (tone === "purple") return "text-violet-600";
  if (tone === "red") return "text-rose-600";
  if (tone === "slate") return "text-slate-500";
  return "text-blue-600";
}

function statusTone(value: string): keyof typeof toneClasses {
  const normalized = value.toLowerCase();
  if (["paid", "success", "active", "clicked", "delivered", "live"].includes(normalized)) return "green";
  if (["pending", "pending_payment", "sent", "waiting"].includes(normalized)) return "orange";
  if (["failed", "hard_bounce", "complained", "disqualified"].includes(normalized)) return "red";
  if (["consulting", "high_intent", "opened", "draft"].includes(normalized)) return "purple";
  return "blue";
}

export { Activity, BarChart3, BookOpen, Bot, CreditCard, GitBranch, Mail, Plug, ShieldCheck, Tags, Users };
