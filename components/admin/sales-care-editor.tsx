"use client";

import { useEffect, useRef, useState } from "react";
import { salesCareStatuses, type SalesCareEntry, type SalesCareStatus } from "@/lib/admin/sales-care";

export function SalesCareEditor({ customerId, initialEntry, onSaved, onBusyChange }: { initialEntry?: SalesCareEntry; onBusyChange: (busy: boolean) => void; customerId: string; onSaved: (entry: SalesCareEntry) => void }) {
  const [status, setStatus] = useState<SalesCareStatus>(initialEntry?.status || "not_contacted");
  const [note, setNote] = useState(initialEntry?.note || "");
  const [history, setHistory] = useState<SalesCareEntry[]>(initialEntry ? [initialEntry] : []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(true);
  const historyRequest = useRef<AbortController | null>(null);
  const [historyMessage, setHistoryMessage] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    historyRequest.current = controller;
    fetch(`/api/admin/crm-v2/sales/care?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || "Không tải được lịch sử chăm sóc.");
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.history)) throw new Error("Không tải được lịch sử chăm sóc.");
        const entries: SalesCareEntry[] = result.history;
        setHistory(entries); setReady(true);
      }).catch((error) => { if (!controller.signal.aborted) setHistoryMessage(error instanceof Error ? error.message : "Không tải được lịch sử chăm sóc."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customerId, reload]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !ready) return;
    historyRequest.current?.abort();
    setLoading(false);
    setSaving(true); onBusyChange(true); setMessage("");
    try {
      const response = await fetch("/api/admin/crm-v2/sales/care", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, status, note }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Chưa xác nhận được lần lưu.");
      setHistory((previous) => [result.saved, ...previous].slice(0, 30));
      setNote(result.saved.note); onSaved(result.saved); setMessage("Đã lưu cập nhật chăm sóc.");
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "Chưa xác nhận được lần lưu."} Bấm Tải lại lịch sử để kiểm tra.`);
      setReady(false);
    } finally { setSaving(false); onBusyChange(false); }
  }
  return <section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4" aria-label="Chăm sóc khách hàng">
    <h3 className="text-sm font-bold text-slate-900">Chăm sóc khách hàng</h3>
    <form onSubmit={save} className="space-y-3">
      <label className="grid gap-1 text-sm font-medium">Trạng thái chăm sóc<select aria-label="Trạng thái chăm sóc" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={status} disabled={saving} onChange={(event) => setStatus(event.target.value as SalesCareStatus)}>{Object.entries(salesCareStatuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Ghi chú của sale<textarea aria-label="Ghi chú của sale" rows={4} maxLength={1000} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal" placeholder="Nhu cầu khách, kết quả trao đổi, việc cần làm tiếp…" value={note} disabled={saving} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={saving || !ready} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Đang lưu…" : "Lưu chăm sóc"}</button><button type="button" disabled={loading || saving} onClick={() => { setLoading(true); setHistoryMessage(""); setReload((previous) => previous + 1); }} className="text-xs font-semibold text-blue-700 disabled:opacity-40">Tải lại lịch sử</button><span className="text-xs text-slate-500">{note.length}/1.000 ký tự</span></div>
    </form>
    <p role="status" aria-live="polite" className="text-sm text-blue-800">{message}</p>
    <div className="space-y-3 border-t border-blue-100 pt-3"><h4 className="text-xs font-semibold text-slate-600">30 cập nhật gần nhất</h4><p role="status" aria-live="polite" className="text-xs text-slate-500">{loading ? "Đang tải lịch sử…" : historyMessage}</p>{!loading && !historyMessage && !history.length && ready ? <p className="text-sm text-slate-500">Chưa có cập nhật chăm sóc.</p> : null}{history.map((entry) => <article key={entry.id} className="space-y-1 rounded-lg bg-white p-3 text-sm"><p className="font-semibold text-slate-800">{salesCareStatuses[entry.status]}</p><p className="whitespace-pre-wrap break-words text-slate-600">{entry.note || "Không có ghi chú"}</p><p className="break-words text-xs text-slate-500">{entry.actorName || entry.actorEmail || "Quản trị viên"}{entry.actorName && entry.actorEmail && entry.actorName !== entry.actorEmail ? ` (${entry.actorEmail})` : ""} · {new Date(entry.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></article>)}</div>
  </section>;
}
