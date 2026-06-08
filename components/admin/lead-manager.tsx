"use client";

import { memo, useCallback, useDeferredValue, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatAdminDate, getLeadStatusMeta } from "@/lib/admin/crm-dashboard";
import type { LeadItem, LeadSaleStatus } from "@/services/leadService";

const leadSaleStatuses: LeadSaleStatus[] = ["Chưa liên hệ", "Đã liên hệ", "Đã liên hệ lần 2", "Đã liên hệ lần 3", "K nhu cầu"];
const pageSizeOptions = [10, 20, 50];

type LeadSummary = {
  courseTitle: string;
  shortNote: string;
  trackingBadges: string[];
};

type SummarizedLead = {
  lead: LeadItem;
  summary: LeadSummary;
  status: ReturnType<typeof getLeadStatusMeta>;
  initials: string;
  searchableText: string;
};

type ApiResult = {
  ok: boolean;
  message?: string;
  lead?: LeadItem;
  leads?: LeadItem[];
};

type LeadEmailLog = {
  id: string;
  email: string;
  template: string;
  status: "success" | "failed";
  errorMessage?: string | null;
  createdAt: string;
};

type LeadNote = {
  id: string;
  content: string;
  createdByEmail?: string | null;
  createdAt: string;
  updatedAt: string;
};

type EmailLogsResult = ApiResult & {
  logs?: LeadEmailLog[];
};

type LeadNotesResult = ApiResult & {
  notes?: LeadNote[];
  note?: LeadNote;
  updatedAt?: string;
};

type ColumnFilterKey = "date" | "course" | "payment" | "sale" | "mail";
type DateFilter = "all" | "today" | "last7";
type MailFilter = "all" | "sent" | "not_sent";

function Icon({
  name,
  className = "size-5",
}: {
  name: "users" | "check" | "timer" | "phone" | "search" | "calendar" | "refresh" | "filter" | "more" | "bell";
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  if (name === "timer") {
    return (
      <svg {...common}>
        <path d="M10 2h4" />
        <path d="M12 14 8 9" />
        <path d="M4 13a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.2a2 2 0 0 1 2.11-.45c.84.3 1.71.51 2.61.63A2 2 0 0 1 22 16.92Z" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...common}>
        <path d="M21 12a9 9 0 0 1-15.3 6.36L3 15" />
        <path d="M3 21v-6h6" />
        <path d="M3 12a9 9 0 0 1 15.3-6.36L21 9" />
        <path d="M15 9h6V3" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg {...common}>
        <path d="M3 5h18" />
        <path d="M6 12h12" />
        <path d="M10 19h4" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function getLineValue(lines: string[], label: string) {
  const prefix = `${label}:`;
  const line = lines.find((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));

  return line?.slice(prefix.length).trim() ?? "";
}

function compactText(value: string, maxLength = 120) {
  const text = value.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function summarizeLeadNeed(value: string): LeadSummary {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const landing = getLineValue(lines, "Landing");
  const utmSource = getLineValue(lines, "UTM source");
  const utmCampaign = getLineValue(lines, "UTM campaign");
  const hasPixel = lines.some((line) => /^fb[pc]:/i.test(line));
  const ignoredPrefixes = [
    "Mã đơn:",
    "Khóa:",
    "Gói:",
    "Số tiền:",
    "Trạng thái:",
    "Landing:",
    "URL:",
    "Referrer:",
    "UTM source:",
    "UTM medium:",
    "UTM campaign:",
    "UTM content:",
    "UTM term:",
    "IP:",
    "fbp:",
    "fbc:",
    "Lead ID:",
  ];
  const visibleNote = lines.find(
    (line) => !ignoredPrefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase())),
  );
  const trackingBadges = [
    landing ? `LP: ${compactText(landing, 34)}` : "",
    utmSource ? `UTM: ${compactText(utmSource, 28)}` : "",
    utmCampaign ? `Campaign: ${compactText(utmCampaign, 34)}` : "",
    hasPixel ? "Pixel Facebook" : "",
  ].filter(Boolean);

  return {
    courseTitle: getLineValue(lines, "Khóa"),
    shortNote: compactText(visibleNote || value || "", 140),
    trackingBadges,
  };
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getCourseCode(title: string) {
  if (!title || title === "Chưa chọn khóa") {
    return "KH";
  }

  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/facebook|quang cao/.test(normalized) && /master|ads/.test(normalized)) {
    return "FAM";
  }

  if (/ai master/.test(normalized)) {
    return "AA";
  }

  const words = title
    .replace(/khóa học|khoa hoc|course|master|2026|x10|\d+/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const acronym = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return acronym.slice(0, 3) || "KH";
}

function getAvatarTone(index: number) {
  const tones = [
    "bg-blue-100 text-blue-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
  ];

  return tones[index % tones.length];
}

function paymentBadgeClass(status: LeadItem["paymentStatus"]) {
  return status === "paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

function paymentDotClass(status: LeadItem["paymentStatus"]) {
  return status === "paid" ? "bg-emerald-500" : "bg-red-500";
}

function paymentLabel() {
  return "Bank";
}

function saleSelectClass(status?: LeadSaleStatus | null) {
  const normalized = status || leadSaleStatuses[0];

  if (normalized.startsWith("Đã liên hệ")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-100";
  }

  if (normalized === "K nhu cầu") {
    return "border-red-200 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-100";
  }

  return "border-slate-200 bg-white text-slate-700 focus:border-blue-500 focus:ring-blue-100";
}

function getPercent(part: number, total: number) {
  if (total === 0) {
    return "0.0%";
  }

  return `${((part / total) * 100).toFixed(1)}%`;
}

function formatShortDate(value?: string | null) {
  const formatted = formatAdminDate(value);
  return formatted.replace(/\/2026/g, "/2026").replace(/\s/, " ");
}

function parseLeadDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function matchesDateFilter(value: string | null | undefined, filter: DateFilter) {
  if (filter === "all") return true;

  const date = parseLeadDate(value);
  if (!date) return false;

  const now = new Date();
  if (filter === "today") {
    return isSameLocalDay(date, now);
  }

  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  return date.getTime() <= now.getTime() && now.getTime() - date.getTime() <= sevenDaysInMs;
}

const LeadTableRow = memo(function LeadTableRow({
  item,
  index,
  absoluteIndex,
  actionMenuLeadId,
  onActionMenuToggle,
  onCopyLead,
  onSaleStatusChange,
  onViewDetails,
  onQuickNote,
  onViewEmailLogs,
  onResendEmail,
  onDeleteLead,
  savingSaleLeadId,
  resendingLeadId,
}: {
  item: SummarizedLead;
  index: number;
  absoluteIndex: number;
  actionMenuLeadId: string;
  onActionMenuToggle: (leadId: string) => void;
  onCopyLead: (lead: LeadItem, field: "email" | "phone" | "order") => void;
  onViewDetails: (item: SummarizedLead) => void;
  onQuickNote: (item: SummarizedLead) => void;
  onSaleStatusChange: (leadId: string, saleStatus: LeadSaleStatus) => void;
  onViewEmailLogs: (leadId: string) => void;
  onResendEmail: (leadId: string) => void;
  onDeleteLead: (lead: LeadItem) => void;
  savingSaleLeadId: string;
  resendingLeadId: string;
}) {
  const { lead, summary, initials } = item;
  const leadId = lead.id ?? "";
  const isOrderOnlyLead = leadId.startsWith("order:");
  const isActionMenuOpen = Boolean(leadId) && actionMenuLeadId === leadId;
  const courseTitle = lead.courseTitle || summary.courseTitle || "Chưa chọn khóa";
  const courseCode = getCourseCode(courseTitle);

  return (
    <tr className="group border-t border-slate-100 bg-white align-middle transition hover:bg-blue-50/30">
      <td className="w-9 px-3 py-1.5">
        <input
          aria-label={`Chọn lead ${lead.name || absoluteIndex + 1}`}
          className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          type="checkbox"
        />
      </td>
      <td className="w-8 px-2 py-1.5 text-center text-sm font-semibold text-slate-500">{absoluteIndex + 1}</td>
      <td className="whitespace-nowrap px-3 py-1.5 font-semibold text-slate-700">{formatShortDate(lead.createdAt)}</td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${getAvatarTone(index)}`}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="max-w-[190px] truncate font-black text-slate-950">{lead.name || "Chưa có tên"}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-1.5 text-slate-700">
        <p className="max-w-[235px] truncate">{lead.email || "Chưa có email"}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-900">{lead.phone || "Chưa có SĐT"}</td>
      <td className="px-3 py-1.5 text-slate-700">
        <button
          className="inline-flex h-7 min-w-12 items-center justify-center rounded-full bg-blue-50 px-3 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
          onClick={() => onViewDetails(item)}
          title={courseTitle}
          type="button"
        >
          {courseCode}
        </button>
      </td>
      <td className="px-3 py-1.5">
        <span
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-black ${paymentBadgeClass(
            lead.paymentStatus,
          )}`}
        >
          <span className={`size-1.5 rounded-full ${paymentDotClass(lead.paymentStatus)}`} />
          {paymentLabel()}
        </span>
      </td>
      <td className="px-3 py-1.5">
        <select
          className={`h-8 w-[142px] rounded-md border px-2 text-xs font-bold outline-none transition focus:ring-2 disabled:opacity-60 ${saleSelectClass(
            lead.saleStatus,
          )}`}
          disabled={!leadId || savingSaleLeadId === leadId}
          onChange={(event) => onSaleStatusChange(leadId, event.target.value as LeadSaleStatus)}
          value={lead.saleStatus || "Chưa liên hệ"}
        >
          {leadSaleStatuses.map((saleStatus) => (
            <option key={saleStatus} value={saleStatus}>
              {saleStatus}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <button
          className="h-8 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!leadId || isOrderOnlyLead}
          onClick={() => onQuickNote(item)}
          title="Mở ghi chú khách hàng để sale cập nhật tay"
          type="button"
        >
          Ghi chú sale
        </button>
      </td>
      <td className="px-3 py-1.5">
        <button
          className="whitespace-nowrap text-left text-xs font-bold text-slate-700 transition hover:text-blue-700"
          disabled={!leadId || isOrderOnlyLead}
          onClick={() => onViewEmailLogs(leadId)}
          type="button"
        >
          Đã gửi: {lead.resendEmailCount}
        </button>
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center justify-end gap-2">
          <button
            className="h-8 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!leadId || isOrderOnlyLead || !lead.orderCode || resendingLeadId === leadId}
            onClick={() => onResendEmail(leadId)}
            type="button"
          >
            {resendingLeadId === leadId ? "Đang gửi" : "Gửi lại"}
            <span className="sr-only"> Resend mail</span>
          </button>
          <div className="relative">
            <button
              aria-expanded={isActionMenuOpen}
              aria-label={`Thao tác chuyên sâu cho ${lead.name || "lead"}`}
              className="grid size-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => onActionMenuToggle(leadId)}
              type="button"
            >
              <Icon className="size-5" name="more" />
            </button>
            {isActionMenuOpen ? (
              <div className="absolute right-0 top-10 z-20 w-52 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-xl shadow-slate-200/80">
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onViewDetails(item)}
                  type="button"
                >
                  Xem chi tiết lead
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onSaleStatusChange(leadId, "Đã liên hệ")}
                  type="button"
                >
                  Đánh dấu đã liên hệ
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onQuickNote(item)}
                  type="button"
                >
                  Thêm ghi chú sale
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onCopyLead(lead, "phone")}
                  type="button"
                >
                  Copy số điện thoại
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => onCopyLead(lead, "email")}
                  type="button"
                >
                  Copy email
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-300"
                  disabled={isOrderOnlyLead}
                  onClick={() => onViewEmailLogs(leadId)}
                  type="button"
                >
                  Xem lịch sử mail
                </button>
                <button
                  className="w-full rounded px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-white"
                  disabled={isOrderOnlyLead}
                  onClick={() => onDeleteLead(lead)}
                  type="button"
                >
                  Xóa lead
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
});

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: "users" | "check" | "timer" | "phone";
  tone: "blue" | "emerald" | "orange";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
  }[tone];

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex items-center gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          <Icon className="size-6" name={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-600">{label}</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function LeadManager({ leads }: { leads: LeadItem[] }) {
  const [leadItems, setLeadItems] = useState(leads);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [savingSaleLeadId, setSavingSaleLeadId] = useState("");
  const [resendingLeadId, setResendingLeadId] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [saleFilter, setSaleFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [mailFilter, setMailFilter] = useState<MailFilter>("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [actionMenuLeadId, setActionMenuLeadId] = useState("");
  const [columnFilterOpen, setColumnFilterOpen] = useState<ColumnFilterKey | null>(null);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState<LeadEmailLog[] | null>(null);
  const [emailLogsTitle, setEmailLogsTitle] = useState("");
  const [detailLead, setDetailLead] = useState<SummarizedLead | null>(null);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const summarizedLeads = useMemo<SummarizedLead[]>(
    () =>
      leadItems.map((lead) => {
        const summary = summarizeLeadNeed(lead.need);
        const status = getLeadStatusMeta(lead.status);
        const searchableText = [
          lead.name,
          lead.email,
          lead.phone,
          lead.source,
          lead.status,
          lead.saleStatus,
          lead.paymentStatus,
          lead.orderCode,
          lead.courseTitle,
          summary.courseTitle,
          summary.shortNote,
          ...summary.trackingBadges,
        ]
          .join(" ")
          .toLowerCase();

        return {
          lead,
          summary,
          status,
          initials: getInitials(lead.name || lead.email || lead.phone || "Lead"),
          searchableText,
        };
      }),
    [leadItems],
  );
  const courseOptions = useMemo(
    () =>
      Array.from(
        new Set(
          summarizedLeads
            .map((item) => item.lead.courseTitle || item.summary.courseTitle)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [summarizedLeads],
  );
  const stats = useMemo(() => {
    const total = leadItems.length;
    const paid = leadItems.filter((lead) => lead.paymentStatus === "paid").length;
    const unpaid = total - paid;
    const untouched = leadItems.filter((lead) => (lead.saleStatus || "Chưa liên hệ") === "Chưa liên hệ").length;

    return { total, paid, unpaid, untouched };
  }, [leadItems]);
  const filteredLeads = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return summarizedLeads.filter((item) => {
      const course = item.lead.courseTitle || item.summary.courseTitle || "";
      const matchesSearch = !keyword || item.searchableText.includes(keyword);
      const matchesPayment =
        paymentFilter === "all" ||
        (paymentFilter === "paid" && item.lead.paymentStatus === "paid") ||
        (paymentFilter === "unpaid" && item.lead.paymentStatus !== "paid");
      const matchesSale = saleFilter === "all" || (item.lead.saleStatus || "Chưa liên hệ") === saleFilter;
      const matchesCourse = courseFilter === "all" || course === courseFilter;
      const matchesDate = matchesDateFilter(item.lead.createdAt, dateFilter);
      const matchesMail =
        mailFilter === "all" ||
        (mailFilter === "sent" && item.lead.resendEmailCount > 0) ||
        (mailFilter === "not_sent" && item.lead.resendEmailCount === 0);

      return matchesSearch && matchesPayment && matchesSale && matchesCourse && matchesDate && matchesMail;
    });
  }, [courseFilter, dateFilter, deferredSearch, mailFilter, paymentFilter, saleFilter, summarizedLeads]);
  const pageCount = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginatedLeads = filteredLeads.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeFilterCount = [
    paymentFilter !== "all",
    saleFilter !== "all",
    courseFilter !== "all",
    dateFilter !== "all",
    mailFilter !== "all",
    Boolean(search.trim()),
  ].filter(Boolean).length;

  const resetPage = useCallback(() => setPage(1), []);

  const handleRefresh = useCallback(async () => {
    setMessage("");
    setIsRefreshing(true);

    const response = await fetch("/api/admin/leads?force_refresh=1", { cache: "no-store" });
    const result = (await response.json()) as ApiResult;

    setIsRefreshing(false);

    if (!response.ok || !result.ok || !result.leads) {
      setMessage(result.message ?? "Không refresh được dữ liệu lead.");
      return;
    }

    setLeadItems(result.leads);
    setPage(1);
    setMessage(`Đã refresh data: ${result.leads.length} lead mới nhất.`);
  }, []);

  const handleResyncGoogleSheet = useCallback(async () => {
    setMessage("");
    setIsResyncing(true);

    const response = await fetch("/api/admin/leads/resync-google-sheet", { method: "POST" });
    const result = (await response.json()) as ApiResult & { synced?: number; skipped?: number; failed?: number };

    setIsResyncing(false);
    setMessage(result.message ?? (response.ok ? "Đã resync Google Sheet." : "Không resync được Google Sheet."));
    await handleRefresh();
  }, [handleRefresh]);

  const handleSaleStatusChange = useCallback(
    async (leadId: string, saleStatus: LeadSaleStatus) => {
      if (!leadId) return;

      setMessage("");
      setActionMenuLeadId("");
      setSavingSaleLeadId(leadId);
      let previousLead: LeadItem | null = null;
      setLeadItems((current) =>
        current.map((lead) => {
          if (lead.id !== leadId) {
            return lead;
          }

          previousLead = lead;
          return { ...lead, saleStatus };
        }),
      );

      const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/sale-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleStatus }),
      });
      const result = (await response.json()) as ApiResult;

      setSavingSaleLeadId("");

      if (!response.ok || !result.ok) {
        if (previousLead) {
          setLeadItems((current) => current.map((lead) => (lead.id === leadId ? previousLead! : lead)));
        }
        setMessage(result.message ?? "Chưa cập nhật được trạng thái sale.");
        return;
      }

      if (result.lead) {
        setLeadItems((current) => current.map((lead) => (lead.id === leadId ? result.lead! : lead)));
      }

      setMessage(`Đã cập nhật sale: ${saleStatus}.`);
    },
    [],
  );

  const handleResendEmail = useCallback(
    async (leadId: string) => {
      if (!leadId) return;

      setMessage("");
      setResendingLeadId(leadId);

      const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/resend-email`, { method: "POST" });
      const result = (await response.json()) as ApiResult;

      setResendingLeadId("");
      setMessage(result.message ?? (response.ok ? "Đã gửi lại email." : "Không gửi lại được email."));
      await handleRefresh();
    },
    [handleRefresh],
  );

  const handleDeleteLead = useCallback(
    async (lead: LeadItem) => {
      if (!lead.id) return;

      const confirmed = window.confirm(
        `Ẩn lead "${lead.name || lead.email || lead.phone}" khỏi giao diện? Dữ liệu sẽ được giữ 30 ngày trước khi purge tự động.`,
      );

      if (!confirmed) {
        return;
      }

      setMessage("");
      setActionMenuLeadId("");
      const previousLeads = leadItems;
      setLeadItems((current) => current.filter((item) => item.id !== lead.id));

      const response = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Admin xóa lead trên giao diện, giữ 30 ngày trước khi purge.",
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.ok) {
        setLeadItems(previousLeads);
        setMessage(result.message ?? "Chưa xóa được lead.");
        return;
      }

      setMessage(result.message ?? "Đã ẩn lead khỏi giao diện.");
      await handleRefresh();
    },
    [handleRefresh, leadItems],
  );

  const handleViewEmailLogs = useCallback(async (leadId: string) => {
    if (!leadId) return;

    setActionMenuLeadId("");
    setEmailLogsTitle("Đang tải lịch sử email...");
    setEmailLogs([]);
    const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/email-logs`, { cache: "no-store" });
    const result = (await response.json()) as EmailLogsResult;

    if (!response.ok || !result.ok) {
      setEmailLogsTitle(result.message ?? "Không tải được lịch sử email.");
      setEmailLogs([]);
      return;
    }

    setEmailLogsTitle("Lịch sử email");
    setEmailLogs(result.logs ?? []);
  }, []);

  const loadLeadNotes = useCallback(async (leadId: string) => {
    if (!leadId || leadId.startsWith("order:")) {
      setLeadNotes([]);
      return;
    }

    const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/notes`, { cache: "no-store" });
    const result = (await response.json()) as LeadNotesResult;
    setLeadNotes(response.ok && result.ok ? result.notes ?? [] : []);
  }, []);

  const handleSaveNote = useCallback(async () => {
    const leadId = detailLead?.lead.id;
    const content = noteContent.trim();

    if (!leadId || leadId.startsWith("order:") || !content) {
      return;
    }

    setIsSavingNote(true);
    const response = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const result = (await response.json()) as LeadNotesResult;
    setIsSavingNote(false);

    if (!response.ok || !result.ok || !result.note) {
      setMessage(result.message ?? "Chưa lưu được ghi chú khách hàng.");
      return;
    }

    setLeadNotes((current) => [result.note!, ...current]);
    setNoteContent("");
    setMessage(`Đã cập nhật dữ liệu lúc ${new Date(result.updatedAt ?? Date.now()).toLocaleString("vi-VN")}`);
  }, [detailLead, noteContent]);

  const handleCopyLead = useCallback((lead: LeadItem, field: "email" | "phone" | "order") => {
    const value = field === "email" ? lead.email : field === "phone" ? lead.phone : lead.orderCode;

    if (!value) {
      setMessage("Lead chưa có dữ liệu để copy.");
      return;
    }

    void navigator.clipboard?.writeText(value);
    setActionMenuLeadId("");
    setMessage(`Đã copy ${field === "email" ? "email" : field === "phone" ? "số điện thoại" : "mã đơn"}.`);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setMessage("");
      setIsSaving(true);

      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          message: String(formData.get("message") ?? ""),
          source: String(formData.get("source") ?? "Admin"),
        }),
      });
      const result = (await response.json()) as ApiResult;

      setIsSaving(false);

      if (!result.ok) {
        setMessage(result.message ?? "Chưa lưu được lead.");
        return;
      }

      setMessage(result.message ?? "Đã lưu lead vào Supabase.");
      event.currentTarget.reset();
      await handleRefresh();
    },
    [handleRefresh],
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setPaymentFilter("all");
    setSaleFilter("all");
    setCourseFilter("all");
    setDateFilter("all");
    setMailFilter("all");
    setColumnFilterOpen(null);
    setPage(1);
  }, []);

  const handleViewDetails = useCallback((item: SummarizedLead) => {
    setDetailLead(item);
    setActionMenuLeadId("");
    setNoteContent("");
    void loadLeadNotes(item.lead.id ?? "");
  }, [loadLeadNotes]);

  const renderFilterOption = (label: string, isActive: boolean, onClick: () => void) => (
    <button
      className={`flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-xs font-black transition ${
        isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="truncate">{label}</span>
      {isActive ? <span className="size-1.5 rounded-full bg-blue-600" /> : null}
    </button>
  );

  const renderColumnFilter = (
    filterKey: ColumnFilterKey,
    label: string,
    isActive: boolean,
    content: ReactNode,
    align: "left" | "right" = "left",
  ) => (
    <div className="relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        aria-expanded={columnFilterOpen === filterKey}
        aria-label={`Lọc cột ${label}`}
        className={`relative grid size-6 place-items-center rounded-md border transition ${
          isActive
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-700"
        }`}
        onClick={() => setColumnFilterOpen((current) => (current === filterKey ? null : filterKey))}
        type="button"
      >
        <Icon className="size-3.5" name="filter" />
        {isActive ? <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-blue-600" /> : null}
      </button>
      {columnFilterOpen === filterKey ? (
        <div
          className={`absolute top-8 z-40 w-56 rounded-md border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/80 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {content}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] text-slate-950">
      <header className="flex flex-col gap-4 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Quản lý Lead</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Quản lý và theo dõi thông tin khách hàng tiềm năng
          </p>
        </div>
        <div className="flex items-center gap-4 self-end xl:self-auto">
          <button className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white" type="button">
            <Icon className="size-5" name="search" />
          </button>
          <button className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white" type="button">
            <Icon className="size-5" name="bell" />
            <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-blue-600 text-[10px] font-black text-white">
              3
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-orange-100 text-sm font-black text-slate-700">
              H
            </span>
            <span className="hidden text-sm sm:block">
              <span className="block font-black text-slate-950">Hiền</span>
              <span className="text-xs font-semibold text-slate-500">Administrator</span>
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard detail="Tất cả lead trong hệ thống" icon="users" label="Tổng số lead" tone="blue" value={String(stats.total)} />
        <StatCard
          detail={`${getPercent(stats.paid, stats.total)} tổng số lead`}
          icon="check"
          label="Đã thanh toán"
          tone="emerald"
          value={String(stats.paid)}
        />
        <StatCard
          detail={`${getPercent(stats.unpaid, stats.total)} tổng số lead`}
          icon="timer"
          label="Chưa thanh toán"
          tone="orange"
          value={String(stats.unpaid)}
        />
        <StatCard
          detail={`${getPercent(stats.untouched, stats.total)} tổng số lead`}
          icon="phone"
          label="Chưa liên hệ"
          tone="blue"
          value={String(stats.untouched)}
        />
      </section>

      <section className="mt-5 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="relative flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex h-10 min-w-0 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500 lg:max-w-[520px] lg:flex-1">
            <Icon className="size-4" name="search" />
            <input
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-slate-400"
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Tìm kiếm theo tên, email, SĐT..."
              type="search"
              value={search}
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              disabled={isRefreshing}
              onClick={handleRefresh}
              title="Refresh data"
              type="button"
            >
              <Icon className="size-4" name="refresh" />
              <span className="sr-only">Refresh data</span>
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              disabled={isResyncing}
              onClick={handleResyncGoogleSheet}
              title="Resync Google Sheet"
              type="button"
            >
              {isResyncing ? "Sync..." : "Sheet"}
              <span className="sr-only">Resync Google Sheet</span>
            </button>
            {activeFilterCount > 0 ? (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                  onClick={handleClearFilters}
                  type="button"
                >
                  Xóa lọc
                </button>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">{message}</p>
        ) : null}

        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] table-fixed text-left text-[13px]">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="w-9 px-3 py-2.5">
                    <input className="size-4 rounded border-slate-300 text-blue-600" type="checkbox" />
                  </th>
                  <th className="w-8 px-2 py-2.5 text-center">#</th>
                  <th className="relative w-[130px] px-3 py-2.5">
                    {renderColumnFilter(
                      "date",
                      "Thời gian",
                      dateFilter !== "all",
                      <>
                        {renderFilterOption("Tất cả thời gian", dateFilter === "all", () => {
                          setDateFilter("all");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {renderFilterOption("Hôm nay", dateFilter === "today", () => {
                          setDateFilter("today");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {renderFilterOption("7 ngày gần nhất", dateFilter === "last7", () => {
                          setDateFilter("last7");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                      </>,
                    )}
                  </th>
                  <th className="w-[205px] px-3 py-2.5">Tên</th>
                  <th className="w-[235px] px-3 py-2.5">Email</th>
                  <th className="w-[130px] px-3 py-2.5">SĐT</th>
                  <th className="relative w-[105px] px-3 py-2.5">
                    {renderColumnFilter(
                      "course",
                      "Khóa học",
                      courseFilter !== "all",
                      <div className="max-h-72 overflow-y-auto">
                        {renderFilterOption("Tất cả khóa học", courseFilter === "all", () => {
                          setCourseFilter("all");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {courseOptions.map((course) =>
                          renderFilterOption(course, courseFilter === course, () => {
                            setCourseFilter(course);
                            setColumnFilterOpen(null);
                            resetPage();
                          }),
                        )}
                      </div>,
                      "right",
                    )}
                  </th>
                  <th className="relative w-[112px] px-3 py-2.5">
                    {renderColumnFilter(
                      "payment",
                      "Bank",
                      paymentFilter !== "all",
                      <>
                        {renderFilterOption("Tất cả Bank", paymentFilter === "all", () => {
                          setPaymentFilter("all");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {renderFilterOption("Bank xanh", paymentFilter === "paid", () => {
                          setPaymentFilter("paid");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {renderFilterOption("Bank đỏ", paymentFilter === "unpaid", () => {
                          setPaymentFilter("unpaid");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                      </>,
                      "right",
                    )}
                  </th>
                  <th className="relative w-[150px] px-3 py-2.5">
                    {renderColumnFilter(
                      "sale",
                      "Sale",
                      saleFilter !== "all",
                      <>
                        {renderFilterOption("Tất cả sale", saleFilter === "all", () => {
                          setSaleFilter("all");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {leadSaleStatuses.map((status) =>
                          renderFilterOption(status, saleFilter === status, () => {
                            setSaleFilter(status);
                            setColumnFilterOpen(null);
                            resetPage();
                          }),
                        )}
                      </>,
                      "right",
                    )}
                  </th>
                  <th className="w-[116px] px-3 py-2.5">Ghi chú</th>
                  <th className="relative w-[90px] px-3 py-2.5">
                    {renderColumnFilter(
                      "mail",
                      "Mail",
                      mailFilter !== "all",
                      <>
                        {renderFilterOption("Tất cả mail", mailFilter === "all", () => {
                          setMailFilter("all");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {renderFilterOption("Đã gửi", mailFilter === "sent", () => {
                          setMailFilter("sent");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                        {renderFilterOption("Chưa gửi", mailFilter === "not_sent", () => {
                          setMailFilter("not_sent");
                          setColumnFilterOpen(null);
                          resetPage();
                        })}
                      </>,
                      "right",
                    )}
                  </th>
                  <th className="w-[118px] px-3 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((item, index) => (
                  <LeadTableRow
                    absoluteIndex={(safePage - 1) * pageSize + index}
                    actionMenuLeadId={actionMenuLeadId}
                    index={index}
                    item={item}
                    key={item.lead.id ?? `${item.lead.name}-${item.lead.phone}`}
                    onActionMenuToggle={(leadId) => setActionMenuLeadId(actionMenuLeadId === leadId ? "" : leadId)}
                    onCopyLead={handleCopyLead}
                    onDeleteLead={handleDeleteLead}
                    onQuickNote={handleViewDetails}
                    onResendEmail={handleResendEmail}
                    onSaleStatusChange={handleSaleStatusChange}
                    onViewDetails={handleViewDetails}
                    onViewEmailLogs={handleViewEmailLogs}
                    resendingLeadId={resendingLeadId}
                    savingSaleLeadId={savingSaleLeadId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-sm font-semibold text-slate-600">Không có lead khớp bộ lọc hiện tại.</div>
        )}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>Hiển thị</span>
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 font-bold text-slate-700"
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              value={pageSize}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span>kết quả mỗi trang</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="grid size-10 place-items-center rounded-md border border-slate-200 bg-white font-black text-slate-500 disabled:opacity-40"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              ‹
            </button>
            {[1, 2, 3].filter((item) => item <= pageCount).map((item) => (
              <button
                className={`grid size-10 place-items-center rounded-md border text-sm font-black ${
                  safePage === item
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                key={item}
                onClick={() => setPage(item)}
                type="button"
              >
                {item}
              </button>
            ))}
            {pageCount > 3 ? <span className="px-2 text-slate-400">...</span> : null}
            {pageCount > 3 ? (
              <button
                className={`grid h-10 min-w-10 place-items-center rounded-md border px-3 text-sm font-black ${
                  safePage === pageCount
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onClick={() => setPage(pageCount)}
                type="button"
              >
                {pageCount}
              </button>
            ) : null}
            <button
              className="grid size-10 place-items-center rounded-md border border-slate-200 bg-white font-black text-slate-500 disabled:opacity-40"
              disabled={safePage === pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {isManualFormOpen ? (
      <form className="mt-6 grid gap-4 rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-blue-700">Thêm lead thủ công</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Ghi lead từ Facebook/Zalo vào Supabase</h2>
          </div>
          <Button className="h-10 w-fit rounded-md px-5 text-sm shadow-none" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
            Lưu lead
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            name="name"
            placeholder="Tên lead"
            required
          />
          <input
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            name="phone"
            placeholder="Số điện thoại"
          />
          <input
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            name="email"
            placeholder="Email"
            type="email"
          />
          <input
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
            name="source"
            placeholder="Nguồn: Facebook, Zalo..."
          />
        </div>
        <textarea
          className="min-h-24 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-950 outline-none placeholder:text-slate-400"
          name="message"
          placeholder="Nhu cầu / ghi chú tư vấn"
        />
      </form>
      ) : (
        <button
          className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
          onClick={() => setIsManualFormOpen(true)}
          type="button"
        >
          Thêm lead thủ công
        </button>
      )}

      {detailLead ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4">
          <section className="w-full max-w-2xl rounded-[18px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">Chi tiết lead</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{detailLead.lead.name || "Chưa có tên"}</h2>
              </div>
              <button
                className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                onClick={() => setDetailLead(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">Khóa học</p>
                <p className="mt-1 font-bold text-slate-900">
                  {detailLead.lead.courseTitle || detailLead.summary.courseTitle || "Chưa chọn khóa"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">Mã đơn / chuyển tiền</p>
                <p className="mt-1 font-mono font-bold text-blue-700">{detailLead.lead.orderCode || "Chưa có mã đơn"}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">Liên hệ</p>
                <p className="mt-1 font-bold text-slate-900">{detailLead.lead.phone || "Chưa có SĐT"}</p>
                <p className="mt-1 text-slate-600">{detailLead.lead.email || "Chưa có email"}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">Nguồn / landing page</p>
                <p className="mt-1 font-bold text-slate-900">{detailLead.lead.source || "Website"}</p>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-400">Ghi chú / tracking</p>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                {detailLead.lead.need || "Không có ghi chú."}
              </pre>
            </div>
            <div className="mt-3 rounded-md border border-slate-200 p-3">
              <p className="text-xs font-black uppercase text-blue-700">Ghi chú khách hàng</p>
              <textarea
                className="mt-3 min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm text-slate-950 outline-none focus:border-blue-400"
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Ghi lại quá trình chăm sóc, cuộc gọi, nhu cầu, lần hẹn tiếp theo..."
                value={noteContent}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-500">{leadNotes.length} ghi chú đã lưu</p>
                <Button
                  className="h-9 rounded-md px-4 text-xs"
                  disabled={!detailLead.lead.id || detailLead.lead.id.startsWith("order:") || !noteContent.trim()}
                  isLoading={isSavingNote}
                  loadingLabel="Đang lưu..."
                  onClick={handleSaveNote}
                  type="button"
                >
                  Lưu ghi chú
                </Button>
              </div>
              <div className="mt-4 grid max-h-56 gap-3 overflow-auto">
                {leadNotes.length > 0 ? (
                  leadNotes.map((note) => (
                    <div className="rounded-md bg-slate-50 p-3 text-sm" key={note.id}>
                      <p className="whitespace-pre-wrap text-slate-800">{note.content}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {note.createdByEmail || "Admin"} - {formatAdminDate(note.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    Chưa có ghi chú nào cho khách này.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {emailLogs ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4">
          <section className="w-full max-w-lg rounded-[18px] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black text-slate-950">{emailLogsTitle}</h2>
              <button
                className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                onClick={() => setEmailLogs(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {emailLogs.length > 0 ? (
                emailLogs.map((log) => (
                  <div className="rounded-md border border-slate-200 p-3 text-sm" key={log.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black text-slate-900">{log.template}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-black ${
                          log.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{log.email}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatAdminDate(log.createdAt)}</p>
                    {log.errorMessage ? <p className="mt-2 text-xs font-semibold text-red-600">{log.errorMessage}</p> : null}
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                  Chưa có email nào được gửi cho khách này.
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
