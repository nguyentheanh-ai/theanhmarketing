import { NextResponse } from "next/server";
import {
  sendPaymentSuccessEmail,
  shouldSendPaymentSuccessEmail,
} from "@/lib/notifications/payment-success-email";
import { syncOrderToGoogleSheet } from "@/lib/notifications/google-sheets";
import { sendTelegramOrderNotification } from "@/lib/notifications/telegram";
import { sendMetaPurchaseEvent } from "@/lib/meta/conversions-api";
import { verifySepayApiKey, type SepayWebhookPayload } from "@/lib/payments/sepay";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { logStudentActivity } from "@/services/activityLogService";
import {
  confirmOrderFromSepay,
  markPaymentEmailError,
  markPaymentEmailSent,
  markPurchaseEventSent,
} from "@/services/orderService";
import { ensureStudentAccountForPaidOrder } from "@/services/studentAccountService";
import { notifyStudentPortalProvisioning } from "@/services/studentPortalProvisioningService";
import { siteConfig } from "@/data/site";

export const runtime = "nodejs";

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
    return NextResponse.json({ success: false, message: "Sai API key Sepay." }, { status: 401 });
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

  try {
    const confirmation = await confirmOrderFromSepay(payload);
    let paymentEmail: { ok: boolean; skipped: boolean; reason?: string | null } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };
    let metaPurchase: { ok: boolean; skipped: boolean; reason?: string; status?: number } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };
    let studentAccount:
      | Awaited<ReturnType<typeof ensureStudentAccountForPaidOrder>>
      | null = null;
    let studentPortalProvisioning:
      | Awaited<ReturnType<typeof notifyStudentPortalProvisioning>>
      | null = null;

    if (!confirmation.wasAlreadyPaid && !confirmation.order.purchaseEventSent) {
      try {
        const eventSourceUrl = `${siteConfig.url}/thanh-toan/${encodeURIComponent(confirmation.order.orderCode)}`;
        metaPurchase = await sendMetaPurchaseEvent({
          orderCode: confirmation.order.orderCode,
          studentName: confirmation.order.studentName,
          email: confirmation.order.email,
          phone: confirmation.order.phone,
          courseSlug: confirmation.order.courseSlug,
          courseTitle: confirmation.order.courseTitle,
          amount: confirmation.order.amount,
          currency: confirmation.order.currency,
          status: confirmation.order.status,
          pageUrl: eventSourceUrl,
          landingPage: confirmation.order.attribution.landingPage || eventSourceUrl,
          utmSource: confirmation.order.attribution.utmSource,
          utmMedium: confirmation.order.attribution.utmMedium,
          utmCampaign: confirmation.order.attribution.utmCampaign,
          utmContent: confirmation.order.attribution.utmContent,
          utmId: confirmation.order.attribution.utmId,
          utmTerm: confirmation.order.attribution.utmTerm,
          campaignId: confirmation.order.attribution.campaignId,
          campaignName: confirmation.order.attribution.campaignName,
          adsetId: confirmation.order.attribution.adsetId,
          adId: confirmation.order.attribution.adId,
          adName: confirmation.order.attribution.adName,
          fbclid: confirmation.order.attribution.fbclid,
          fbp: confirmation.order.attribution.fbp,
          fbc: confirmation.order.attribution.fbc,
          paidAt: confirmation.order.paidAt,
          orderItems: confirmation.order.orderItems,
        });

        if (metaPurchase.ok && !metaPurchase.skipped) {
          const markResult = await markPurchaseEventSent(confirmation.order.orderCode);

          if (!markResult.ok) {
            console.warn("[sepay] Could not mark Purchase event as sent:", markResult.error);
          }
        }

        if (!metaPurchase.ok && !metaPurchase.skipped) {
          console.warn("[sepay] Meta Purchase event failed:", {
            reason: metaPurchase.reason,
            status: metaPurchase.status,
          });
        }
      } catch (metaError) {
        console.warn("[sepay] Meta Purchase event failed:", metaError);
      }
    }

    if (!confirmation.wasAlreadyPaid && shouldSendPaymentSuccessEmail(confirmation.order)) {
      studentAccount = await ensureStudentAccountForPaidOrder(confirmation.order);

      if (!studentAccount.ok) {
        logSecurityEvent({
          action: "student_account_auto_create_failed",
          request,
          detail: { orderCode: confirmation.order.orderCode, reason: studentAccount.reason },
        });
      }

      if (studentAccount.ok && studentAccount.userId) {
        studentPortalProvisioning = await notifyStudentPortalProvisioning({
          order: confirmation.order,
          userId: studentAccount.userId,
        });

        if (!studentPortalProvisioning.ok) {
          logSecurityEvent({
            action: "student_portal_provisioning_failed",
            request,
            detail: {
              orderCode: confirmation.order.orderCode,
              reason: studentPortalProvisioning.reason,
              status: studentPortalProvisioning.status,
            },
          });
        }
      }

      const result = await sendPaymentSuccessEmail(confirmation.order, {
        account: studentAccount.temporaryPassword
          ? {
              email: studentAccount.email,
              temporaryPassword: studentAccount.temporaryPassword,
              created: studentAccount.created,
              mustChangePassword: true,
            }
          : undefined,
      });
      paymentEmail = { ok: result.ok, skipped: result.skipped, reason: result.reason };

      if (result.ok && !result.skipped) {
        const markResult = await markPaymentEmailSent(confirmation.order.orderCode);

        if (!markResult.ok) {
          logSecurityEvent({
            action: "payment_success_email_mark_sent_failed",
            request,
            detail: { orderCode: confirmation.order.orderCode, reason: markResult.error },
          });
        }
        await logStudentActivity({
          userId: studentAccount?.userId ?? null,
          studentEmail: confirmation.order.email,
          studentPhone: confirmation.order.phone,
          eventType: "payment_success_email_sent",
          eventTitle: "Đã gửi email thanh toán thành công",
          eventDescription: `Email xác nhận thanh toán đã gửi cho đơn ${confirmation.order.orderCode}.`,
          status: "success",
          actorType: "system",
          metadata: { orderCode: confirmation.order.orderCode, courseSlug: confirmation.order.courseSlug },
        });
      } else {
        const reason = result.reason ?? "Payment success email was skipped.";
        const markResult = await markPaymentEmailError(confirmation.order.orderCode, reason);

        if (!markResult.ok) {
          logSecurityEvent({
            action: "payment_success_email_mark_error_failed",
            request,
            detail: { orderCode: confirmation.order.orderCode, reason: markResult.error },
          });
        }
        await logStudentActivity({
          userId: studentAccount?.userId ?? null,
          studentEmail: confirmation.order.email,
          studentPhone: confirmation.order.phone,
          eventType: "payment_success_email_failed",
          eventTitle: "Gửi email thanh toán thành công thất bại",
          eventDescription: reason,
          status: "failed",
          actorType: "system",
          metadata: { orderCode: confirmation.order.orderCode, courseSlug: confirmation.order.courseSlug },
        });
      }
    }

    if (!confirmation.wasAlreadyPaid) {
      try {
        const telegram = await sendTelegramOrderNotification(confirmation.order, "payment_paid");

        if (!telegram.ok && !telegram.skipped) {
          console.warn("[sepay] Telegram paid notification failed:", {
            reason: telegram.reason,
            status: telegram.status,
          });
        }
      } catch (telegramError) {
        console.warn("[sepay] Telegram paid notification failed:", telegramError);
      }
    }

    if (!confirmation.wasAlreadyPaid) {
      try {
        const sheetSync = await syncOrderToGoogleSheet(confirmation.order, {
          source: "SePay paid webhook",
          landingPageUrl: `${siteConfig.url}/thanh-toan/${encodeURIComponent(confirmation.order.orderCode)}`,
        });

        if (!sheetSync.ok && !sheetSync.skipped) {
          console.warn("[sepay] Google Sheets paid order sync failed:", {
            reason: sheetSync.reason,
            status: sheetSync.status,
          });
          await logStudentActivity({
            studentEmail: confirmation.order.email,
            studentPhone: confirmation.order.phone,
            eventType: "sheet_sync_failed",
            eventTitle: "Đồng bộ Google Sheet đơn paid thất bại",
            eventDescription: sheetSync.reason ?? "Google Sheets paid order sync failed",
            status: "failed",
            actorType: "system",
            metadata: { orderCode: confirmation.order.orderCode, status: sheetSync.status ?? null },
          });
        } else if (sheetSync.ok && !sheetSync.skipped) {
          await logStudentActivity({
            studentEmail: confirmation.order.email,
            studentPhone: confirmation.order.phone,
            eventType: "sheet_sync_success",
            eventTitle: "Đã đồng bộ Google Sheet đơn paid",
            eventDescription: `Đơn ${confirmation.order.orderCode} đã được gửi sang Google Sheet sau webhook SePay.`,
            status: "success",
            actorType: "system",
            metadata: { orderCode: confirmation.order.orderCode },
          });
        }
      } catch (sheetError) {
        console.warn("[sepay] Google Sheets paid order sync failed:", sheetError);
      }
    }

    invalidateAdminModules(["orders", "students", "leads", "activities"]);

    return NextResponse.json({
      success: true,
      ...(process.env.NODE_ENV === "development"
        ? {
            paymentEmail,
            metaPurchase,
            studentAccount: studentAccount
              ? {
                  ok: studentAccount.ok,
                  skipped: studentAccount.skipped,
                  created: studentAccount.created,
                  reason: studentAccount.reason,
                }
              : null,
            studentPortalProvisioning,
          }
        : {}),
    });
  } catch (error) {
    logSecurityEvent({
      action: "sepay_webhook_rejected",
      request,
      detail: { reason: error instanceof Error ? error.message : "unknown" },
    });
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Không xử lý được webhook Sepay.",
      },
      { status: 422 },
    );
  }
}
