"use client";

import { Copy, KeyRound, RotateCcw, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Bot247License } from "@/lib/products/bot247-admin";

const input = "min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50";
const ghost = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.message || "Chưa thực hiện được. Thử lại sau giây lát.");
  return data;
}

export function AdsMindGrantForm() {
  const router = useRouter();
  const [email, setEmail] = useState(""), [plan, setPlan] = useState("1m"), [busy, setBusy] = useState(false), [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setNote(null);
    try { const d = await post("/api/admin/crm-v2/products/adsmind", { email, plan }); setNote({ ok: true, text: `Đã mở gói cho ${email}${d.expiresAt ? ` · hết hạn ${new Date(d.expiresAt).toLocaleDateString("vi-VN")}` : ""}.` }); setEmail(""); router.refresh(); }
    catch (err) { setNote({ ok: false, text: (err as Error).message }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="text-sm font-black text-slate-950">Mở / gia hạn gói bằng tay</h2>
    <p className="mt-1 text-xs text-slate-500">Dùng khi khách chuyển khoản sai nội dung hoặc tặng gói. Thời gian cộng dồn vào gói hiện tại; đơn ghi tên người mở.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
      <input className={input} type="email" required placeholder="Email tài khoản AdsMind" value={email} onChange={(e) => setEmail(e.target.value)} />
      <select className={input} value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Gói">
        <option value="7d">7 ngày</option><option value="1m">1 tháng</option><option value="6m">6 tháng</option><option value="12m">12 tháng</option>
      </select>
      <button className={primary} disabled={busy || !email}>{busy ? "Đang mở…" : "Mở gói"}</button>
    </div>
    {note ? <p className={`mt-2 text-sm font-semibold ${note.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{note.text}</p> : null}
  </form>;
}

export function Bot247Panel({ licenses }: { licenses: Bot247License[] }) {
  const router = useRouter();
  const [instance, setInstance] = useState(""), [name, setName] = useState(""), [max, setMax] = useState(5), [busy, setBusy] = useState(""), [error, setError] = useState(""), [issued, setIssued] = useState<{ code: string; name: string; instance: string } | null>(null), [copied, setCopied] = useState("");
  const copy = (text: string) => { void navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(""), 1500); };
  async function issue(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy("new"); setError(""); setIssued(null);
    try { const d = await post("/api/admin/crm-v2/products/bot247", { action: "new", instance: instance.trim(), name: name.trim(), max }); setIssued({ code: d.code, name: name.trim() || instance, instance: d.instance }); setInstance(""); setName(""); router.refresh(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(""); }
  }
  async function toggle(l: Bot247License) {
    if (busy) return;
    if (!l.revoked && !window.confirm(`Thu hồi máy "${l.instance}"? Máy đó sẽ không dùng được cổng kết nối, đường hầm và bản cập nhật.`)) return;
    setBusy(l.instance); setError("");
    try { await post("/api/admin/crm-v2/products/bot247", { action: l.revoked ? "restore" : "revoke", instance: l.instance }); router.refresh(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(""); }
  }
  const message = issued ? `Chào ${issued.name}, mã kích hoạt Bot 24/7 của anh/chị: ${issued.code}\nCài bộ cài Bot 24/7, mở ứng dụng và nhập mã này ở bước đầu tiên.` : "";
  return <div className="space-y-4">
    <form onSubmit={issue} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-slate-950">Cấp mã kích hoạt mới</h2>
      <p className="mt-1 text-xs text-slate-500">Mã máy là tên ngắn của khách (chữ thường, số, gạch ngang), ví dụ <code>shop-moc</code>. Mỗi mã kích hoạt dùng được tối đa số lần anh đặt.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_110px_auto]">
        <input className={input} required placeholder="Mã máy" value={instance} onChange={(e) => setInstance(e.target.value.toLowerCase())} pattern="[a-z0-9][a-z0-9-]{2,39}" />
        <input className={input} placeholder="Tên khách (không bắt buộc)" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <input className={input} type="number" min={1} max={20} value={max} onChange={(e) => setMax(Number(e.target.value) || 5)} aria-label="Số lần kích hoạt tối đa" title="Số lần kích hoạt tối đa" />
        <button className={primary} disabled={!!busy || !instance}><KeyRound className="size-4" />{busy === "new" ? "Đang cấp…" : "Cấp mã"}</button>
      </div>
      {issued ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm" role="status">
        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-emerald-800">Mã cho {issued.name}:</span><code className="rounded bg-white px-2 py-1 text-base font-black tracking-wider">{issued.code}</code>
          <button type="button" className={ghost} onClick={() => copy(issued.code)}><Copy className="size-3.5" />{copied === issued.code ? "Đã chép" : "Chép mã"}</button>
          <button type="button" className={ghost} onClick={() => copy(message)}><Copy className="size-3.5" />{copied === message ? "Đã chép" : "Chép lời nhắn gửi khách"}</button></div>
      </div> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">{error}</p> : null}
    </form>
    <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Khách</th><th className="px-3 py-2">Mã máy</th><th className="px-3 py-2">Mã kích hoạt</th><th className="px-3 py-2">Đã dùng</th><th className="px-3 py-2">Cấp lúc</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2"></th></tr></thead>
        <tbody>{licenses.length ? licenses.map((l) => <tr key={l.code} className="border-b border-slate-100 last:border-0">
          <td className="px-3 py-2 font-semibold">{l.name || "—"}</td>
          <td className="px-3 py-2"><code>{l.instance}</code></td>
          <td className="px-3 py-2"><button type="button" className="font-mono text-xs text-slate-700 hover:text-blue-700" onClick={() => copy(l.code)} title="Bấm để chép">{copied === l.code ? "Đã chép" : l.code}</button></td>
          <td className="px-3 py-2">{l.uses ?? 0}/{l.max ?? 5}{l.lastAt ? <span className="block text-xs text-slate-500">lần cuối {new Date(l.lastAt).toLocaleDateString("vi-VN")}</span> : null}</td>
          <td className="px-3 py-2 text-xs text-slate-500">{l.created ? new Date(l.created).toLocaleString("vi-VN") : "—"}</td>
          <td className="px-3 py-2">{l.revoked ? <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">Đã thu hồi</span> : (l.uses ?? 0) > 0 ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Đã kích hoạt</span> : <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">Chưa dùng</span>}</td>
          <td className="px-3 py-2 text-right"><button type="button" className={ghost} disabled={!!busy} onClick={() => void toggle(l)}>{l.revoked ? <><RotateCcw className="size-3.5" />Khôi phục máy</> : <><ShieldOff className="size-3.5" />Thu hồi máy</>}</button></td>
        </tr>) : <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">Chưa có mã kích hoạt nào.</td></tr>}</tbody>
      </table>
    </section>
  </div>;
}
