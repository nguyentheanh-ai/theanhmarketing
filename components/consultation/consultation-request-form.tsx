"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { marketingAiServices } from "@/data/services";
import { CONSULTATION_POLICY } from "@/lib/consultation/constants";

export function ConsultationRequestForm({ initialService = "" }: { initialService?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: String(form.get("service") || ""),
        studentName: String(form.get("studentName") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
        note: String(form.get("note") || ""),
        pageUrl: window.location.href,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setMessage(result.message || "Không tạo được yêu cầu tư vấn.");
      setIsSubmitting(false);
      return;
    }
    router.push(result.paymentUrl);
  }

  return (
    <form className="tam-card grid gap-5 p-6 sm:p-8" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Dịch vụ
        <select className="min-h-12 rounded-2xl border border-[var(--tam-line)] bg-white px-4" defaultValue={initialService} name="service" required>
          <option value="">Chọn dịch vụ cần tư vấn</option>
          {marketingAiServices.map((service) => <option value={service.id} key={service.id}>{service.title}</option>)}
        </select>
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Họ tên<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" name="studentName" required /></label>
        <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Số điện thoại<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" name="phone" required /></label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Email<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" name="email" required type="email" /></label>
      <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Nhu cầu cần tư vấn<textarea className="min-h-36 rounded-2xl border border-[var(--tam-line)] p-4" minLength={10} name="note" required /></label>
      <p className="rounded-2xl bg-[#eef8ff] p-4 text-sm font-semibold leading-6 text-[var(--tam-muted)]">{CONSULTATION_POLICY}</p>
      {message ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</p> : null}
      <Button isLoading={isSubmitting} loadingLabel="Đang tạo đơn..." type="submit">Thanh toán 500.000đ để gửi yêu cầu</Button>
    </form>
  );
}
