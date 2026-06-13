import { sendPendingPaymentEmail } from "@/lib/notifications/pending-payment-email";
import { sendTelegramOrderNotification } from "@/lib/notifications/telegram";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentOrder } from "@/services/orderService";

type CheckoutNotificationMarkers = {
  pending_payment_email_sent_at: string | null;
  pending_payment_email_last_error: string | null;
  order_created_telegram_sent_at: string | null;
  order_created_telegram_last_error: string | null;
};

type NotificationStepResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string | null;
};

type CheckoutNotificationResult = {
  ok: boolean;
  email: NotificationStepResult;
  telegram: NotificationStepResult;
};

const markerSelectFields =
  "pending_payment_email_sent_at,pending_payment_email_last_error,order_created_telegram_sent_at,order_created_telegram_last_error" as const;

function skipped(reason: string): NotificationStepResult {
  return { ok: true, skipped: true, reason };
}

async function getCheckoutNotificationMarkers(orderCode: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false as const, error: "Missing Supabase admin client", markers: null };
  }

  const { data, error } = await supabase
    .from("orders")
    .select(markerSelectFields)
    .eq("order_code", orderCode.toUpperCase())
    .single();

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message ?? "Could not read checkout notification markers",
      markers: null,
    };
  }

  return { ok: true as const, error: null, markers: data as CheckoutNotificationMarkers };
}

async function markCheckoutNotification(
  orderCode: string,
  patch: Partial<CheckoutNotificationMarkers>,
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode.toUpperCase());

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

async function claimCheckoutNotification(
  orderCode: string,
  sentAtField: "pending_payment_email_sent_at" | "order_created_telegram_sent_at",
  errorField: "pending_payment_email_last_error" | "order_created_telegram_last_error",
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false as const, claimed: false, error: "Missing Supabase admin client" };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      [sentAtField]: new Date().toISOString(),
      [errorField]: null,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode.toUpperCase())
    .is(sentAtField, null)
    .select("order_code")
    .maybeSingle();

  if (error) {
    return { ok: false as const, claimed: false, error: error.message };
  }

  if (!data) {
    return { ok: true as const, claimed: false, error: null };
  }

  return { ok: true as const, claimed: true, error: null };
}

async function sendPendingPaymentEmailOnce(
  order: PaymentOrder,
  markers: CheckoutNotificationMarkers,
): Promise<NotificationStepResult> {
  if (markers.pending_payment_email_sent_at) {
    return skipped("Pending payment email already sent.");
  }

  const claim = await claimCheckoutNotification(
    order.orderCode,
    "pending_payment_email_sent_at",
    "pending_payment_email_last_error",
  );

  if (!claim.ok) {
    return { ok: false, skipped: false, reason: claim.error };
  }

  if (!claim.claimed) {
    return skipped("Pending payment email already sent or in progress.");
  }

  const result = await sendPendingPaymentEmail(order);

  if (!result.ok || result.skipped) {
    const reason = result.reason ?? "Could not send pending payment email.";
    await markCheckoutNotification(order.orderCode, {
      pending_payment_email_sent_at: null,
      pending_payment_email_last_error: reason.slice(0, 1000),
    });
  }

  return {
    ok: result.ok,
    skipped: result.skipped,
    reason: result.reason,
  };
}

async function sendTelegramOrderCreatedOnce(
  order: PaymentOrder,
  markers: CheckoutNotificationMarkers,
): Promise<NotificationStepResult> {
  if (markers.order_created_telegram_sent_at) {
    return skipped("Order-created Telegram notification already sent.");
  }

  const claim = await claimCheckoutNotification(
    order.orderCode,
    "order_created_telegram_sent_at",
    "order_created_telegram_last_error",
  );

  if (!claim.ok) {
    return { ok: false, skipped: false, reason: claim.error };
  }

  if (!claim.claimed) {
    return skipped("Order-created Telegram notification already sent or in progress.");
  }

  const result = await sendTelegramOrderNotification(order, "order_created");

  if (!result.ok || result.skipped) {
    const reason = result.reason ?? "Could not send Telegram notification.";
    await markCheckoutNotification(order.orderCode, {
      order_created_telegram_sent_at: null,
      order_created_telegram_last_error: reason.slice(0, 1000),
    });
  }

  return {
    ok: result.ok,
    skipped: result.skipped,
    reason: result.reason,
  };
}

export async function sendCheckoutEntryNotifications(order: PaymentOrder): Promise<CheckoutNotificationResult> {
  if (order.status !== "pending") {
    const step = skipped("Order is not pending.");
    return { ok: true, email: step, telegram: step };
  }

  const markerResult = await getCheckoutNotificationMarkers(order.orderCode);

  if (!markerResult.ok || !markerResult.markers) {
    const step = { ok: false, skipped: true, reason: markerResult.error };
    return { ok: false, email: step, telegram: step };
  }

  const email = await sendPendingPaymentEmailOnce(order, markerResult.markers);
  const telegram = await sendTelegramOrderCreatedOnce(order, markerResult.markers);

  return {
    ok: email.ok && telegram.ok,
    email,
    telegram,
  };
}
