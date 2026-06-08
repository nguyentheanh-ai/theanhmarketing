import { sendPendingPaymentEmail } from "@/lib/notifications/pending-payment-email";
import { sendPaymentFailedEmail, sendPaymentSuccessEmail } from "@/lib/notifications/payment-success-email";
import { getLeadById, type LeadItem } from "@/services/leadService";
import { getPaymentOrder } from "@/services/orderService";

type LeadResendResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string | null;
  template: string;
  email: string;
  orderCode: string | null;
};

function getTemplateForStatus(status: string) {
  if (status === "paid") {
    return "payment_success";
  }

  if (status === "failed" || status === "expired") {
    return "payment_failed";
  }

  return "pending_payment";
}

export async function sendLeadResendEmail(leadOrId: LeadItem | string): Promise<LeadResendResult> {
  const lead = typeof leadOrId === "string" ? await getLeadById(leadOrId) : leadOrId;

  if (!lead) {
    return {
      ok: false,
      skipped: false,
      reason: "Không tìm thấy lead.",
      template: "unknown",
      email: "",
      orderCode: null,
    };
  }

  if (!lead.orderCode) {
    return {
      ok: false,
      skipped: false,
      reason: "Lead chưa có mã đơn để gửi lại email thanh toán.",
      template: "unknown",
      email: lead.email ?? "",
      orderCode: null,
    };
  }

  const order = await getPaymentOrder(lead.orderCode);

  if (!order) {
    return {
      ok: false,
      skipped: false,
      reason: `Không tìm thấy đơn ${lead.orderCode}.`,
      template: "unknown",
      email: lead.email ?? "",
      orderCode: lead.orderCode,
    };
  }

  const template = getTemplateForStatus(order.status);
  const result =
    template === "payment_success"
      ? await sendPaymentSuccessEmail(order, { force: true })
      : template === "payment_failed"
        ? await sendPaymentFailedEmail(order, { force: true })
        : await sendPendingPaymentEmail(order, { force: true });

  return {
    ok: result.ok && !result.skipped,
    skipped: result.skipped,
    reason: result.reason,
    template,
    email: order.email,
    orderCode: order.orderCode,
  };
}
