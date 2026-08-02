"use client";

import { CalendarDays, Check, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { SUPPORT_TOPICS } from "@/lib/support-booking/constants";
import type { EligibleSupportCustomer, SupportAvailabilityDay } from "@/services/supportBookingService";

type Props = {
  today: string;
  bookableDays: SupportAvailabilityDay[];
  customer: EligibleSupportCustomer;
};

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", ...options }).format(new Date(`${value}T00:00:00Z`));
}

export function SupportBookingForm({ today, bookableDays, customer }: Props) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const availabilityByDate = useMemo(() => new Map(bookableDays.map((day) => [day.date, day])), [bookableDays]);
  const displayDates = useMemo(() => Array.from({ length: 31 }, (_, index) => addDays(today, index)), [today]);
  const selectedDay = availabilityByDate.get(selectedDate);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedDate || !selectedTime) {
      setError("Vui lòng chọn ngày và giờ hỗ trợ.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/support-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.get("topic"),
          note: form.get("note"),
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Không tạo được lịch hỗ trợ.");
      window.location.href = payload.checkoutUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được lịch hỗ trợ.");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      {customer.previewMode ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-[0_16px_44px_rgba(217,119,6,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Chế độ xem thử của quản trị viên</p>
          <p className="mt-2 text-sm font-bold leading-6">Xem trang này không tạo dữ liệu. Nếu bấm “Giữ lịch và thanh toán”, hệ thống sẽ tạo một đơn chờ thanh toán 500.000đ thật như luồng của khách hàng.</p>
        </section>
      ) : null}
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><CalendarDays className="size-5" /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Bước 1</p><h2 className="text-xl font-black text-slate-950">Chọn ngày</h2></div>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {displayDates.map((date, index) => {
            const day = availabilityByDate.get(date);
            const locked = index < 7 || !day || day.busy || !day.slots.some((slot) => slot.available);
            const selected = date === selectedDate;
            return (
              <button
                aria-pressed={selected}
                className={`min-h-20 rounded-2xl border px-2 py-3 text-center transition ${selected ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : locked ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50"}`}
                disabled={locked}
                key={date}
                onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                type="button"
              >
                <span className="block text-[10px] font-black uppercase">{formatDate(date, { weekday: "short" })}</span>
                <span className="mt-1 block text-lg font-black">{Number(date.slice(-2))}</span>
                <span className="block text-[10px] font-bold">{locked ? "Bận" : "Còn lịch"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">7 ngày gần nhất luôn hiển thị bận để có đủ thời gian chuẩn bị nội dung hỗ trợ.</p>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Clock3 className="size-5" /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Bước 2</p><h2 className="text-xl font-black text-slate-950">Chọn giờ</h2></div>
        </div>
        {selectedDay ? (
          <>
            <p className="mt-5 text-sm font-bold text-slate-600">Ngày đã chọn: <span className="text-blue-600">{formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {selectedDay.slots.map((slot) => (
                <button
                  className={`min-h-12 rounded-xl border text-sm font-black transition ${selectedTime === slot.time ? "border-blue-600 bg-blue-600 text-white" : slot.available ? "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50" : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"}`}
                  disabled={!slot.available}
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  type="button"
                >{slot.time}</button>
              ))}
            </div>
          </>
        ) : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Chọn một ngày còn lịch để xem các khung giờ 30 phút.</p>}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Check className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Bước 3</p><h2 className="text-xl font-black text-slate-950">Thông tin hỗ trợ</h2></div></div>
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Thông tin học viên đã xác thực</p>
          <p className="mt-2 text-lg font-black text-slate-950">{customer.customerName}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{customer.email} · {customer.phone}</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700">Chủ đề hỗ trợ<select className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-blue-500" defaultValue="kiem-tra-quang-cao" name="topic">{SUPPORT_TOPICS.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Nội dung cần hỗ trợ<textarea className="min-h-32 rounded-2xl border border-slate-200 p-4 leading-6 outline-none focus:border-blue-500" minLength={10} name="note" placeholder="Ví dụ: kiểm tra cấu trúc chiến dịch, lên một mẫu quảng cáo, tư vấn hệ thống bán hàng..." required /></label>
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">Buổi hỗ trợ 1:1 · 30 phút</p><p className="mt-1 text-2xl font-black">500.000đ</p><p className="mt-1 text-xs text-white/55">Chỉ ghi nhận lịch sau khi SePay xác nhận thanh toán.</p></div>
          <button className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-blue-500 px-7 text-sm font-black text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting || !selectedDate || !selectedTime} type="submit">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{submitting ? "Đang giữ lịch..." : "Giữ lịch và thanh toán"}
          </button>
        </div>
      </section>
    </form>
  );
}
