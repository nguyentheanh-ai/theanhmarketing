"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { SUPPORT_LEGACY_TOPICS, SUPPORT_MIN_LEAD_DAYS, SUPPORT_TOPICS } from "@/lib/support-booking/constants";
import { isSupportSunday } from "@/lib/support-booking/domain";
import {
  calendarDates, calendarRange, calendarStatus, calendarStatusLabels, isCalendarDate,
  layoutCalendarEvents, moveCalendarDate, type CalendarBooking, type CalendarStatus,
  type CalendarView, type SupportCalendarSnapshot,
} from "@/lib/support-booking/admin-calendar";

const buttonClass = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50";
const inputClass = "min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const statusColors: Record<CalendarStatus, string> = {
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  held: "border-amber-200 bg-amber-50 text-amber-900",
  needs_review: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
  expired: "border-slate-200 bg-slate-100 text-slate-500",
};
const weekdayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const topicLabel = (value: string) => [...SUPPORT_TOPICS, ...SUPPORT_LEGACY_TOPICS].find((topic) => topic.value === value)?.label ?? value;
const dateLabel = (date: string, full = false) => new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: full ? "long" : "short", day: "2-digit", month: "2-digit", ...(full ? { year: "numeric" } : {}) }).format(new Date(`${date}T00:00:00Z`));
const timeLabel = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const amountLabel = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;

function BookingButton({ booking, now, onClick, compact = false }: { booking: CalendarBooking; now: string; onClick: () => void; compact?: boolean }) {
  const status = calendarStatus(booking, now);
  return <button type="button" onClick={onClick} title={`${booking.appointmentTime}–${timeLabel(booking.endsAt)} · ${booking.customerName} · ${topicLabel(booking.topic)} · ${calendarStatusLabels[status]}`} className={`block w-full min-w-0 rounded-md border px-2 py-1 text-left transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-blue-500 ${statusColors[status]}`}>
    <span className="block truncate text-xs font-semibold"><span className="mr-1.5 tabular-nums">{booking.appointmentTime}</span>{booking.customerName || "Khách chưa có tên"}</span>
    {!compact ? <span className="mt-1 block truncate text-xs opacity-80">{topicLabel(booking.topic)} · {booking.durationMinutes} phút</span> : null}
  </button>;
}

export function SupportBookingsClient({ initialSnapshot, initialError = "", today }: { initialSnapshot: SupportCalendarSnapshot | null; initialError?: string; today: string }) {
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<CalendarView>("month");
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const firstLoad = useRef(true);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [selectedBooking, setSelectedBooking] = useState<CalendarBooking | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [busyNote, setBusyNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const { from, to } = calendarRange(anchor, view);
  const dates = useMemo(() => calendarDates(from, to), [from, to]);
  const rangeMatches = snapshot?.from === from && snapshot?.to === to;
  const display = rangeMatches ? snapshot : null;
  const now = snapshot?.now ?? `${today}T00:00:00+07:00`;
  const [clock, setClock] = useState(now);
  // Held reservations expire without a page reload; refreshing also reconciles payment confirmation.
  useEffect(() => { const timer = setInterval(() => setClock(new Date().toISOString()), 30_000); return () => clearInterval(timer); }, []);
  const effectiveNow = clock > now ? clock : now;

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/admin/crm-v2/support-bookings?${new URLSearchParams({ from, to })}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok || !payload.snapshot) throw new Error(payload.message || "Không tải được lịch hỗ trợ.");
        if (!controller.signal.aborted) setSnapshot(payload.snapshot);
      })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Không tải được lịch hỗ trợ."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [from, to, reload]);

  const filteredBookings = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("vi");
    return (display?.bookings ?? []).filter((booking) => {
      const actualStatus = calendarStatus(booking, effectiveNow);
      const statusMatches = status === "all" || (status === "active" ? !["cancelled", "expired"].includes(actualStatus) : actualStatus === status);
      return statusMatches && (type === "all" || booking.bookingType === type) && (!search || [booking.customerName, booking.email, booking.phone, booking.orderCode, topicLabel(booking.topic)].join(" ").toLocaleLowerCase("vi").includes(search));
    });
  }, [display, query, status, type, effectiveNow]);
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const booking of filteredBookings) map.set(booking.appointmentDate, [...(map.get(booking.appointmentDate) ?? []), booking]);
    return map;
  }, [filteredBookings]);
  const busyDates = new Map((display?.busyDates ?? []).map((item) => [item.date, item.note]));
  const title = view === "month" ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${anchor}T00:00:00Z`)) : view === "day" ? dateLabel(anchor, true) : `${dateLabel(from)} – ${dateLabel(to)} / ${to.slice(0, 4)}`;

  function openDay(date: string) {
    setSelectedDate(date);
    setBusyNote(busyDates.get(date) ?? "");
    setMessage("");
  }

  async function updateBusyDate(busy: boolean) {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/crm-v2/support-bookings/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: selectedDate, busy, note: busyNote }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Không cập nhật được ngày bận.");
      setSnapshot((current) => current ? { ...current, busyDates: [...current.busyDates.filter((item) => item.date !== selectedDate), ...(busy ? [{ date: selectedDate, note: busyNote.trim() }] : [])] } : current);
      setMessage(busy ? "Đã lưu ngày bận." : "Đã mở lại ngày.");
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : "Mất kết nối. Vui lòng thử lại."); }
    finally { setPending(false); }
  }

  const dayBookings = (display?.bookings ?? []).filter((booking) => booking.appointmentDate === selectedDate);
  const dayCanChange = Boolean(display && selectedDate >= display.minDate && selectedDate <= display.maxDate && !isSupportSunday(selectedDate));

  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Lịch hỗ trợ" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CalendarDays className="mr-1 size-5 text-blue-600" />
        <button type="button" className={buttonClass} onClick={() => setAnchor(today)}>Hôm nay</button>
        <button type="button" className={`${buttonClass} px-2`} aria-label="Khoảng lịch trước" onClick={() => setAnchor(moveCalendarDate(anchor, view, -1))}><ChevronLeft className="size-4" /></button>
        <button type="button" className={`${buttonClass} px-2`} aria-label="Khoảng lịch sau" onClick={() => setAnchor(moveCalendarDate(anchor, view, 1))}><ChevronRight className="size-4" /></button>
        <h2 className="ml-1 text-base font-semibold capitalize text-slate-900">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" aria-label="Đi tới ngày" value={anchor} className={`${inputClass} w-36`} onChange={(event) => { if (isCalendarDate(event.target.value)) setAnchor(event.target.value); }} />
        <div className="flex rounded-lg border border-slate-200 p-0.5" aria-label="Chế độ xem lịch">
          {([['month', 'Tháng'], ['week', 'Tuần'], ['day', 'Ngày']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} className={`min-h-8 rounded-md px-3 text-sm font-medium ${view === value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setView(value)}>{label}</button>)}
        </div>
        <button type="button" className={`${buttonClass} px-2`} aria-label="Tải lại lịch" disabled={loading} onClick={() => setReload((value) => value + 1)}>{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}</button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-3 py-2 sm:px-4">
      <label className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><input className={`${inputClass} w-full pl-9`} type="search" aria-label="Tìm lịch trong khoảng đang xem" placeholder="Tìm tên, email, điện thoại, mã đơn…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <select aria-label="Loại lịch" className={inputClass} value={type} onChange={(event) => setType(event.target.value)}><option value="all">Tất cả loại lịch</option><option value="student">Hỗ trợ học viên</option><option value="consultation">Tư vấn 1:1</option></select>
      <select aria-label="Trạng thái lịch" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Lịch đang xử lý</option><option value="all">Tất cả trạng thái</option>{Object.entries(calendarStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      <span className="text-xs text-slate-500">GMT+7</span>
    </div>
    {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}{display ? " Dữ liệu đang hiển thị là lần tải gần nhất." : ""}</span><button type="button" className={buttonClass} onClick={() => setReload((value) => value + 1)}>Thử lại</button></div> : null}
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-slate-500">
      <span>{loading ? "Đang tải khoảng lịch…" : !display ? "Lịch chưa sẵn sàng" : `${filteredBookings.length} buổi hẹn trong khoảng đang xem`} · Bấm buổi hẹn để mở chi tiết</span>
      <div className="flex flex-wrap gap-3"><span><i className="mr-1.5 inline-block size-2 rounded-full bg-blue-500" />Đã xác nhận</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-amber-400" />Giữ chỗ</span><span><i className="mr-1.5 inline-block size-2 rounded-full bg-rose-400" />Cần kiểm tra / ngày bận</span></div>
    </div>
    {!loading && display && !filteredBookings.length ? <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-sm text-slate-500">Không có buổi hẹn phù hợp trong khoảng này. Anh vẫn có thể bấm ngày để quản lý lịch trống.</p> : null}
    <div className="overflow-x-auto border-t border-slate-200">
      {view === "month" ? <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{weekdayLabels.map((day) => <div key={day} className="px-3 py-2 text-center text-xs font-medium text-slate-500">{day}</div>)}</div>
        <div className="grid grid-cols-7" style={{ gridAutoRows: "minmax(94px, 1fr)", minHeight: 564 }}>
          {dates.map((date) => {
            const events = bookingsByDate.get(date) ?? [];
            const busy = busyDates.has(date);
            const sunday = isSupportSunday(date);
            return <div key={date} className={`min-w-0 border-b border-r border-slate-100 p-1.5 ${date.slice(0, 7) !== anchor.slice(0, 7) ? "bg-slate-50/80" : "bg-white"}`}>
              <div className="mb-1 flex items-center justify-between gap-1"><button type="button" aria-label={`Mở ngày ${date}`} onClick={() => openDay(date)} disabled={!display || loading} className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold hover:ring-2 hover:ring-blue-200 ${date === today ? "bg-blue-600 text-white" : "text-slate-700"}`}>{Number(date.slice(8))}</button>{busy ? <button type="button" onClick={() => openDay(date)} className="truncate rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700" title={busyDates.get(date)}>Ngày bận</button> : sunday ? <span className="text-[10px] text-slate-400">Nghỉ</span> : null}</div>
              <div className="space-y-1">{events.slice(0, 2).map((booking) => <BookingButton key={booking.id} booking={booking} now={effectiveNow} compact onClick={() => setSelectedBooking(booking)} />)}{events.length > 2 ? <button type="button" className="rounded px-1 text-xs font-medium text-blue-700 hover:bg-blue-50" onClick={() => openDay(date)}>+{events.length - 2} buổi hẹn</button> : null}</div>
            </div>;
          })}
        </div>
      </div> : <div style={{ minWidth: view === "week" ? 760 : 320 }}>
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `52px repeat(${dates.length}, minmax(0, 1fr))` }}><span className="px-1 py-3 text-center text-[10px] text-slate-400">GMT+7</span>{dates.map((date) => <button type="button" key={date} disabled={!display || loading} onClick={() => openDay(date)} className={`min-w-0 border-l border-slate-100 px-1 py-2 text-center text-xs hover:bg-blue-50 ${date === today ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}><span className="block font-semibold">{dateLabel(date)}</span><span className={`mt-1 block text-[10px] ${busyDates.has(date) ? "text-rose-600" : "text-slate-400"}`}>{busyDates.has(date) ? "Ngày bận" : isSupportSunday(date) ? "Nghỉ Chủ nhật" : `${bookingsByDate.get(date)?.length ?? 0} buổi hẹn`}</span></button>)}</div>
        <div className="max-h-[62vh] min-h-80 overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: `52px repeat(${dates.length}, minmax(0, 1fr))`, height: 660 }}>
            <div className="relative">{Array.from({ length: 12 }, (_, index) => <span key={index} className="absolute right-2 text-[10px] tabular-nums text-slate-400" style={{ top: index * 55 + 2 }}>{String(index + 9).padStart(2, "0")}:00</span>)}</div>
            {dates.map((date) => <div key={date} className={`relative border-l border-slate-200 ${isSupportSunday(date) || busyDates.has(date) ? "bg-slate-50" : "bg-white"}`}>
              {Array.from({ length: 24 }, (_, index) => <div key={index} className={`pointer-events-none absolute inset-x-0 border-t ${index % 2 === 0 ? "border-slate-100" : "border-dashed border-slate-100/80"}`} style={{ top: index * 27.5 }} />)}
              <div className="pointer-events-none absolute inset-x-0 bg-slate-100/60" style={{ top: 165, height: 82.5 }}><span className="px-1 text-[9px] text-slate-400">Nghỉ trưa</span></div>
              {layoutCalendarEvents(bookingsByDate.get(date) ?? []).map(({ booking, start, end, lane, lanes }) => <button type="button" key={booking.id} title={`${booking.customerName} · ${booking.appointmentTime}–${timeLabel(booking.endsAt)} · ${topicLabel(booking.topic)}`} onClick={() => setSelectedBooking(booking)} className={`absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-4 transition hover:brightness-95 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-blue-500 ${statusColors[calendarStatus(booking, effectiveNow)]}`} style={{ top: Math.max(0, start - 540) / 60 * 55 + 1, height: Math.max(23, (Math.min(1260, end) - Math.max(540, start)) / 60 * 55 - 2), left: `calc(${lane / lanes * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}><span className="block truncate font-semibold">{booking.appointmentTime} · {booking.customerName}</span>{booking.durationMinutes >= 60 ? <span className="block truncate opacity-80">{topicLabel(booking.topic)}</span> : null}{booking.durationMinutes >= 90 ? <span className="block truncate opacity-80">{booking.durationMinutes} phút</span> : null}</button>)}
            </div>)}
          </div>
        </div>
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2 text-xs text-slate-500"><span>Nhận lịch trước {SUPPORT_MIN_LEAD_DAYS} ngày · Nghỉ Chủ nhật · Bấm số ngày để đóng/mở lịch</span>{display ? <span>Cập nhật lúc {timeLabel(display.now)}</span> : null}</div>

    <AdminDialog open={Boolean(selectedBooking)} onClose={() => setSelectedBooking(null)} title={selectedBooking?.customerName || "Chi tiết buổi hẹn"} description={selectedBooking ? `${dateLabel(selectedBooking.appointmentDate, true)} · ${selectedBooking.appointmentTime}–${timeLabel(selectedBooking.endsAt)} · GMT+7` : undefined}>
      {selectedBooking ? <div className="space-y-5">
        <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[calendarStatus(selectedBooking, effectiveNow)]}`}>{calendarStatusLabels[calendarStatus(selectedBooking, effectiveNow)]}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{selectedBooking.bookingType === "consultation" ? "Tư vấn 1:1" : "Hỗ trợ học viên"}</span></div>
        <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Chủ đề</dt><dd className="mt-1 font-semibold text-slate-900">{topicLabel(selectedBooking.topic)}</dd></div><div><dt className="text-xs text-slate-500">Thời lượng</dt><dd className="mt-1 flex items-center gap-1.5 font-medium"><Clock3 className="size-4 text-slate-400" />{selectedBooking.durationMinutes} phút</dd></div><div><dt className="text-xs text-slate-500">Email</dt><dd className="mt-1 break-all"><a className="text-blue-700 hover:underline" href={`mailto:${selectedBooking.email}`}>{selectedBooking.email || "Chưa có"}</a></dd></div><div><dt className="text-xs text-slate-500">Điện thoại</dt><dd className="mt-1"><a className="text-blue-700 hover:underline" href={`tel:${selectedBooking.phone}`}>{selectedBooking.phone || "Chưa có"}</a></dd></div></dl>
        <div><h3 className="text-sm font-semibold text-slate-900">Nội dung cần hỗ trợ</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{selectedBooking.note || "Khách chưa ghi nội dung bổ sung."}</p></div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4"><div><p className="text-xs text-slate-500">Mã đơn: <span className="font-medium text-slate-700">{selectedBooking.orderCode || "Chưa có mã đơn"}</span></p><p className="mt-1 text-base font-semibold text-slate-900">{amountLabel(selectedBooking.amount)}</p></div><span className={`inline-flex items-center gap-1.5 text-sm ${selectedBooking.paidAt ? "text-emerald-700" : "text-amber-700"}`}><ShieldCheck className="size-4" />{selectedBooking.paidAt ? "Đã thanh toán" : "Chưa thanh toán"}</span></div>
        {selectedBooking.status === "needs_review" ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Khoản thanh toán cần đối chiếu lại thời điểm giữ chỗ. Buổi này chưa được xác nhận lịch.</p> : null}
        <button type="button" className={buttonClass} onClick={() => { openDay(selectedBooking.appointmentDate); setSelectedBooking(null); }}>Xem lịch và ngày bận hôm nay</button>
      </div> : null}
    </AdminDialog>
    <AdminDialog open={Boolean(selectedDate) && !selectedBooking} onClose={() => { if (!pending) setSelectedDate(""); }} title={selectedDate ? dateLabel(selectedDate, true) : "Chi tiết ngày"} description="Các buổi đã đăng ký và trạng thái nhận lịch của ngày này.">
      <div className="space-y-5">
        <div className="space-y-2"><h3 className="text-sm font-semibold text-slate-900">{dayBookings.length} buổi đã đăng ký</h3>{dayBookings.length ? dayBookings.map((booking) => <BookingButton key={booking.id} booking={booking} now={effectiveNow} onClick={() => setSelectedBooking(booking)} />) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có buổi hẹn trong ngày này.</p>}</div>
        <div className="space-y-3 border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-900">Ngày bận</h3><p className="text-sm text-slate-500">Đánh dấu bận sẽ ngừng nhận lịch mới. Các buổi đã đăng ký vẫn được giữ nguyên.</p>
          {dayCanChange ? <><label className="block text-sm text-slate-700">Ghi chú ngày bận<textarea rows={3} maxLength={500} className={`${inputClass} mt-1.5 block w-full py-2`} value={busyNote} onChange={(event) => setBusyNote(event.target.value)} placeholder="Ví dụ: đi công tác, lịch làm việc riêng…" disabled={pending} /></label><div className="flex flex-wrap gap-2"><button type="button" className={`${buttonClass} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`} disabled={pending} onClick={() => updateBusyDate(true)}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}{busyDates.has(selectedDate) ? "Lưu ghi chú ngày bận" : "Đánh dấu ngày bận"}</button>{busyDates.has(selectedDate) ? <button type="button" className={buttonClass} disabled={pending} onClick={() => updateBusyDate(false)}>Mở lại ngày</button> : null}</div></> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{isSupportSunday(selectedDate) ? "Chủ nhật nghỉ, không mở nhận lịch." : display ? `Chỉ thay đổi ngày bận trong khoảng ${dateLabel(display.minDate)} – ${dateLabel(display.maxDate)}.` : "Tải lại lịch để quản lý ngày bận."}</p>}
          {message ? <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{message}</p> : null}
        </div>
        <button type="button" className={buttonClass} disabled={pending} onClick={() => { setAnchor(selectedDate); setView("day"); setSelectedDate(""); }}>Mở chế độ xem ngày</button>
      </div>
    </AdminDialog>
  </section>;
}
