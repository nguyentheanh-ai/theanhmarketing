"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Copy, Download, Mail, Phone, RefreshCw, Search, Users, X } from "lucide-react";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { datePreset, filterSalesCustomers, normalizeSalesPhone, salesContacts, salesCsv, salesPaymentStatus, salesProductLabels, shortSalesProduct, type SalesCustomer, type SalesFilters } from "@/lib/admin/sales-dashboard";

const inputClass = "h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";
function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa có ngày" : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function SalesDashboard({ records, today, loadedAt, initialFilters, includeProspects, courseCatalog = [] }: {
  courseCatalog?: { slug: string; title: string }[]; records: SalesCustomer[]; today: string; loadedAt: string; initialFilters: SalesFilters; includeProspects: boolean;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<SalesCustomer | null>(null);
  const [feedback, setFeedback] = useState("");
  const filtered = useMemo(() => filterSalesCustomers(records, filters), [records, filters]);
  const selectedRows = filtered.filter((row) => selected.has(row.id));
  const actionRows = selectedRows.length ? selectedRows : filtered;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const courses = useMemo(() => {
    const titles = new Map(courseCatalog.map((course) => [course.slug, course.title]));
    const map = new Map<string, string>();
    records.forEach((row) => row.courseSlugs.forEach((slug) => map.set(slug, titles.get(slug) || slug)));
    return [...map].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [records, courseCatalog]);
  const sources = useMemo(() => [...new Set(records.map((r) => r.source).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [records]);
  const emailCount = salesContacts(actionRows, "email").length;
  const phoneCount = salesContacts(actionRows, "phone").length;
  function update(patch: Partial<SalesFilters>) {
    setFilters((previous) => ({ ...previous, ...patch })); setPage(1); setSelected(new Set()); setFeedback("");
  }
  function reset() { setFilters({ ...initialFilters, q: "", from: "", to: "", dateField: "registeredAt", status: "all", course: "", source: "", contact: "all", sort: "newest" }); setPage(1); setSelected(new Set()); setFeedback(""); }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(`Đã sao chép ${label}.`); }
    catch { setFeedback("Trình duyệt chưa cho phép sao chép. Anh có thể bôi đen liên hệ hoặc tải CSV."); }
  }
  function toggle(id: string) { setSelected((old) => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([salesCsv(actionRows, courseCatalog, filters.dateField)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `khach-hang-sale-${today}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setFeedback(`Đã xuất ${actionRows.length} khách hàng ra CSV.`);
  }
  const contact = (row: SalesCustomer, field: "email" | "phone") => {
    const value = row[field];
    return <div className="flex min-w-0 items-center gap-1.5"><span className={`min-w-0 break-all text-sm ${value ? "text-slate-700" : "text-slate-400"}`}>{value || "—"}</span>{value ? <button type="button" className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700" aria-label={`Sao chép ${field === "email" ? "email" : "số điện thoại"} ${value}`} onClick={() => copy(value, field === "email" ? "email" : "số điện thoại")}><Copy className="size-3.5" /></button> : null}</div>;
  };
  const presets = [["today", "Hôm nay"], ["yesterday", "Hôm qua"], ["7d", "7 ngày"], ["30d", "30 ngày"], ["all", "Toàn bộ"]];
  const activePreset = presets.find(([key]) => { const range = datePreset(key, today); return range.from === filters.from && range.to === filters.to; })?.[0] || "custom";
  return <div data-admin-ui="modern" className="space-y-3 pb-6">
    {!includeProspects ? <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">Tài khoản hiện tại chỉ xem phạm vi học viên được phép truy cập.</p> : null}
    <section aria-label="Danh sách khách hàng" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3"><h1 className="text-lg font-bold text-slate-900">Khách hàng</h1><span className="text-xs text-slate-500">{filtered.length} khách</span></div>
        <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={!emailCount || refreshing} type="button" onClick={() => copy(salesContacts(actionRows, "email").join("\n"), `${emailCount} email không trùng`)}><Mail className="size-3.5" />Lấy email ({emailCount})</button><button className={buttonClass} disabled={!phoneCount || refreshing} type="button" onClick={() => copy(salesContacts(actionRows, "phone").join("\n"), `${phoneCount} số điện thoại không trùng`)}><Phone className="size-3.5" />Lấy SĐT ({phoneCount})</button><button className={buttonClass} disabled={!actionRows.length || refreshing} type="button" onClick={exportCsv}><Download className="size-3.5" />Tải CSV</button><button type="button" className={buttonClass} disabled={refreshing} onClick={() => { setSelected(new Set()); setProfile(null); startTransition(() => router.refresh()); }}><RefreshCw className={`size-3.5 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} />{refreshing ? "Đang tải…" : "Làm mới"}</button></div>
      </header>
      <div role="group" aria-label="Bộ lọc khách hàng" className="relative flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="relative min-w-[200px] flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><input aria-label="Tìm khách hàng" className={`${inputClass} w-full pl-9`} type="search" placeholder="Tên, SĐT, email, mã đơn…" value={filters.q} onChange={(e) => update({ q: e.target.value })} /></div>
        <select aria-label="Khoảng ngày" className={inputClass} value={activePreset} onChange={(e) => { if (e.target.value !== "custom") update(datePreset(e.target.value, today)); }}>{presets.map(([key, label]) => <option key={key} value={key}>{label}</option>)}<option value="custom">Tùy chọn</option></select>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">Từ<input aria-label="Từ ngày" className={`${inputClass} w-36`} type="date" value={filters.from} aria-invalid={invalidRange} onChange={(e) => update({ from: e.target.value })} /></label>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">Đến<input aria-label="Đến ngày" className={`${inputClass} w-36`} type="date" value={filters.to} aria-invalid={invalidRange} onChange={(e) => update({ to: e.target.value })} /></label>
        <select aria-label="Tình trạng" className={inputClass} value={filters.status} onChange={(e) => update({ status: e.target.value as SalesFilters["status"] })}><option value="all">Tất cả tình trạng</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select>
        <select aria-label="Sản phẩm" className={`${inputClass} max-w-44`} value={filters.course} onChange={(e) => update({ course: e.target.value })}><option value="">Tất cả sản phẩm</option>{courses.map(([slug, title]) => <option key={slug} value={slug}>{shortSalesProduct(slug, title)}</option>)}</select>
        <details><summary className={`${buttonClass} cursor-pointer`}>Lọc thêm</summary><div className="absolute inset-x-4 top-full z-20 mt-1 grid sm:left-auto sm:w-64 gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"><label className="grid gap-1 text-xs text-slate-500">Ngày theo<select className={inputClass} value={filters.dateField} onChange={(e) => update({ dateField: e.target.value as SalesFilters["dateField"] })}><option value="registeredAt">Ghi nhận đầu tiên</option><option value="updatedAt">Cập nhật hồ sơ</option></select></label><label className="grid gap-1 text-xs text-slate-500">Nguồn<select className={inputClass} value={filters.source} onChange={(e) => update({ source: e.target.value })}><option value="">Tất cả nguồn</option>{sources.map((source) => <option key={source}>{source}</option>)}</select></label><label className="grid gap-1 text-xs text-slate-500">Liên hệ<select className={inputClass} value={filters.contact} onChange={(e) => update({ contact: e.target.value as SalesFilters["contact"] })}><option value="all">Tất cả liên hệ</option><option value="phone">Có SĐT</option><option value="email">Có email</option><option value="missing">Thiếu email / SĐT</option></select></label><label className="grid gap-1 text-xs text-slate-500">Sắp xếp<select className={inputClass} value={filters.sort} onChange={(e) => update({ sort: e.target.value as SalesFilters["sort"] })}><option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option><option value="name">Tên A → Z</option></select></label></div></details>
        <button className="px-2 text-xs font-semibold text-slate-500 hover:text-blue-700" type="button" onClick={reset}>Xóa lọc</button>
      </div>
      {invalidRange ? <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500"><span>{selectedRows.length ? `Đã chọn ${selectedRows.length} khách` : `Lấy liên hệ / CSV của ${filtered.length} khách khớp bộ lọc`}{selectedRows.length ? <button type="button" className="ml-3 font-semibold text-blue-700" onClick={() => setSelected(new Set())}>Bỏ chọn</button> : null}</span><span>{filters.dateField === "registeredAt" ? "Ngày ghi nhận" : "Ngày cập nhật"} · Giờ Việt Nam{filters.source ? ` · ${filters.source}` : ""}{filters.contact !== "all" ? ` · ${filters.contact === "email" ? "Có email" : filters.contact === "phone" ? "Có SĐT" : "Thiếu liên hệ"}` : ""}</span></div>
      <div role="status" aria-live="polite" className={feedback ? "flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800" : "sr-only"}>{feedback ? <Check className="size-4 shrink-0" /> : null}{feedback}</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] table-fixed text-left"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"><tr>
        <th scope="col" className="w-[17%] px-4 py-3"><div className="flex items-center gap-3"><input type="checkbox" aria-label="Chọn trang này" className="size-4 accent-blue-600" disabled={!visible.length} checked={Boolean(visible.length) && visible.every((r) => selected.has(r.id))} onChange={(e) => { const checked = e.target.checked; setSelected((old) => { const next = new Set(old); visible.forEach((r) => checked ? next.add(r.id) : next.delete(r.id)); return next; }); }} /><span>Ngày</span></div></th>
        <th scope="col" className="w-[17%] px-3 py-3">Tên</th><th scope="col" className="w-[15%] px-3 py-3">SĐT</th><th scope="col" className="w-[12%] px-3 py-3">Tình trạng</th><th scope="col" className="w-[15%] px-3 py-3">Sản phẩm</th><th scope="col" className="w-[24%] px-3 py-3">Email</th>
      </tr></thead><tbody>{visible.map((row) => <tr key={row.id} className={`border-b border-slate-100 align-middle ${selected.has(row.id) ? "bg-blue-50/60" : "hover:bg-slate-50/70"}`}>
        <td className="px-4 py-3"><div className="flex items-center gap-3"><input className="size-4 shrink-0 accent-blue-600" type="checkbox" aria-label={`Chọn ${row.name || row.email || row.phone}`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} /><span className="text-xs leading-5 tabular-nums text-slate-500">{dateTime(row[filters.dateField])}</span></div></td>
        <td className="px-3 py-3"><button type="button" aria-label={`Xem chi tiết ${row.name || row.email || row.phone}`} onClick={() => setProfile(row)} className="break-words text-left text-sm font-semibold text-slate-900 hover:text-blue-700">{row.name || "Chưa có tên"}</button></td>
        <td className="px-3 py-3">{contact(row, "phone")}</td>
        <td className="px-3 py-3"><PaymentStatus row={row} /></td>
        <td className="px-3 py-3"><button type="button" onClick={() => setProfile(row)} title={row.courseTitles.join(" · ")} className="flex flex-wrap gap-1 text-left">{salesProductLabels(row, courseCatalog).map((label, i) => <span key={`${label}-${i}`} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{label}</span>)}{!row.courseSlugs.length && !row.courseTitles.length ? <span className="text-xs text-slate-400">—</span> : null}</button></td>
        <td className="px-3 py-3">{contact(row, "email")}</td>
      </tr>)}</tbody></table></div>
      {!visible.length ? <div className="px-5 py-14 text-center"><Users className="mx-auto mb-3 size-9 text-slate-300" /><h3 className="font-semibold">{invalidRange ? "Cần sửa khoảng ngày" : "Không có khách khớp bộ lọc"}</h3><p className="mt-2 text-sm text-slate-500">{invalidRange ? "Kiểm tra lại ngày bắt đầu và kết thúc ở phía trên." : "Thử mở rộng khoảng ngày hoặc bỏ bớt điều kiện tìm kiếm."}</p><button type="button" onClick={reset} className="mt-4 text-sm font-semibold text-blue-700">Xem tất cả khách hàng</button></div> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs text-slate-500"><span>{filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} / {filtered.length} khách</span><label className="flex items-center gap-2">Mỗi trang<select className="rounded-lg border border-slate-200 bg-white p-2" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>{[25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label><div className="flex items-center gap-2"><button type="button" aria-label="Trang trước" className={buttonClass} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></button><span>Trang {currentPage}/{totalPages}</span><button type="button" aria-label="Trang tiếp" className={buttonClass} disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></button></div></footer>
    </section>
    <p className="text-xs leading-5 text-slate-400">Dữ liệu tải lúc {dateTime(loadedAt)} (giờ Việt Nam). Paid: có ít nhất một đơn đã thanh toán. Unpaid: chưa có đơn đã thanh toán. Nhấn Làm mới để lấy dữ liệu mới nhất.</p>
    <AdminDialog open={Boolean(profile)} onClose={() => setProfile(null)} title={profile?.name || "Chi tiết khách hàng"} description="Thông tin liên hệ và lịch sử đơn gắn với hồ sơ">
      {profile ? <div className="space-y-5 p-5"><div className="space-y-2 rounded-xl bg-slate-50 p-4">{contact(profile, "email")}{contact(profile, "phone")}<div className="flex flex-wrap gap-2 pt-2">{profile.phone && normalizeSalesPhone(profile.phone) ? <a className={buttonClass} href={`tel:${normalizeSalesPhone(profile.phone)}`}><Phone className="size-4" />Gọi điện</a> : null}<Link className={buttonClass} href={`/admin/crm-v2/customers?profile=${encodeURIComponent(profile.email || profile.id)}`}>Hồ sơ đầy đủ <ArrowUpRight className="size-4" /></Link></div></div><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">Ghi nhận đầu tiên</dt><dd className="mt-1">{dateTime(profile.registeredAt)}</dd></div><div><dt className="text-xs text-slate-400">Cập nhật hồ sơ</dt><dd className="mt-1">{dateTime(profile.updatedAt)}</dd></div><div><dt className="text-xs text-slate-400">Nguồn khách</dt><dd className="mt-1 break-words">{profile.source || "Chưa rõ nguồn"}</dd></div><div><dt className="mb-1 text-xs text-slate-400">Đơn hàng</dt><dd><PaymentStatus row={profile} /></dd></div></dl><div><h3 className="mb-2 text-sm font-bold">Sản phẩm / khóa học</h3>{profile.courseTitles.length ? profile.courseTitles.map((title, i) => <p key={`${title}-${i}`} className="border-b border-slate-100 py-2 text-sm text-slate-600">{title}</p>) : <p className="text-sm text-slate-400">Chưa có sản phẩm</p>}</div><div><h3 className="mb-2 text-sm font-bold">Mã đơn hàng</h3>{[...profile.paidOrderCodes.map((code) => ({ code, paid: true })), ...profile.pendingOrderCodes.map((code) => ({ code, paid: false }))].map(({ code, paid }) => <div key={code} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-xs"><button type="button" onClick={() => copy(code, "mã đơn")} className="flex items-center gap-2 break-all font-mono text-blue-700">{code}<Copy className="size-3" /></button><span className={paid ? "text-emerald-700" : "text-red-700"}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</span></div>)}{!profile.paidOrderCodes.length && !profile.pendingOrderCodes.length ? <p className="text-sm text-slate-400">Chưa có đơn hàng trong hồ sơ.</p> : null}</div><div><h3 className="mb-2 text-sm font-bold">Ghi chú hiện có</h3><p className="whitespace-pre-wrap break-words rounded-xl bg-amber-50 p-3 text-sm leading-6 text-slate-600">{profile.note || "Chưa có ghi chú"}</p></div><button type="button" className={buttonClass} onClick={() => setProfile(null)}><X className="size-4" />Đóng</button></div> : null}
    </AdminDialog>
  </div>;
}
function PaymentStatus({ row }: { row: SalesCustomer }) {
  const paid = salesPaymentStatus(row) === "Paid";
  return <span title={paid ? "Đã thanh toán" : "Chưa thanh toán"} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${paid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-red-500"}`} />{paid ? "Paid" : "Unpaid"}</span>;
}
