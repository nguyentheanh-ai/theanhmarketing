import type { PaymentOrder } from "@/services/orderService";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Paid Bot 24/7 order → email the activation code (idempotent per order). */
export async function sendBot247LicenseEmail(order: PaymentOrder, activationCode: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  if (!apiKey) return { ok: true, skipped: true, reason: "Missing RESEND_API_KEY" };
  const subject = `Mã kích hoạt Bot 24/7 của bạn - ${order.orderCode}`;
  const steps = ["Tải bộ cài Bot 24/7 theo hướng dẫn The Anh Marketing gửi kèm.", "Mở ứng dụng, nhập mã kích hoạt ở bước đầu tiên.", "Làm theo trình thiết lập: hồ sơ doanh nghiệp, nối kênh, giọng thương hiệu."];
  const text = `Chào ${order.studentName},\n\nThe Anh Marketing đã nhận thanh toán ${order.amount.toLocaleString("vi-VN")}đ cho Bot 24/7 (bản quyền trọn đời).\n\nMã kích hoạt: ${activationCode}\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nCần hỗ trợ cài đặt, anh/chị trả lời email này hoặc nhắn fanpage The Anh Marketing.\n\nMã đơn: ${order.orderCode}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#0f172a"><h1>Mã kích hoạt Bot 24/7</h1><p>Chào ${escapeHtml(order.studentName)},</p><p>The Anh Marketing đã nhận thanh toán <b>${order.amount.toLocaleString("vi-VN")}đ</b> cho <b>Bot 24/7 · bản quyền trọn đời</b>.</p><p style="font-size:22px;font-weight:800;letter-spacing:2px;padding:14px 18px;background:#f1f5f9;border-radius:10px;display:inline-block">${escapeHtml(activationCode)}</p><ol>${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol><p>Cần hỗ trợ cài đặt, anh/chị trả lời email này hoặc nhắn fanpage The Anh Marketing.</p><p style="color:#64748b">Mã đơn: ${escapeHtml(order.orderCode)}</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `bot247-paid-${order.orderCode}` },
      body: JSON.stringify({ from: process.env.PAYMENT_SUCCESS_EMAIL_FROM?.trim() || "The Anh Marketing <noreply@theanhmarketing.com>", to: order.email, subject, html, text }),
    });
    if (!response.ok) return { ok: false, skipped: false, reason: (await response.text()) || response.statusText };
    return { ok: true, skipped: false, reason: null };
  } catch (error) {
    return { ok: false, skipped: false, reason: error instanceof Error ? error.message : "Could not send Bot 24/7 email." };
  }
}
