import { buildPendingPaymentEmailPayload } from "@/lib/notifications/pending-payment-email";
import type { PaymentOrder } from "@/services/orderService";

// Pure payload builder shared by the Supabase dispatcher and the native D1 one.
const reminderSubjects = {
  1: (orderCode: string) => `Anh/chị còn một bước để hoàn tất đăng ký - ${orderCode}`,
  2: (orderCode: string) => `Nhắc lại: đơn đăng ký vẫn đang chờ thanh toán - ${orderCode}`,
} as const;

const reminderHeadings = {
  1: "Anh/chị còn một bước để hoàn tất đăng ký.",
  2: "Em nhắc lại để anh/chị không bỏ lỡ đơn đăng ký này.",
} as const;

export function buildPaymentReminderEmailPayload(order: PaymentOrder, sequenceIndex: 1 | 2) {
  const payload = buildPendingPaymentEmailPayload(order);
  const heading = reminderHeadings[sequenceIndex];
  const reminderBlock = `<div style="margin:0 0 22px;padding:16px 18px;border-radius:12px;background:#2a211c;border:1px solid #6a3d25;color:#f6f1e7;font-size:15px;line-height:1.7"><strong style="color:#f66628">${heading}</strong><br />Nếu anh/chị đã thanh toán, vui lòng bỏ qua email này.</div>`;

  return {
    ...payload,
    subject: reminderSubjects[sequenceIndex](order.orderCode),
    html: payload.html.replace('<td style="padding:34px">', `<td style="padding:34px">${reminderBlock}`),
    text: `${heading}\nNếu anh/chị đã thanh toán, vui lòng bỏ qua email này.\n\n${payload.text}`,
  };
}
