import { NextResponse } from "next/server";
import {
  sendPaymentSuccessEmail,
  shouldSendPaymentSuccessEmail,
} from "@/lib/notifications/payment-success-email";
import { syncOrderToGoogleSheetWithActivity } from "@/lib/notifications/google-sheets-order-sync";
import { sendTelegramOrderNotification, sendTelegramSupportBookingNotification } from "@/lib/notifications/telegram";
import { SUPPORT_PRODUCT_SLUG } from "@/lib/support-booking/constants";
import { isConsultationOrder } from "@/lib/consultation/constants";
import { sendConsultationPaymentEmail } from "@/lib/notifications/consultation-payment-email";
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
  markPaymentEmailError,
  markPaymentEmailSent,
  type PaymentOrder,
} from "@/services/orderService";
import { ensureStudentAccountForPaidOrder } from "@/services/studentAccountService";
import { notifyStudentPortalProvisioning } from "@/services/studentPortalProvisioningService";
import { siteConfig } from "@/data/site";
import { isAgentKitPreorderDepositOrder } from "@/lib/agent-kit-preorder";
import {
  confirmSupportBookingForPaidOrder,
  markSupportBookingTelegram,
  type ConfirmedSupportBooking,
} from "@/services/supportBookingService";

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

  try {
    const confirmation = await confirmOrderFromSepay(payload);
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
    let studentAccount: Awaited<
      ReturnType<typeof ensureStudentAccountForPaidOrder>
    > | null = null;
    let studentPortalProvisioning: Awaited<
      ReturnType<typeof notifyStudentPortalProvisioning>
    > | null = null;
    const supportBookingOrder = isSupportBookingOrder(confirmation.order);
    const consultationOrder = isConsultationOrder(confirmation.order);
    const preorderDepositOrder = isAgentKitPreorderDepositOrder(confirmation.order);
    let supportBooking: ConfirmedSupportBooking | null = null;

    const accountingEmail = await notifyAccountingForPaidOrder(confirmation.order);
    if (!accountingEmail.ok) {
      console.warn("[sepay] Accounting payment email failed:", {
        orderCode: confirmation.order.orderCode,
        reason: accountingEmail.reason,
      });
    }

    if (!confirmation.wasAlreadyPaid && supportBookingOrder) {
      supportBooking = await confirmSupportBookingForPaidOrder(confirmation.order);
      paymentEmail = {
        ok: true,
        skipped: true,
        reason: "Support booking confirmation is shown on the website.",
      };
    }

    if (!confirmation.wasAlreadyPaid && consultationOrder) {
      const result = await sendConsultationPaymentEmail(confirmation.order);
      paymentEmail = result;
      if (result.ok && !result.skipped) {
        await markPaymentEmailSent(confirmation.order.orderCode);
      } else if (!result.ok) {
        await markPaymentEmailError(confirmation.order.orderCode, result.reason ?? "Không gửi được email xác nhận tư vấn.");
      }
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

    if (
      !confirmation.wasAlreadyPaid &&
      shouldSendPaymentSuccessEmail(confirmation.order) &&
      !supportBookingOrder &&
      !consultationOrder
    ) {
      if (!preorderDepositOrder) {
        studentAccount = await ensureStudentAccountForPaidOrder(
          confirmation.order,
        );

        if (!studentAccount.ok) {
          logSecurityEvent({
            action: "student_account_auto_create_failed",
            request,
            detail: {
              orderCode: confirmation.order.orderCode,
              reason: studentAccount.reason,
            },
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
      }

      if (!preorderDepositOrder && !studentAccount?.temporaryPassword) {
        const reason = studentAccount?.ok
          ? "Payment success email requires a verified student login account."
          : `Payment success email blocked because student account provisioning failed: ${
              studentAccount?.reason ?? "unknown reason"
            }`;
        paymentEmail = { ok: false, skipped: false, reason };

        const markResult = await markPaymentEmailError(
          confirmation.order.orderCode,
          reason,
        );

        if (!markResult.ok) {
          logSecurityEvent({
            action: "payment_success_email_mark_error_failed",
            request,
            detail: {
              orderCode: confirmation.order.orderCode,
              reason: markResult.error,
            },
          });
        }

        await logStudentActivity({
          userId: studentAccount?.userId ?? null,
          studentEmail: confirmation.order.email,
          studentPhone: confirmation.order.phone,
          eventType: "payment_success_email_failed",
          eventTitle: "Chưa gửi email vì chưa cấp được tài khoản học viên",
          eventDescription: reason,
          status: "failed",
          actorType: "system",
          metadata: {
            orderCode: confirmation.order.orderCode,
            courseSlug: confirmation.order.courseSlug,
          },
        });
      } else {
        const provisionedAccount = studentAccount;
        const account = provisionedAccount && provisionedAccount.temporaryPassword
          ? {
              email: provisionedAccount.email,
              temporaryPassword: provisionedAccount.temporaryPassword,
              created: provisionedAccount.created,
              mustChangePassword: true,
            }
          : undefined;
        const result = await sendPaymentSuccessEmail(confirmation.order, {
          account,
        });
        paymentEmail = {
          ok: result.ok,
          skipped: result.skipped,
          reason: result.reason,
        };

        if (result.ok && !result.skipped) {
          const markResult = await markPaymentEmailSent(
            confirmation.order.orderCode,
          );

          if (!markResult.ok) {
            logSecurityEvent({
              action: "payment_success_email_mark_sent_failed",
              request,
              detail: {
                orderCode: confirmation.order.orderCode,
                reason: markResult.error,
              },
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
            metadata: {
              orderCode: confirmation.order.orderCode,
              courseSlug: confirmation.order.courseSlug,
            },
          });
        } else {
          const reason = result.reason ?? "Payment success email was skipped.";
          const markResult = await markPaymentEmailError(
            confirmation.order.orderCode,
            reason,
          );

          if (!markResult.ok) {
            logSecurityEvent({
              action: "payment_success_email_mark_error_failed",
              request,
              detail: {
                orderCode: confirmation.order.orderCode,
                reason: markResult.error,
              },
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
            metadata: {
              orderCode: confirmation.order.orderCode,
              courseSlug: confirmation.order.courseSlug,
            },
          });
        }
      }
    }

    if (!confirmation.wasAlreadyPaid) {
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

    if (!confirmation.wasAlreadyPaid) {
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
        message:
          error instanceof Error
            ? error.message
            : "Không xử lý được webhook Sepay.",
      },
      { status: 422 },
    );
  }
}
