"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useDeferredValue, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatAdminDate, getLeadStatusMeta } from "@/lib/admin/crm-dashboard";
import type { LeadItem } from "@/services/leadService";

type LeadSummary = {
  orderCode: string;
  courseTitle: string;
  paymentStatus: string;
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
  const orderCode = getLineValue(lines, "Mã đơn");
  const courseTitle = getLineValue(lines, "Khóa");
  const paymentStatus = getLineValue(lines, "Trạng thái");
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
    orderCode,
    courseTitle,
    paymentStatus,
    shortNote: compactText(
      visibleNote || (orderCode || courseTitle || landing ? "Lead từ landing/checkout; xem nhãn tracking bên dưới." : value) || "Chưa có ghi chú",
      140,
    ),
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

function statusClass(tone: string) {
  if (tone === "success") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (tone === "warning") {
    return "bg-amber-50 text-amber-700";
  }

  if (tone === "danger") {
    return "bg-red-50 text-red-700";
  }

  return "bg-blue-50 text-blue-700";
}

const LeadTableRow = memo(function LeadTableRow({ item, index }: { item: SummarizedLead; index: number }) {
  const { lead, summary, status, initials } = item;

  return (
    <tr className="border-t border-slate-100 align-middle hover:bg-slate-50/80">
      <td className="w-10 px-3 py-4">
        <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">
          {index + 1}
        </span>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{lead.name || "Chưa có tên"}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{summary.shortNote}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-slate-700">
        <p className="max-w-[220px] truncate">{lead.email || "Chưa có email"}</p>
      </td>
      <td className="px-3 py-4 font-medium text-slate-900">{lead.phone || "Chưa có SĐT"}</td>
      <td className="px-3 py-4 text-slate-700">
        <p className="max-w-[240px] truncate">{summary.courseTitle || "Chưa chọn khóa"}</p>
        {summary.orderCode ? <p className="mt-1 font-mono text-xs text-blue-700">{summary.orderCode}</p> : null}
      </td>
      <td className="px-3 py-4 text-slate-600">{lead.source || "Website"}</td>
      <td className="px-3 py-4 text-slate-600">{formatAdminDate(lead.createdAt)}</td>
      <td className="px-3 py-4">
        <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-black uppercase ${statusClass(status.tone)}`}>
          {status.label}
        </span>
        {summary.paymentStatus ? <p className="mt-1 text-xs text-slate-500">{summary.paymentStatus}</p> : null}
      </td>
    </tr>
  );
});

export function LeadManager({ leads }: { leads: LeadItem[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);

  const summarizedLeads = useMemo<SummarizedLead[]>(
    () =>
      leads.map((lead) => {
        const summary = summarizeLeadNeed(lead.need);
        const status = getLeadStatusMeta(lead.status);
        const searchableText = [
          lead.name,
          lead.email,
          lead.phone,
          lead.source,
          lead.status,
          summary.orderCode,
          summary.courseTitle,
          summary.paymentStatus,
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
    [leads],
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.source || "Website"))).sort((a, b) => a.localeCompare(b, "vi")),
    [leads],
  );
  const openLeadCount = useMemo(
    () => summarizedLeads.filter((item) => item.status.tone !== "success").length,
    [summarizedLeads],
  );
  const filteredLeads = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return summarizedLeads.filter((item) => {
      const source = item.lead.source || "Website";
      const matchesSearch = !keyword || item.searchableText.includes(keyword);
      const matchesSource = sourceFilter === "all" || source === sourceFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && item.status.tone !== "success") ||
        (statusFilter === "done" && item.status.tone === "success");

      return matchesSearch && matchesSource && matchesStatus;
    });
  }, [deferredSearch, sourceFilter, statusFilter, summarizedLeads]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
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
    const result = (await response.json()) as { ok: boolean; message?: string };

    setIsSaving(false);

    if (!result.ok) {
      setMessage(result.message ?? "Chưa lưu được lead.");
      return;
    }

    setMessage(result.message ?? "Đã lưu lead vào Supabase.");
    event.currentTarget.reset();
    router.refresh();
  }, [router]);

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <span aria-hidden="true">⌕</span>
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm theo tên, email, số điện thoại, khóa học hoặc mã đơn"
              type="search"
              value={search}
            />
          </label>
          <select
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="open">Cần chăm sóc</option>
            <option value="done">Đã xử lý</option>
          </select>
          <select
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
            onChange={(event) => setSourceFilter(event.target.value)}
            value={sourceFilter}
          >
            <option value="all">Tất cả nguồn</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
          <span>
            Đang hiển thị <strong className="font-black text-slate-950">{filteredLeads.length}</strong> / {leads.length} lead
          </span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span>{openLeadCount} lead cần chăm sóc</span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span>{sourceOptions.length} nguồn lead</span>
        </div>

        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3">#</th>
                  <th className="px-3 py-3">Họ tên</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Số điện thoại</th>
                  <th className="px-3 py-3">Khóa / mã đơn</th>
                  <th className="px-3 py-3">Nguồn</th>
                  <th className="px-3 py-3">Ngày tạo</th>
                  <th className="px-3 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((item, index) => (
                  <LeadTableRow key={item.lead.id ?? `${item.lead.name}-${item.lead.phone}`} item={item} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-sm font-semibold text-slate-600">Không có lead khớp bộ lọc hiện tại.</div>
        )}
      </section>

      <form className="grid gap-4 rounded-md border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Thêm lead thủ công</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">Ghi lead từ Facebook/Zalo vào Supabase</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
        <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
          Lưu lead
        </Button>
        {message ? (
          <p className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
