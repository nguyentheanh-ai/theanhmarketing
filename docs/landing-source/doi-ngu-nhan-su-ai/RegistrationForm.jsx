import { startCheckoutCountdown } from "./checkout-countdown.js";
import { CheckoutTransition } from "./checkout-transition.jsx";
import { useEffect, useRef, useState } from "react";
import { buildOrderPayload, createLeadId, getClientAttribution, markInitiateCheckoutDispatched, trackMarketingEvent, trackOnce } from "../checkout.js";

export default function RegistrationForm({ product }) {
  const [countdown, setCountdown] = useState(null);
  const locked = useRef(false);
  const transitionRef = useRef(null);
  useEffect(() => () => transitionRef.current?.cancel(), []);
  const [couponCode, setCouponCode] = useState("");
  const normalizedCoupon = couponCode.trim().toUpperCase();
  const couponApplied = normalizedCoupon === "HOCVIEN20";
  const payNow = couponApplied ? Math.round(product.payNowVnd * 0.8) : product.payNowVnd;
  const [message, setMessage] = useState("");
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const form = document.querySelector("#purchase-form");
    if (!form) return undefined;
    const onFocus = () => trackOnce("form_start", { event_id: "agent-kit-form-start", content_name: "Doi Ngu Nhan Su AI" });
    form.addEventListener("focusin", onFocus);
    return () => form.removeEventListener("focusin", onFocus);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (locked.current) return;
    if (normalizedCoupon && !couponApplied) { setMessage("Mã giảm giá không hợp lệ. Vui lòng kiểm tra hoặc xóa mã để tiếp tục."); return; }
    setMessage("");
    locked.current = true;
    setIsSubmitting(true);
    const transition = startCheckoutCountdown(setCountdown);
    transitionRef.current = transition;

    const formData = new FormData(event.currentTarget);
    let attribution = {};
    try { attribution = getClientAttribution(); } catch { /* Optional attribution cannot block checkout. */ }
    const leadId = createLeadId();
    const payload = buildOrderPayload({ formData, attribution, needsInvoice, leadId, paymentPlan: product.paymentPlan });

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, couponCode: normalizedCoupon }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.order?.orderCode) {
        throw new Error(result.message || "Chưa tạo được đơn thanh toán.");
      }
      try {
      trackMarketingEvent("Lead", {
        event_id: result.order.orderCode,
        content_name: "Doi Ngu Nhan Su AI",
        content_type: "product",
        value: payNow,
        currency: "VND",
        ...attribution,
      });
      trackMarketingEvent("InitiateCheckout", {
        event_id: result.order.orderCode,
        order_id: result.order.orderCode,
        content_name: "Doi Ngu Nhan Su AI",
        content_type: "product",
        value: payNow,
        currency: "VND",
        ...attribution,
      });
      markInitiateCheckoutDispatched(result.order.orderCode);
      } catch { /* Optional analytics cannot block checkout. */ }
      if (!(await transition.done) || transition.cancelled) return;
      window.location.assign(`/thanh-toan/${encodeURIComponent(result.order.orderCode)}`);
    } catch (error) {
      transition.cancel();
      setCountdown(null);
      locked.current = false;
      try { trackMarketingEvent("form_error", { event_id: leadId, content_name: "Doi Ngu Nhan Su AI" }); } catch { /* Restore form even when analytics fail. */ }
      setMessage(error instanceof Error ? error.message : "Chưa tạo được đơn thanh toán.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <CheckoutTransition seconds={countdown} />
    <form id="purchase-form" className="registration-form" onSubmit={submit} aria-labelledby="registration-title" data-reveal>
      <header><img src="/doi-ngu-nhan-su-ai/brand/ta-mark.svg" alt="Logo The Anh Marketing" /><div><span>The Anh Marketing</span><strong>{product.name}</strong></div></header>
      <h2 id="registration-title">Thông tin nhận bộ AI</h2>
      <p className="form-intro">Nhập email để nhận hướng dẫn truy cập sau thanh toán.</p>
      <div className="form-grid">
        <label>Họ và tên<input name="studentName" autoComplete="name" required /></label>
        <label>Số điện thoại/Zalo<input name="phone" type="tel" autoComplete="tel" required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      </div>

      <div className="form-grid"><label>Mã giảm giá (nếu có)<input name="couponCode" autoComplete="off" maxLength={40} value={couponCode} disabled={isSubmitting} onChange={event => { setCouponCode(event.target.value); setMessage(""); }} aria-describedby="kit-coupon-status" /></label></div>
      <p id="kit-coupon-status" role="status">{couponApplied ? "Đã áp dụng mã giảm 20% · Tiết kiệm 198.000đ · Còn 792.000đ" : normalizedCoupon ? "Mã giảm giá không hợp lệ." : "Nhập mã ưu đãi của anh/chị."}</p>
      <p className="form-consent">Bằng việc tiếp tục, anh/chị xác nhận đã đọc và đồng ý với <a href="/dieu-khoan-mua-hang">Điều khoản mua hàng</a>, <a href="/chinh-sach-bao-mat">Chính sách bảo mật</a> và <a href="/chinh-sach-giao-nhan-san-pham-so">chính sách giao nhận sản phẩm số</a>.</p>

      <label className="invoice-toggle">
        <input name="needsInvoice" type="checkbox" checked={needsInvoice} onChange={(event) => setNeedsInvoice(event.target.checked)} />
        <span>Mình cần xuất hóa đơn</span>
      </label>

      {needsInvoice && (
        <div className="invoice-fields">
          <label>Mã số thuế<input name="taxCode" required /></label>
          <label>Tên doanh nghiệp<input name="companyName" required /></label>
          <label>Địa chỉ doanh nghiệp<input name="companyAddress" required /></label>
          <label>Email nhận hóa đơn<input name="invoiceEmail" type="email" autoComplete="email" required /></label>
        </div>
      )}

      {message && <p className="form-message" role="alert">{message}</p>}
      <button className="button button-dark" type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang tạo mã thanh toán..." : couponApplied ? "Tiếp tục thanh toán · 792.000đ" : product.purchaseCta}</button>
    </form>
    </>
  );
}
