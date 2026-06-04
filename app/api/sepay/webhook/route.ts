import { NextResponse } from "next/server";
import {
  sendPaymentSuccessEmail,
  shouldSendPaymentSuccessEmail,
} from "@/lib/notifications/payment-success-email";
import { sendTelegramOrderNotification } from "@/lib/notifications/telegram";
import { sendMetaPurchaseEvent } from "@/lib/meta/conversions-api";
import { verifySepayApiKey, type SepayWebhookPayload } from "@/lib/payments/sepay";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { confirmOrderFromSepay, markPaymentEmailError, markPaymentEmailSent } from "@/services/orderService";
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

    if (!confirmation.wasAlreadyPaid) {
      try {
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
          pageUrl: `${siteConfig.url}/thanh-toan/${encodeURIComponent(confirmation.order.orderCode)}`,
          paidAt: confirmation.order.paidAt,
          orderItems: confirmation.order.orderItems,
        });

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
        account: studentAccount.created
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

    invalidateAdminModules(["orders", "students", "leads"]);

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
