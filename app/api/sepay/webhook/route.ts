import { NextResponse } from "next/server";
import {
  sendPaymentSuccessEmail,
  shouldSendPaymentSuccessEmail,
} from "@/lib/notifications/payment-success-email";
import { verifySepayApiKey, type SepayWebhookPayload } from "@/lib/payments/sepay";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { confirmOrderFromSepay, markPaymentEmailError, markPaymentEmailSent } from "@/services/orderService";
import { ensureStudentAccountForPaidOrder } from "@/services/studentAccountService";

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
    let studentAccount:
      | Awaited<ReturnType<typeof ensureStudentAccountForPaidOrder>>
      | null = null;

    if (!confirmation.wasAlreadyPaid && shouldSendPaymentSuccessEmail(confirmation.order)) {
      studentAccount = await ensureStudentAccountForPaidOrder(confirmation.order);

      if (!studentAccount.ok) {
        logSecurityEvent({
          action: "student_account_auto_create_failed",
          request,
          detail: { orderCode: confirmation.order.orderCode, reason: studentAccount.reason },
        });
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

    return NextResponse.json({
      success: true,
      ...(process.env.NODE_ENV === "development"
        ? {
            paymentEmail,
            studentAccount: studentAccount
              ? {
                  ok: studentAccount.ok,
                  skipped: studentAccount.skipped,
                  created: studentAccount.created,
                  reason: studentAccount.reason,
                }
              : null,
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
