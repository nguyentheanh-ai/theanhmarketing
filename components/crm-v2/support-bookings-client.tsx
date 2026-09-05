"use client";

import { CalendarDays, Clock3, Loader2 } from "lucide-react";
import { useState } from "react";
import { SUPPORT_MIN_LEAD_DAYS } from "@/lib/support-booking/constants";
import { isSupportSunday } from "@/lib/support-booking/domain";
import type { SupportBookingAdminRow } from "@/services/supportBookingService";

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" })
    .format(new Date(`${date}T00:00:00Z`));
}

function amountLabel(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

export function SupportBookingsClient({ bookings, busyDates: initialBusyDates, today }: { bookings: SupportBookingAdminRow[]; busyDates: string[]; today: string }) {
  const [busyDates, setBusyDates] = useState(new Set(initialBusyDates));
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const dates = Array.from({ length: 31 }, (_, index) => addDays(today, index));

  async function toggle(date: string, busy: boolean) {
    setPending(date);
    setMessage("");
    const response = await fetch("/api/admin/crm-v2/support-bookings/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, busy }),
    });
    const payload = await response.json();
    if (response.ok && payload.ok) {
      setBusyDates((current) => {
        const next = new Set(current);
        busy ? next.add(date) : next.delete(date);
        return next;
      });
      setMessage(busy ? "Đã đánh dấu ngày bận." : "Đã mở lại ngày.");
    } else {
      setMessage(payload.message || "Không cập nhật được ngày bận.");
    }
    setPending("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><CalendarDays className="size-5 text-blue-600" /><div><h2 className="font-black">Ngày bận</h2><p className="text-sm font-semibold text-slate-500">Nhận lịch từ {SUPPORT_MIN_LEAD_DAYS} ngày tới, nghỉ Chủ nhật. Bấm các ngày còn lại để bật hoặc tắt trạng thái bận.</p></div></div>
        <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-10">
          {dates.map((date, index) => {
            const sunday = isSupportSunday(date);
            const fixed = index < SUPPORT_MIN_LEAD_DAYS || sunday;
            const busy = fixed || busyDates.has(date);
            return <button className={`min-h-16 rounded-xl border p-2 text-xs font-black ${busy ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`} disabled={fixed || pending === date} key={date} onClick={() => toggle(date, !busy)} type="button">{pending === date ? <Loader2 className="mx-auto size-4 animate-spin" /> : <><span className="block">{dateLabel(date)}</span><span className="mt-1 block">{sunday ? "Nghỉ" : index < SUPPORT_MIN_LEAD_DAYS ? "Chưa mở" : busy ? "Bận" : "Còn lịch"}</span></>}</button>;
          })}
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-slate-600">{message}</p> : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h2 className="font-black">Lịch đã thanh toán</h2><p className="mt-1 text-sm font-semibold text-slate-500">Chỉ hiển thị các buổi đã được SePay xác nhận thanh toán đầy đủ.</p></div>
        <div className="divide-y divide-slate-100">
          {bookings.length ? bookings.map((booking) => (
            <article className="grid gap-4 p-5 lg:grid-cols-[180px_1fr_220px]" key={booking.id}>
              <div><p className="flex items-center gap-2 font-black text-blue-700"><Clock3 className="size-4" />{dateLabel(booking.appointmentDate)} · {booking.appointmentTime}</p><p className="mt-2 text-sm font-black text-emerald-700">Đã thanh toán · {amountLabel(booking.amount)}</p><p className="mt-1 text-xs font-semibold text-slate-400">{booking.orderCode}</p></div>
              <div><p className="font-black">{booking.customerName}</p><p className="mt-1 text-sm font-semibold text-slate-500">{booking.phone} · {booking.email}</p><p className="mt-4 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Nội dung cần hỗ trợ</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{booking.note}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Chủ đề</p><p className="mt-2 font-black text-slate-800">{booking.topic}</p><p className="mt-4 text-xs font-semibold text-slate-500">{booking.durationMinutes} phút · GMT+7</p><p className="mt-1 text-xs font-semibold text-slate-500">{booking.bookingType === "consultation" ? "Tư vấn" : "Hỗ trợ học viên"}</p></div>
            </article>
          )) : <p className="p-8 text-center text-sm font-semibold text-slate-500">Chưa có lịch đã thanh toán.</p>}
        </div>
      </section>
    </div>
  );
}
