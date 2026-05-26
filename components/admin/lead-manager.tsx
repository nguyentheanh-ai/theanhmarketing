"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState, type FormEvent } from "react";
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

function statusClass(tone: string) {
  if (tone === "success") {
    return "border-emerald-300/20 bg-emerald-400/12 text-emerald-200";
  }

  if (tone === "warning") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }

  if (tone === "danger") {
    return "border-red-300/20 bg-red-400/12 text-red-200";
  }

  return "border-sky-300/20 bg-sky-400/12 text-sky-200";
}

const MetricCard = memo(function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
});

const LeadTableRow = memo(function LeadTableRow({ lead, summary }: SummarizedLead) {
  const status = getLeadStatusMeta(lead.status);

  return (
    <tr key={lead.id ?? `${lead.name}-${lead.phone}`} className="border-t border-white/8 align-top transition hover:bg-white/[0.035]">
      <td className="px-4 py-4">
        <p className="font-black text-white">{lead.name || "Chưa có tên"}</p>
        {summary.paymentStatus ? (
          <p className="mt-1 text-xs text-slate-500">Thanh toán: {summary.paymentStatus}</p>
        ) : null}
      </td>
      <td className="px-4 py-4 text-slate-300">
        <p>{lead.phone || "Chưa có SĐT"}</p>
        {lead.email ? <p className="mt-1 text-xs text-slate-500">{lead.email}</p> : null}
      </td>
      <td className="px-4 py-4 font-mono text-xs text-sky-200">{summary.orderCode || "Chưa có đơn"}</td>
      <td className="max-w-[260px] px-4 py-4 text-slate-300">{summary.courseTitle || "Chưa chọn khóa"}</td>
      <td className="max-w-[320px] px-4 py-4">
        <p className="text-slate-300">{summary.shortNote}</p>
        {summary.trackingBadges.length > 0 ? (
          <div className="mt-2 flex max-w-[300px] flex-wrap gap-1">
            {summary.trackingBadges.map((badge) => (
              <span key={badge} className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] font-bold text-slate-400">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td className="max-w-[190px] px-4 py-4 text-slate-300">{lead.source || "Website"}</td>
      <td className="px-4 py-4 text-slate-500">{formatAdminDate(lead.createdAt)}</td>
      <td className="px-4 py-4">
        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(status.tone)}`}>
          {status.label}
        </span>
      </td>
    </tr>
  );
});

export function LeadManager({ leads }: { leads: LeadItem[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const summarizedLeads = useMemo(
    () => leads.map((lead) => ({ lead, summary: summarizeLeadNeed(lead.need) })),
    [leads],
  );
  const openLeadCount = leads.filter((lead) => getLeadStatusMeta(lead.status).tone !== "success").length;
  const sourceCount = new Set(leads.map((lead) => lead.source).filter(Boolean)).size;

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
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Tổng lead" value={String(leads.length)} detail="Lead thật từ Supabase" />
        <MetricCard label="Cần chăm sóc" value={String(openLeadCount)} detail="Chưa chuyển trạng thái xử lý" />
        <MetricCard label="Nguồn lead" value={String(sourceCount)} detail="Landing page, form và nhập tay" />
      </div>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-[#111827]/82">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-amber-100">Pipeline lead</p>
            <h2 className="mt-2 text-xl font-black text-white">Danh sách tư vấn</h2>
            <p className="mt-1 text-sm text-slate-400">
              Tracking vẫn được giữ trong dữ liệu, chỉ được gom thành nhãn để sale đọc nhanh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full border border-sky-300/20 bg-sky-400/12 px-3 py-1 text-sky-200">Mới</span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-100">Đang chăm sóc</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1 text-emerald-200">Đã xử lý</span>
          </div>
        </div>

        {summarizedLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="bg-white/[0.035] text-xs uppercase text-sky-200/70">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Khóa học</th>
                  <th className="px-4 py-3">Ghi chú ngắn</th>
                  <th className="px-4 py-3">Nguồn</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {summarizedLeads.map(({ lead, summary }) => (
                  <LeadTableRow key={lead.id ?? `${lead.name}-${lead.phone}`} lead={lead} summary={summary} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-black text-white">Chưa có lead</h3>
              <p className="mt-2 text-sm text-slate-400">
                Lead từ form public hoặc nhập thủ công sẽ được đưa vào pipeline này.
              </p>
            </div>
          </div>
        )}
      </section>

      <form className="grid gap-4 rounded-lg border border-white/10 bg-[#111827]/82 p-5" onSubmit={handleSubmit}>
        <div>
          <p className="text-xs font-black uppercase text-amber-100">Thêm lead thủ công</p>
          <h2 className="mt-2 text-xl font-black text-white">Ghi lead từ Facebook/Zalo vào Supabase</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="min-h-11 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-500"
            name="name"
            placeholder="Tên lead"
            required
          />
          <input
            className="min-h-11 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-500"
            name="phone"
            placeholder="Số điện thoại"
          />
          <input
            className="min-h-11 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-500"
            name="email"
            placeholder="Email"
            type="email"
          />
          <input
            className="min-h-11 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none placeholder:text-slate-500"
            name="source"
            placeholder="Nguồn: Facebook, Zalo..."
          />
        </div>
        <textarea
          className="min-h-24 rounded-md border border-white/10 bg-white/[0.05] p-3 text-sm text-white outline-none placeholder:text-slate-500"
          name="message"
          placeholder="Nhu cầu / ghi chú tư vấn"
        />
        <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
          Lưu lead
        </Button>
        {message ? (
          <p className="rounded-md border border-sky-300/20 bg-sky-400/12 px-4 py-3 text-sm font-semibold text-sky-100">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
