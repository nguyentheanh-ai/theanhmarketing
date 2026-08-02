import type { PaymentOrder } from "@/services/orderService";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function sendConsultationPaymentEmail(order: PaymentOrder) {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey) return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };

  const subject = `Đã nhận phí tư vấn Marketing & AI - ${order.orderCode}`;
  const text = `Chào ${order.studentName},\n\nThe Anh Marketing đã nhận thanh toán 500.000đ cho yêu cầu tư vấn. The Anh sẽ chủ động liên hệ qua thông tin bạn đã đăng ký để sắp xếp buổi tư vấn.\n\nMã đơn: ${order.orderCode}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a"><h1>Đã nhận yêu cầu tư vấn</h1><p>Chào ${escapeHtml(order.studentName)},</p><p>The Anh Marketing đã nhận thanh toán <strong>500.000đ</strong>. The Anh sẽ chủ động liên hệ qua thông tin bạn đã đăng ký để sắp xếp buổi tư vấn.</p><p>Mã đơn: <strong>${escapeHtml(order.orderCode)}</strong></p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `consultation-paid-${order.orderCode}` },
      body: JSON.stringify({ from: process.env.PAYMENT_SUCCESS_EMAIL_FROM?.trim() || "The Anh Marketing <noreply@theanhmarketing.com>", to: order.email, subject, html, text }),
    });
    if (!response.ok) return { ok: false, skipped: false, reason: (await response.text()) || response.statusText };
    return { ok: true, skipped: false, reason: null };
  } catch (error) {
    return { ok: false, skipped: false, reason: error instanceof Error ? error.message : "Could not send consultation email." };
  }
}
