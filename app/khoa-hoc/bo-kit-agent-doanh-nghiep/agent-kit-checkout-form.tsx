"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getClientAttribution } from "@/lib/tracking/client-attribution";
import { trackMarketingEvent } from "@/lib/tracking/events";
import { InvoiceRequestFields } from "@/components/payment/invoice-request-fields";
import { invoiceInputFromFormData } from "@/lib/orders/invoice";

const COURSE_SLUG = "bo-agent-kit-x10-hieu-suat-cong-viec";
const PAYMENT_PLAN = "agent-kit-preorder-deposit-399";

export function AgentKitCheckoutForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const attribution = getClientAttribution();
    const payload = {
      studentName: String(formData.get("studentName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      courseSlug: COURSE_SLUG,
      paymentPlan: PAYMENT_PLAN,
      landingPage: "academy/bo-kit-agent-doanh-nghiep",
      pageUrl: window.location.href,
      referrer: document.referrer,
      ...attribution,
      invoice: invoiceInputFromFormData(formData),
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
        leadId?: string | null;
        order?: { orderCode?: string };
      };

      if (!response.ok || !result.ok || !result.order?.orderCode) {
        throw new Error(result.message || "Chưa tạo được đơn thanh toán.");
      }

      trackMarketingEvent("Lead", {
        event_id: result.leadId || result.order.orderCode,
        content_name: "Bo Agent Kit X10 Hieu Suat Cong Viec",
        content_type: "product",
        value: 399000,
        currency: "VND",
        ...attribution,
      });
      trackMarketingEvent("InitiateCheckout", {
        event_id: result.order.orderCode,
        order_id: result.order.orderCode,
        content_name: "Bo Agent Kit X10 Hieu Suat Cong Viec",
        content_type: "product",
        value: 399000,
        currency: "VND",
        ...attribution,
      });

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
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Thanh toán chuyển khoản</p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">Đặt cọc preorder Đội ngũ nhân sự AI</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Điền thông tin để tạo đơn cọc 399.000đ trước ngày mở bán. Tổng giá preorder là 799.000đ; phần còn lại là 400.000đ khi mở bán.
      </p>

      <div className="mt-5 rounded-3xl border border-slate-900/10 bg-slate-50/90 p-4">
        <p className="text-sm font-bold text-slate-500">Giá hiện tại</p>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <strong className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-5xl font-black tracking-[-0.06em] text-transparent">
            399.000đ
          </strong>
          <span className="pb-2 text-sm font-bold text-slate-400 line-through">999.000đ</span>
        </div>
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">Cọc trước ngày mở bán, được tính vào tổng giá preorder.</p>
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
        {isSubmitting ? "Đang tạo mã thanh toán..." : "Đặt cọc preorder 399.000đ"}
      </button>

      <div className="mt-3"><InvoiceRequestFields variant="light" /></div>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Sau khi cọc được xác nhận, anh/chị sẽ nhận thông báo khi sản phẩm mở bán để thanh toán 400.000đ còn lại.
      </p>
    </form>
  );
}
