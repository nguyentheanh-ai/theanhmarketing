"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, GraduationCap, Loader2, Megaphone, Palette, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SUPPORT_MIN_LEAD_DAYS, SUPPORT_MAX_LEAD_DAYS, SUPPORT_MAX_DURATION_MINUTES, SUPPORT_BOOKING_PLANS, SUPPORT_TOPICS } from "@/lib/support-booking/constants";
import { getSupportBookingQuote, isSupportSlotAvailable, isSupportSunday } from "@/lib/support-booking/domain";
import type { EligibleSupportCustomer, SupportAvailabilityDay } from "@/services/supportBookingService";

type Props = {
  today: string;
  bookableDays: SupportAvailabilityDay[];
  customer: EligibleSupportCustomer | null;
  isAuthenticated?: boolean;
};

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", ...options }).format(new Date(`${value}T00:00:00Z`));
}

const amountLabel = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
const stepLabels = ["Bắt đầu", "Nhu cầu", "Thông tin", "Chọn lịch", "Thanh toán"];
const topicIcons = [Sparkles, Megaphone, Palette, Bot];
const topicDescriptions = ["Ứng dụng AI vào công việc marketing", "Thiết lập và tối ưu quảng cáo", "Ý tưởng, nội dung và hình ảnh", "Xây dựng trợ lý và tự động hóa"];
const inputClass = "min-h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const primaryClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";

export function SupportBookingForm({ today, bookableDays, customer, isAuthenticated = Boolean(customer) }: Props) {
  const bookingType = customer ? "student" : "consultation";
  const plan = SUPPORT_BOOKING_PLANS[bookingType];
  const [step, setStep] = useState(isAuthenticated ? 2 : 1);
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState(customer?.customerName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [durationMinutes, setDurationMinutes] = useState<number>(plan.baseMinutes);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [days, setDays] = useState(bookableDays);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => {
    if (previousStep.current !== step) {
      headingRef.current?.focus();
      previousStep.current = step;
    }
  }, [step]);
  const quote = getSupportBookingQuote(bookingType, durationMinutes);
  const durations = Array.from({ length: (SUPPORT_MAX_DURATION_MINUTES - plan.baseMinutes) / 30 + 1 }, (_, index) => plan.baseMinutes + index * 30);
  const availabilityByDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const minDate = addDays(today, SUPPORT_MIN_LEAD_DAYS);
  const maxDate = addDays(today, SUPPORT_MAX_LEAD_DAYS);
  const months = [...new Set([minDate.slice(0, 7), maxDate.slice(0, 7)])];
  const [month, setMonth] = useState(minDate.slice(0, 7));
  const firstOfMonth = `${month}-01`;
  const offset = (new Date(`${firstOfMonth}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monthDays = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  const selectedDay = availabilityByDate.get(selectedDate);
  const selectedTopic = SUPPORT_TOPICS.find((item) => item.value === topic);
  const slotAvailable = Boolean(selectedDay && !selectedDay.busy && selectedDate >= minDate && selectedDate <= maxDate && !isSupportSunday(selectedDate) && isSupportSlotAvailable(selectedDay.slots, selectedTime, durationMinutes));
  const visibleSteps = [!isAuthenticated && 1, 2, !customer && 3, 4, 5].filter(Boolean) as number[];
  const title = ["", "Bạn có phải học viên\nThế Anh Marketing không?", "Bạn cần hướng dẫn về gì?", "Thông tin liên hệ của bạn", customer ? "Chọn lịch hẹn" : "Chọn lịch và thời lượng", "Kiểm tra và thanh toán"][step];
  const descriptions = ["", "Chọn bên dưới để bắt đầu đặt lịch cùng Thế Anh.", "Chọn một chủ đề bạn muốn trao đổi trong buổi 1:1.", "Thông tin dùng để xác nhận và liên hệ về lịch hẹn.", customer ? "Chọn ngày và giờ bắt đầu buổi hỗ trợ." : "Chọn thời lượng phù hợp, sau đó chọn ngày và giờ bắt đầu.", "Kiểm tra lịch hẹn trước khi chuyển sang thanh toán."];

  function goTo(next: number) { setError(""); setStep(next); }
  function back() { goTo(visibleSteps[visibleSteps.indexOf(step) - 1]); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (step === 2) {
      if (!topic) { setError("Vui lòng chọn chủ đề cần hướng dẫn."); return; }
      goTo(customer ? 4 : 3);
      return;
    }
    if (step === 3) {
      if (customerName.trim().length < 2) { setError("Vui lòng nhập họ tên đầy đủ."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Email không hợp lệ."); return; }
      if (!/^\d{9,15}$/.test(phone.replace(/\D/g, ""))) { setError("Số điện thoại không hợp lệ."); return; }
      goTo(4);
      return;
    }
    if (step === 4) {
      if (!slotAvailable) { setError("Vui lòng chọn ngày và giờ còn trống."); return; }
      if (!/^\d{9,15}$/.test(phone.replace(/\D/g, ""))) { setError("Vui lòng bổ sung số điện thoại hợp lệ để xác nhận lịch."); return; }
      goTo(5);
      return;
    }
    if (step !== 5 || !topic || !slotAvailable) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/support-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, note, appointmentDate: selectedDate, appointmentTime: selectedTime, durationMinutes, phone,
          ...(!customer ? { customerName, email } : {}),
        }),
      });
      const payload = await response.json();
      if (response.status === 409) {
        setSelectedTime("");
        setStep(4);
        // Refresh occupied intervals without losing the entered contact/topic details.
        try {
          const fresh = await fetch("/api/support-bookings/availability", { cache: "no-store" });
          const availability = await fresh.json();
          if (fresh.ok && availability.ok) setDays(availability.days);
        } catch { /* The reservation API remains authoritative if refresh fails. */ }
      }
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Không tạo được lịch hỗ trợ.");
      window.location.href = payload.checkoutUrl;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được lịch hỗ trợ.");
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_60px_-30px_rgba(15,23,42,0.2)]">
      <nav aria-label="Tiến trình đặt lịch" className="border-b border-slate-100 px-4 py-5 sm:px-8">
        <ol className="flex items-start justify-between gap-1">
          {visibleSteps.map((number, index) => {
            const label = stepLabels[number - 1];
            const complete = number < step;
            return <li key={label} aria-current={step === number ? "step" : undefined} className={`flex min-w-0 flex-1 flex-col items-center gap-2 text-center ${step === number ? "text-blue-700" : "text-slate-500"}`}>
              <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${step === number ? "bg-blue-600 text-white ring-4 ring-blue-50" : complete ? "bg-slate-100 text-slate-500" : "border border-slate-200"}`}>{complete ? <Check aria-hidden="true" className="size-4" /> : index + 1}</span>
              <span className="text-[10px] font-semibold sm:text-xs">{label}<span className="sr-only">{complete ? " — Đã hoàn thành" : ""}</span></span>
            </li>;
          })}
        </ol>
      </nav>
      <form onSubmit={submit} className="p-5 sm:p-8">
        <fieldset disabled={submitting} className="min-w-0">
          <div className="mb-7">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-600">Bước {visibleSteps.indexOf(step) + 1} / {visibleSteps.length}</p>
            <h2 ref={headingRef} tabIndex={-1} className="whitespace-pre-line text-2xl font-bold leading-tight tracking-tight text-slate-950 outline-none sm:text-3xl">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{descriptions[step]}</p>
          </div>

          {step === 1 && <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/dang-nhap?next=%2Fdat-lich-ho-tro" className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-blue-500 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-blue-600">
              <GraduationCap className="mt-1 size-6 shrink-0 text-blue-600" /><span className="flex-1"><strong className="block text-base">Có, tôi là học viên</strong><span className="mt-2 block text-sm leading-6 text-slate-500">Đăng nhập để dùng thông tin và mức phí học viên.</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
            </Link>
            <button type="button" onClick={() => goTo(2)} className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-blue-600">
              <UserRound className="mt-1 size-6 shrink-0 text-blue-600" /><span className="flex-1"><strong className="block text-base">Không, tôi chưa là học viên</strong><span className="mt-2 block text-sm leading-6 text-slate-500">Tiếp tục đặt lịch tư vấn cùng Thế Anh.</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
            </button>
          </div>}

          {step === 2 && <div>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Cần hướng dẫn về</legend>
              {SUPPORT_TOPICS.map((item, index) => {
                const Icon = topicIcons[index];
                return <label key={item.value} className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-blue-400 ${topic === item.value ? "border-blue-600 bg-blue-50/60" : "border-slate-200 hover:border-blue-300"}`}>
                  <input type="radio" name="topic" value={item.value} checked={topic === item.value} onChange={() => { setTopic(item.value); setError(""); }} className="sr-only" required />
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-600" /><span className="flex-1"><strong className="block text-sm">{item.label}</strong><span className="mt-1.5 block text-xs leading-5 text-slate-500">{topicDescriptions[index]}</span></span><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${topic === item.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>{topic === item.value && <Check className="size-3" />}</span>
                </label>;
              })}
            </fieldset>
            {topic && <label className="mt-6 grid gap-2 text-sm font-semibold text-slate-700">Nội dung cần hỗ trợ <span className="text-xs font-normal text-slate-500">Không bắt buộc · Bạn có thể trao đổi thêm trong buổi hẹn.</span><textarea className={`${inputClass} min-h-28 py-3 leading-6`} name="note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Bạn đang gặp khó khăn gì hoặc muốn được hướng dẫn cụ thể điều gì?" /></label>}
          </div>}

          {!customer && step === 3 && <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">Email<input className={inputClass} name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={160} placeholder="Email nhận thông tin lịch hẹn" required /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Số điện thoại<input className={inputClass} name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={9} maxLength={30} placeholder="Số điện thoại liên hệ" required /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Họ và tên<input className={inputClass} name="customerName" autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} minLength={2} maxLength={120} placeholder="Họ và tên của bạn" required /></label>
            </div>
          </div>}

          {step === 4 && <div className="space-y-6">
            {customer ? <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
              <p className="text-sm font-semibold">Hỗ trợ học viên</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{amountLabel(quote.amount)}<span className="text-sm font-medium">/buổi</span></p>
            </div> : <fieldset>
              <legend className="text-sm font-semibold">Thời lượng buổi hẹn <span className="font-normal text-slate-500">· {plan.title}</span></legend>
              <div className={`mt-3 grid grid-cols-2 gap-2 ${durations.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
                {durations.map((minutes) => <label key={minutes} className={`cursor-pointer rounded-2xl border px-3 py-3 text-center focus-within:ring-2 focus-within:ring-blue-400 ${durationMinutes === minutes ? "border-blue-600 bg-blue-50/60" : "border-slate-200 hover:border-blue-300"}`}>
                  <input className="sr-only" type="radio" name="durationMinutes" value={minutes} checked={durationMinutes === minutes} onChange={() => { setDurationMinutes(minutes); setSelectedTime(""); setError(""); }} />
                  <span className="block text-sm font-bold">{minutes} phút</span><span className="mt-1 block text-xs font-semibold text-blue-700">{amountLabel(getSupportBookingQuote(bookingType, minutes).amount)}</span>
                </label>)}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{plan.baseMinutes} phút đầu {amountLabel(plan.basePrice)} · Thêm 30 phút: {amountLabel(plan.extraHalfHourPrice)}</p>
            </fieldset>}
            <div className="grid gap-6 border-t border-slate-100 pt-5 sm:grid-cols-[1.1fr_1fr]">
              <section aria-label="Chọn ngày">
                <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold capitalize"><CalendarDays className="size-4 text-blue-600" />{formatDate(firstOfMonth, { month: "long", year: "numeric" })}</h3><div className="flex gap-1">
                  <button type="button" aria-label="Tháng trước" disabled={month === months[0]} onClick={() => setMonth(months[0])} className="grid size-9 place-items-center rounded-full hover:bg-slate-100 disabled:opacity-25"><ChevronLeft className="size-4" /></button>
                  <button type="button" aria-label="Tháng sau" disabled={month === months.at(-1)} onClick={() => setMonth(months.at(-1)!)} className="grid size-9 place-items-center rounded-full hover:bg-slate-100 disabled:opacity-25"><ChevronRight className="size-4" /></button>
                </div></div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day} className="pb-2 text-[11px] font-semibold text-slate-400">{day}</span>)}
                  {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
                  {Array.from({ length: monthDays }, (_, index) => {
                    const date = addDays(firstOfMonth, index);
                    const day = availabilityByDate.get(date);
                    const sunday = isSupportSunday(date);
                    const locked = date < minDate || date > maxDate || sunday || !day || day.busy || !day.slots.some((slot) => isSupportSlotAvailable(day.slots, slot.time, durationMinutes));
                    return <button key={date} type="button" disabled={locked} aria-pressed={date === selectedDate} aria-label={`${formatDate(date, { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}${sunday ? ", Nghỉ Chủ nhật" : locked ? ", Không còn lịch phù hợp" : ", Còn lịch"}`} onClick={() => { setSelectedDate(date); setSelectedTime(""); setError(""); }} className={`grid min-h-10 place-items-center rounded-xl text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 ${date === selectedDate && !locked ? "bg-blue-600 text-white" : locked ? "cursor-not-allowed text-slate-300" : "bg-slate-50 text-slate-700 hover:bg-blue-100"}`}>{index + 1}</button>;
                  })}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">Vui lòng đặt lịch trước ít nhất {SUPPORT_MIN_LEAD_DAYS} ngày. Nghỉ Chủ nhật.</p>
              </section>
              <section aria-label="Chọn giờ bắt đầu" className="sm:border-l sm:border-slate-100 sm:pl-5">
                <h3 className="flex items-center gap-2 text-sm font-bold"><Clock3 className="size-4 text-blue-600" />Chọn giờ bắt đầu</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{selectedDate ? formatDate(selectedDate, { weekday: "long", day: "numeric", month: "numeric" }) : "Chọn một ngày còn lịch để xem giờ trống."} · Giờ Việt Nam</p>
                {selectedDay && <div className="mt-3 grid grid-cols-3 gap-2">
                  {selectedDay.slots.filter((slot) => !selectedDay.busy && isSupportSlotAvailable(selectedDay.slots, slot.time, durationMinutes)).map((slot) => <button key={slot.time} type="button" aria-pressed={selectedTime === slot.time} onClick={() => { setSelectedTime(slot.time); setError(""); }} className={`min-h-10 rounded-xl border text-xs font-semibold transition ${selectedTime === slot.time ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 hover:border-blue-400 hover:bg-blue-50"}`}>{slot.time}</button>)}
                </div>}
                {selectedDay && (selectedDay.busy || !selectedDay.slots.some((slot) => isSupportSlotAvailable(selectedDay.slots, slot.time, durationMinutes))) && <p className="mt-4 text-sm leading-6 text-slate-500">{customer ? "Ngày này không còn giờ trống. Vui lòng chọn ngày khác." : `Ngày này không còn giờ trống đủ ${durationMinutes} phút. Vui lòng chọn ngày khác.`}</p>}
              </section>
            </div>
            {customer && !customer.phone && <label className="grid gap-2 border-t border-slate-100 pt-5 text-sm font-semibold text-slate-700">Bổ sung số điện thoại<span className="text-xs font-normal text-slate-500">Hồ sơ của bạn chưa có số điện thoại để liên hệ về lịch hẹn.</span><input className={inputClass} name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={9} maxLength={30} required /></label>}
          </div>}

          {step === 5 && <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-500">Buổi 1:1 cùng Thế Anh</p><button type="button" onClick={() => goTo(4)} className="text-xs font-semibold text-blue-600 underline underline-offset-4">Sửa lịch</button></div>
              <p className="mt-3 text-lg font-bold">{selectedTopic?.label}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{formatDate(selectedDate, { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}<br />{selectedTime}{!customer && ` · ${durationMinutes} phút`} · Giờ Việt Nam</p>
              {note && <p className="mt-3 whitespace-pre-wrap break-words border-t border-slate-100 pt-3 text-sm leading-6 text-slate-500">{note}</p>}
              <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-sm text-slate-500">Tổng thanh toán</span><strong className="text-2xl tracking-tight text-blue-700">{amountLabel(quote.amount)}</strong></div>
            </div>
            <div className="flex items-start justify-between gap-3 px-1 text-sm"><div className="min-w-0"><p className="font-semibold">{customer ? customer.customerName : customerName}</p><p className="mt-1 break-all leading-6 text-slate-500">{customer ? customer.email : email}</p><p className="text-slate-500">{phone}</p></div>{!customer && <button type="button" onClick={() => goTo(3)} className="shrink-0 text-xs font-semibold text-blue-600 underline underline-offset-4">Sửa thông tin</button>}</div>
            <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />Lịch hẹn được xác nhận sau khi thanh toán thành công. Bước tiếp theo sẽ hiển thị mã QR và thông tin chuyển khoản.</p>
          </div>}

          {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          {step > 1 && <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            {visibleSteps.indexOf(step) > 0 ? <button type="button" onClick={back} className="inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />Quay lại</button> : <span />}
            <button type="submit" className={primaryClass} disabled={submitting || (step === 2 && !topic) || (step === 4 && !slotAvailable)}>{submitting ? <><Loader2 className="size-4 animate-spin" />Đang giữ lịch...</> : <>{step === 5 ? "Giữ lịch và thanh toán" : "Tiếp tục"}<ArrowRight className="size-4" /></>}</button>
          </div>}
        </fieldset>
      </form>
    </div>
  );
}
