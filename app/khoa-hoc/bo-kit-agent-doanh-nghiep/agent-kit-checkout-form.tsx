"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const COURSE_SLUG = "bo-agent-kit-x10-hieu-suat-cong-viec";
const PAYMENT_PLAN = "agent-kit-ads-359";

function getCookieValue(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  return (
    document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? ""
  );
}

export function AgentKitCheckoutForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      studentName: String(formData.get("studentName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      courseSlug: COURSE_SLUG,
      paymentPlan: PAYMENT_PLAN,
      landingPage: "khoa-hoc/bo-kit-agent-doanh-nghiep",
      pageUrl: window.location.href,
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get("utm_source") || "",
      utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || "",
      utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
      utmContent: new URLSearchParams(window.location.search).get("utm_content") || "",
      utmTerm: new URLSearchParams(window.location.search).get("utm_term") || "",
      fbp: decodeURIComponent(getCookieValue("_fbp")),
      fbc: decodeURIComponent(getCookieValue("_fbc")),
    };

    if (!payload.studentName || !payload.email || !payload.phone) {
      setMessage("Bạn nhập đủ họ tên, email và số điện thoại/Zalo để tạo mã thanh toán.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        order?: { orderCode?: string };
      };

      if (!response.ok || !result.ok || !result.order?.orderCode) {
        throw new Error(result.message || "Chưa tạo được đơn thanh toán.");
      }

      router.push(`/thanh-toan/${encodeURIComponent(result.order.orderCode)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa tạo được đơn thanh toán.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      id="dang-ky"
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/70 bg-white/80 p-5 text-slate-900 shadow-[0_24px_80px_rgba(0,97,255,0.16)] backdrop-blur-2xl sm:p-7"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Thanh toán SePay</p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Đăng ký bản quyền bộ kit</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Điền form, tạo mã đơn, chuyển sang trang QR SePay và tự xác nhận khi giao dịch khớp mã.
      </p>

      <div className="mt-5 rounded-3xl border border-slate-900/10 bg-slate-50/90 p-4">
        <p className="text-sm font-bold text-slate-500">Giá hiện tại</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <strong className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-5xl font-black tracking-[-0.06em] text-transparent">
            359K
          </strong>
          <span className="pb-2 text-sm font-bold text-slate-400 line-through">799K</span>
        </div>
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">Private ads cho landing AI Agent Business.</p>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Họ và tên
          <input
            name="studentName"
            required
            className="min-h-12 rounded-2xl border border-slate-900/10 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
            placeholder="Ví dụ: Nguyễn Minh An"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Email nhận thông tin
          <input
            name="email"
            type="email"
            required
            className="min-h-12 rounded-2xl border border-slate-900/10 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
            placeholder="email@example.com"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Số điện thoại/Zalo
          <input
            name="phone"
            required
            className="min-h-12 rounded-2xl border border-slate-900/10 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500"
            placeholder="Số điện thoại đang dùng"
          />
        </label>
      </div>

      {message ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 min-h-13 w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 px-6 text-base font-black text-white shadow-[0_14px_34px_rgba(0,97,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang tạo mã thanh toán..." : "Thanh toán 359K ngay"}
      </button>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Sau khi thanh toán thành công, hệ thống chuyển sang trang QR và hướng dẫn truy cập sẽ được gửi theo thông tin bạn đã nhập.
      </p>
    </form>
  );
}
