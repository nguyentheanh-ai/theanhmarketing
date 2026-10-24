"use client";

import { AlertTriangle, Copy, KeyRound, Loader2, Mail, Plus, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminDialog } from "@/components/admin/admin-dialog";
import type { Bot247License } from "@/lib/bot247/license-gateway";
import type { Bot247AdminSnapshot, Bot247PaidOrder } from "@/lib/bot247/license-admin";

const buttonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50";
const primaryClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50";
const inputClass = "min-h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const SITE = "https://www.theanhmarketing.com";
const dateLabel = (value?: number | string | null) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";

type Draft = { name: string; email: string; phone: string; note: string; orderCode: string };
const emptyDraft: Draft = { name: "", email: "", phone: "", note: "", orderCode: "" };

// Tin nhắn Zalo (chép rồi dán): mã + link Tải về + link video (link video riêng nằm trong email)
function zaloMessage(l: Bot247License) {
  return [`Chào ${l.name || "anh/chị"}, đây là mã kích hoạt Bot 24/7 của mình:`, "", l.code, "",
    `1. Tải bộ cài: ${SITE}/bot-24-7/tai-ve`,
    "2. Bấm đúp tệp vừa tải › Cài đặt. Bot tự mở sau khoảng 1 phút.",
    "3. Dán mã ở bước đầu tiên › Kích hoạt, rồi đăng nhập Claude hoặc ChatGPT.",
    "",
    "Mỗi mã cài được tối đa 5 lần. Link video hướng dẫn riêng đã gửi trong email; cần hỗ trợ cứ nhắn em kèm mã nhé."].join("\n");
}

async function post(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/crm-v2/bot247/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({ ok: false, message: "Phản hồi không hợp lệ." }));
  if (!response.ok || !data.ok) throw new Error(data.message || "Không thực hiện được.");
  return data;
}

export function Bot247LicensesClient({ initialSnapshot }: { initialSnapshot: Bot247AdminSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<{ license: Bot247License; email: string; subject: string; html: string } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? snapshot.licenses.filter((l) => [l.code, l.name, l.email, l.phone, l.orderCode, l.instance, l.note].some((v) => String(v || "").toLowerCase().includes(q))) : snapshot.licenses;
  }, [snapshot.licenses, query]);

  async function run(key: string, task: () => Promise<string | void>) {
    setBusy(key); setError(""); setNotice("");
    try { const message = await task(); if (message) setNotice(message); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thực hiện được."); }
    finally { setBusy(""); }
  }
  async function reload() {
    const response = await fetch("/api/admin/crm-v2/bot247", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "Không tải được danh sách.");
    setSnapshot(data);
  }
  const act = (key: string, body: Record<string, unknown>, message: string) => run(key, async () => { await post(body); await reload(); return message; });

  async function openPreview(license: Bot247License) {
    await run("preview:" + license.code, async () => {
      const email = license.email || window.prompt("Email của khách để gửi mã:", "")?.trim() || "";
      if (!email) return;
      if (email !== license.email) await post({ action: "update", code: license.code, email });
      const data = await post({ action: "preview_email", code: license.code, email, name: license.name, orderCode: license.orderCode });
      setPreview({ license: { ...license, email }, email, subject: data.preview.subject, html: data.preview.html });
    });
  }

  function startFromOrder(order: Bot247PaidOrder) {
    setCreating({ name: order.studentName, email: order.email, phone: order.phone, note: "Cấp tay cho đơn đã thanh toán", orderCode: order.orderCode });
  }

  return <div className="space-y-4">
    {snapshot.gatewayError ? <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>Không đọc được cổng Bot 24/7: {snapshot.gatewayError}</span></div> : null}
    {snapshot.ordersWithoutLicense.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />{snapshot.ordersWithoutLicense.length} đơn Bot 24/7 đã thanh toán chưa có mã kích hoạt</div>
      <ul className="mt-2 space-y-1">{snapshot.ordersWithoutLicense.map((o) => <li key={o.orderCode} className="flex flex-wrap items-center gap-2">
        <span className="font-mono">{o.orderCode}</span><span>{o.studentName || "—"} · {o.email || "chưa có email"} · {dateLabel(o.paidAt)}</span>
        <button type="button" className={buttonClass} onClick={() => startFromOrder(o)}><KeyRound className="size-4" />Tạo mã</button>
      </li>)}</ul>
    </div> : null}

    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><input className={`${inputClass} pl-9`} placeholder="Tìm mã, tên, email, SĐT, mã đơn" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <button type="button" className={buttonClass} disabled={!!busy} onClick={() => run("reload", async () => { await reload(); })}>{busy === "reload" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Tải lại</button>
      <button type="button" className={primaryClass} onClick={() => setCreating({ ...emptyDraft })}><Plus className="size-4" />Tạo mã mới</button>
    </div>
    {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{notice}</p> : null}
    {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</p> : null}

    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
          <th className="px-3 py-2">Khách</th><th className="px-3 py-2">Mã kích hoạt</th><th className="px-3 py-2">Lượt cài</th><th className="px-3 py-2">Kích hoạt gần nhất</th><th className="px-3 py-2">Phiên bản</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2">Thao tác</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((l) => <tr key={l.code} className={l.revoked ? "bg-slate-50 text-slate-400" : ""}>
            <td className="px-3 py-2"><div className="font-semibold text-slate-800">{l.name || "—"}</div><div className="text-xs text-slate-500">{[l.email, l.phone].filter(Boolean).join(" · ") || "chưa có liên hệ"}</div>{l.orderCode ? <div className="text-xs text-slate-500">Đơn {l.orderCode}</div> : null}{l.note ? <div className="text-xs text-slate-400">{l.note}</div> : null}</td>
            <td className="px-3 py-2 font-mono text-xs">{l.code}<div className="text-slate-400">{l.instance}</div></td>
            <td className="px-3 py-2 tabular-nums">{l.uses || 0}/{l.max || 5}</td>
            <td className="px-3 py-2 text-xs">{dateLabel(l.lastAt)}</td>
            <td className="px-3 py-2 text-xs">{l.version?.v ? `${l.version.v}${l.version.platform ? ` · ${l.version.platform}` : ""}` : "—"}{l.tunnel ? <div className="text-emerald-700">Có truy cập từ xa</div> : null}</td>
            <td className="px-3 py-2">{l.revoked ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Đã thu hồi</span> : <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Đang dùng</span>}</td>
            <td className="px-3 py-2"><div className="flex flex-wrap gap-1.5">
              <button type="button" className={buttonClass} disabled={!!busy} onClick={() => openPreview(l)}><Mail className="size-4" />Gửi mã cho khách</button>
              <button type="button" className={buttonClass} onClick={() => run("zalo", async () => { await navigator.clipboard.writeText(zaloMessage(l)); return `Đã chép tin nhắn Zalo cho ${l.name || l.code}.`; })}><Copy className="size-4" />Chép tin nhắn Zalo</button>
              <button type="button" className={buttonClass} disabled={!!busy} onClick={() => act("uses:" + l.code, { action: "add_uses", code: l.code }, `Đã thêm 5 lượt cài cho ${l.code}.`)}>+5 lượt</button>
              {l.revoked
                ? <button type="button" className={buttonClass} disabled={!!busy} onClick={() => act("restore:" + l.code, { action: "restore", instance: l.instance }, `Đã mở lại ${l.code}.`)}>Mở lại</button>
                : <button type="button" className={buttonClass} disabled={!!busy} onClick={() => { if (window.confirm(`Thu hồi mã ${l.code}? Bot trên máy khách sẽ bị chặn kết nối cổng.`)) act("revoke:" + l.code, { action: "revoke", instance: l.instance }, `Đã thu hồi ${l.code}.`); }}>Thu hồi</button>}
            </div></td>
          </tr>) : <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">{snapshot.licenses.length ? "Không có mã khớp tìm kiếm." : "Chưa có mã kích hoạt nào."}</td></tr>}
        </tbody>
      </table>
    </div>

    <AdminDialog open={!!creating} onClose={() => setCreating(null)} busy={busy === "create"} title="Tạo mã kích hoạt mới" description="Mỗi mã cài được 5 lần. Tạo xong có thể bấm Gửi mã cho khách.">
      {creating ? <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const draft = creating; run("create", async () => { const data = await post({ action: "create", ...draft }); await reload(); setCreating(null); return `Đã tạo mã ${data.license.code} cho ${data.license.name}${data.license.existing ? " (đơn này đã có mã, dùng lại mã cũ)" : ""}.`; }); }}>
        {(["name", "email", "phone", "orderCode", "note"] as const).map((field) => <label key={field} className="block text-sm font-medium text-slate-700">{{ name: "Tên khách *", email: "Email", phone: "Số điện thoại", orderCode: "Mã đơn (nếu có)", note: "Ghi chú" }[field]}
          <input className={`${inputClass} mt-1`} required={field === "name"} type={field === "email" ? "email" : "text"} value={creating[field]} onChange={(e) => setCreating({ ...creating, [field]: e.target.value })} /></label>)}
        <div className="flex justify-end gap-2 pt-2"><button type="button" className={buttonClass} onClick={() => setCreating(null)}>Hủy</button><button type="submit" className={primaryClass} disabled={busy === "create"}>{busy === "create" ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}Tạo mã</button></div>
      </form> : null}
    </AdminDialog>

    <AdminDialog wide open={!!preview} onClose={() => setPreview(null)} busy={busy === "send"} title="Xem trước email gửi mã" description={preview ? `Gửi tới ${preview.email} · ${preview.subject}` : ""}>
      {preview ? <div className="space-y-3">
        <iframe title="Xem trước email" sandbox="" srcDoc={preview.html} className="h-[60dvh] w-full rounded-lg border border-slate-200" />
        <div className="flex justify-end gap-2"><button type="button" className={buttonClass} onClick={() => setPreview(null)}>Hủy</button>
          <button type="button" className={primaryClass} disabled={busy === "send"} onClick={() => { const p = preview; run("send", async () => { await post({ action: "send_email", code: p.license.code, email: p.email, name: p.license.name, orderCode: p.license.orderCode }); setPreview(null); return `Đã gửi mã ${p.license.code} tới ${p.email}.`; }); }}>{busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}Gửi email</button></div>
      </div> : null}
    </AdminDialog>
  </div>;
}
