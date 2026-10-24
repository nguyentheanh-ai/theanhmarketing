import { NextResponse } from "next/server";
import { syncOrderToGoogleSheetWithActivity } from "@/lib/notifications/google-sheets-order-sync";
import { sendTelegramOrderNotification, sendTelegramSupportBookingNotification } from "@/lib/notifications/telegram";
import { SUPPORT_PRODUCT_SLUG } from "@/lib/support-booking/constants";
import { isConsultationOrder } from "@/lib/consultation/constants";
import { dispatchMetaPurchaseOrders } from "@/lib/meta/purchase-outbox";
import {
  verifySepayApiKey,
  type SepayWebhookPayload,
} from "@/lib/payments/sepay";
import { logSecurityEvent } from "@/lib/security/audit-log";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { notifyAccountingForPaidOrder } from "@/services/accountingNotificationService";
import { logStudentActivity } from "@/services/activityLogService";
import {
  confirmOrderFromSepay,
  type PaymentOrder,
} from "@/services/orderService";
import { siteConfig } from "@/data/site";
import { isAgentKitPreorderDepositOrder } from "@/lib/agent-kit-preorder";
import {
  confirmSupportBookingForPaidOrder,
  markSupportBookingTelegram,
  type ConfirmedSupportBooking,
} from "@/services/supportBookingService";

import { isBot247Order } from "@/lib/notifications/payment-success-email";
import { fulfillSourcePaidOrder, initialSepayFulfillmentReceipt, PaidFulfillmentUnavailable } from "@/services/sourcePaidFulfillmentService";

export const runtime = "nodejs";

function isSupportBookingOrder(order: PaymentOrder) {
  return order.courseSlug === SUPPORT_PRODUCT_SLUG ||
    order.orderItems.some((item) => item.slug === SUPPORT_PRODUCT_SLUG);
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "sepay:webhook"),
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    logSecurityEvent({ action: "sepay_webhook_rate_limited", request });
    return rateLimitResponse(rateLimit.resetAt);
  }

  if (!verifySepayApiKey(request.headers)) {
    logSecurityEvent({ action: "sepay_webhook_bad_api_key", request });
    return NextResponse.json(
      { success: false, message: "Sai API key Sepay." },
      { status: 401 },
    );
  }

  let payload: SepayWebhookPayload;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      payload = (await request.json()) as SepayWebhookPayload;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries()) as SepayWebhookPayload;
    } else {
      payload = (await request.json()) as SepayWebhookPayload;
    }
  } catch {
    logSecurityEvent({ action: "sepay_webhook_invalid_payload", request });
    return NextResponse.json(
      { success: false, message: "Payload webhook Sepay không hợp lệ." },
      { status: 400 },
    );
  }

  let paidConfirmed = false;
  try {
    const confirmation = await confirmOrderFromSepay(payload, {
      initialFulfillmentReceipt: order => !isSupportBookingOrder(order)
        ? initialSepayFulfillmentReceipt() : null,
    });
    paidConfirmed = true;
    let paymentEmail: {
      ok: boolean;
      skipped: boolean;
      reason?: string | null;
    } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };
    let metaPurchase: {
      ok: boolean;
      skipped: boolean;
      reason?: string;
      status?: number;
    } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };
    const supportBookingOrder = isSupportBookingOrder(confirmation.order);
    const consultationOrder = isConsultationOrder(confirmation.order);
    const preorderDepositOrder = isAgentKitPreorderDepositOrder(confirmation.order);
    let supportBooking: ConfirmedSupportBooking | null = null;

    // Paid status and its recovery receipt commit together. Duplicate/late
    // requests resume fulfillment, preserving existing passwords and using a
    // database CAS claim plus a payload-bound provider idempotency key.
    if (!supportBookingOrder) {
      paymentEmail = await fulfillSourcePaidOrder(confirmation.order, undefined, consultationOrder ? 'consultation' : preorderDepositOrder ? 'preorder' : isBot247Order(confirmation.order) ? 'bot247' : 'course');
      if (paymentEmail.ok && !paymentEmail.skipped) {
        await logStudentActivity({ studentEmail: confirmation.order.email, studentPhone: confirmation.order.phone,
          eventType: 'payment_success_email_sent', eventTitle: 'Đã gửi email thanh toán thành công', status: 'success', actorType: 'system',
          metadata: { orderCode: confirmation.order.orderCode, courseSlug: confirmation.order.courseSlug } });
      }
    }


    if (supportBookingOrder) {
      try { supportBooking = await confirmSupportBookingForPaidOrder(confirmation.order); }
      catch { throw new PaidFulfillmentUnavailable('support_booking_confirmation_failed'); }
      paymentEmail = {
        ok: true,
        skipped: true,
        reason: "Support booking confirmation is shown on the website.",
      };
    }

    const accountingEmail = await notifyAccountingForPaidOrder(confirmation.order);
    if (!accountingEmail.ok) {
      console.warn("[sepay] Accounting payment email failed:", {
        orderCode: confirmation.order.orderCode,
        reason: accountingEmail.reason,
      });
    }

    if (confirmation.order.status === "paid" && !confirmation.order.purchaseEventSent) {
      try {
        const dispatch = await dispatchMetaPurchaseOrders({
          orderCode: confirmation.order.orderCode,
          limit: 1,
        });
        metaPurchase = {
          ok: dispatch.sent > 0,
          skipped: dispatch.claimed === 0,
          reason: dispatch.error ?? (dispatch.retried > 0 ? "queued_for_retry" : undefined),
        };

        if (dispatch.error || dispatch.retried > 0 || dispatch.lostLease > 0) {
          console.warn("[sepay] Meta Purchase event failed:", {
            orderCode: confirmation.order.orderCode,
            retried: dispatch.retried,
            lostLease: dispatch.lostLease,
            reason: dispatch.error,
          });
        }
      } catch {
        metaPurchase = { ok: false, skipped: false, reason: "queued_for_retry" };
        console.warn("[sepay] Meta Purchase event failed; durable retry remains queued.", {
          orderCode: confirmation.order.orderCode,
        });
      }
    }

    if (!confirmation.wasAlreadyPaid || (!supportBookingOrder && !paymentEmail.skipped)) {
      try {
        const telegram = supportBookingOrder && supportBooking
          ? await sendTelegramSupportBookingNotification(confirmation.order, supportBooking)
          : await sendTelegramOrderNotification(confirmation.order, "payment_paid");

        if (supportBooking) {
          await markSupportBookingTelegram(supportBooking.id, telegram);
        }

        if (!telegram.ok && !telegram.skipped) {
          console.warn("[sepay] Telegram paid notification failed:", {
            reason: telegram.reason,
            status: telegram.status,
          });
        }
      } catch (telegramError) {
        console.warn(
          "[sepay] Telegram paid notification failed:",
          telegramError,
        );
      }
    }

    if (!confirmation.wasAlreadyPaid || (!supportBookingOrder && !paymentEmail.skipped)) {
      try {
        await syncOrderToGoogleSheetWithActivity(confirmation.order, {
          source: "SePay paid webhook",
          landingPageUrl: `${siteConfig.url}/thanh-toan/${encodeURIComponent(confirmation.order.orderCode)}`,
        });
      } catch (sheetError) {
        console.warn(
          "[sepay] Google Sheets paid order sync failed:",
          sheetError,
        );
      }
    }

    invalidateAdminModules(["orders", "students", "leads", "activities"]);

    return NextResponse.json({
      success: true,
      ...(process.env.NODE_ENV === "development"
        ? {
            paymentEmail,
            metaPurchase,
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof PaidFulfillmentUnavailable || paidConfirmed) {
      logSecurityEvent({ action: "sepay_fulfillment_pending", request, detail: { reason: error instanceof PaidFulfillmentUnavailable ? error.reason : "post_settlement_failure" } });
      return NextResponse.json({ success: false, message: "Thanh toán đã được lưu; bước cấp quyền đang chờ xử lý lại." }, { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
    }
    logSecurityEvent({
      action: "sepay_webhook_rejected",
      request,
      detail: { reason: error instanceof Error ? error.message : "unknown" },
    });
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không xử lý được webhook Sepay.",
      },
      { status: 422 },
    );
  }
}
