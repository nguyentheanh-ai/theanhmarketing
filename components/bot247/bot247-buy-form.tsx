"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function Bot247BuyForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams(window.location.search);
    const response = await fetch("/api/bot247", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName: String(form.get("studentName") || ""),
        email: String(form.get("email") || ""),
        phone: String(form.get("phone") || ""),
        pageUrl: window.location.href,
        utmSource: params.get("utm_source") || "",
      }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok || !result.ok) {
      setMessage(result.message || "Chưa tạo được đơn. Anh/chị thử lại sau giây lát.");
      setIsSubmitting(false);
      return;
    }
    router.push(result.paymentUrl);
  }

  return (
    <form id="mua" className="tam-card grid gap-5 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-bold text-[var(--tam-muted)]">Bản quyền trọn đời</p>
        <p className="mt-1 text-4xl font-black tracking-[-0.04em] text-[var(--tam-ink)]">990.000đ</p>
        <p className="mt-1 text-sm font-semibold text-[var(--tam-muted)]">Thanh toán một lần · không phí hằng tháng</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Họ tên<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" name="studentName" required autoComplete="name" /></label>
        <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Số điện thoại<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" name="phone" required autoComplete="tel" /></label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-[var(--tam-ink)]">Email nhận mã kích hoạt<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" name="email" required type="email" autoComplete="email" /></label>
      <p className="rounded-2xl bg-[#eef8ff] p-4 text-sm font-semibold leading-6 text-[var(--tam-muted)]">Quét QR chuyển khoản. Tiền về là hệ thống tự gửi mã kích hoạt qua email này.</p>
      {message ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{message}</p> : null}
      <Button isLoading={isSubmitting} loadingLabel="Đang tạo đơn..." type="submit">Thanh toán 990.000đ</Button>
    </form>
  );
}
