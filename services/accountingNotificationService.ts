import {
  sendAccountingPaymentEmail,
  type AccountingEmailResult,
} from "@/lib/notifications/accounting-payment-email";
import {
  markAccountingEmailError,
  markAccountingEmailSent,
  type PaymentOrder,
} from "@/services/orderService";

type MarkerResult = { ok: boolean; error?: string | null };

export type AccountingNotificationDependencies = {
  send: (order: PaymentOrder) => Promise<AccountingEmailResult>;
  markSent: (orderCode: string) => Promise<MarkerResult>;
  markError: (orderCode: string, reason: string) => Promise<MarkerResult>;
};

const productionDependencies: AccountingNotificationDependencies = {
  send: sendAccountingPaymentEmail,
  markSent: markAccountingEmailSent,
  markError: markAccountingEmailError,
};

function safeReason(reason: unknown, fallback: string) {
  const value = reason instanceof Error ? reason.message : String(reason ?? "");
  return (value.trim() || fallback).slice(0, 1000);
}

async function recordError(
  dependencies: AccountingNotificationDependencies,
  orderCode: string,
  reason: string,
) {
  try {
    await dependencies.markError(orderCode, reason);
  } catch {
    // Payment status is authoritative; accounting marker failure must not escape.
  }
}

export async function notifyAccountingForPaidOrder(
  order: PaymentOrder,
  dependencies: AccountingNotificationDependencies = productionDependencies,
): Promise<AccountingEmailResult> {
  if (order.status !== "paid" || order.accountingEmailSentAt) {
    return {
      ok: true,
      skipped: true,
      reason: "Order is not eligible or accounting email was already sent.",
    };
  }

  let delivery: AccountingEmailResult;
  try {
    delivery = await dependencies.send(order);
  } catch (error) {
    const reason = safeReason(error, "Accounting email provider failed.");
    await recordError(dependencies, order.orderCode, reason);
    return { ok: false, skipped: false, reason };
  }

  if (!delivery.ok || delivery.skipped) {
    const reason = safeReason(delivery.reason, "Accounting email was not sent.");
    await recordError(dependencies, order.orderCode, reason);
    return { ...delivery, reason };
  }

  try {
    const marker = await dependencies.markSent(order.orderCode);
    if (!marker.ok) {
      const reason = safeReason(marker.error, "Accounting email sent marker failed.");
      await recordError(dependencies, order.orderCode, reason);
      return { ok: false, skipped: false, reason, resendEmailId: delivery.resendEmailId ?? null };
    }
  } catch (error) {
    const reason = safeReason(error, "Accounting email sent marker failed.");
    await recordError(dependencies, order.orderCode, reason);
    return { ok: false, skipped: false, reason, resendEmailId: delivery.resendEmailId ?? null };
  }

  return delivery;
}
