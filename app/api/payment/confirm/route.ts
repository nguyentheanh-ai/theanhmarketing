import { NextResponse } from "next/server";
import { dispatchMetaPurchaseOrders } from "@/lib/meta/purchase-outbox";
import { syncOrderToGoogleSheetWithActivity } from "@/lib/notifications/google-sheets-order-sync";
import { verifySepayApiKey } from "@/lib/payments/sepay";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { siteConfig } from "@/data/site";
import { invalidateAdminModules } from "@/services/adminDataService";
import { notifyAccountingForPaidOrder } from "@/services/accountingNotificationService";
import { confirmPaymentManually } from "@/services/orderService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "payment:confirm"),
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  if (!verifySepayApiKey(request.headers)) {
    return NextResponse.json({ ok: false, message: "Sai API key xac nhan thanh toan." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      phone?: string;
      email?: string;
      amount?: number | string;
      order_code?: string;
      orderCode?: string;
      product_name?: string;
      productName?: string;
      payment_method?: string;
      paymentMethod?: string;
      paid_at?: string;
      paidAt?: string;
    };

    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const amount = Number(body.amount ?? 0);
    const orderCode = cleanText(body.order_code ?? body.orderCode, 80).toUpperCase();
    const productName = cleanText(body.product_name ?? body.productName, 200);
    const paymentMethod = cleanText(body.payment_method ?? body.paymentMethod, 80) || "manual-confirm";
    const paidAt = cleanText(body.paid_at ?? body.paidAt, 80) || new Date().toISOString();

    if ((!phone || !isValidPhone(phone)) && (!email || !isValidEmail(email))) {
      return NextResponse.json({ ok: false, message: "Can co phone hoac email hop le." }, { status: 400 });
    }

    if (!orderCode || !productName || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, message: "Thieu order_code, product_name hoac amount hop le." }, { status: 400 });
    }

    const confirmation = await confirmPaymentManually({
      phone,
      email,
      amount,
      orderCode,
      productName,
      paymentMethod,
      paidAt,
    });

    const accountingEmail = await notifyAccountingForPaidOrder(confirmation.order);
    if (!accountingEmail.ok) {
      console.warn("[payment-confirm] Accounting payment email failed:", {
        orderCode: confirmation.order.orderCode,
        reason: accountingEmail.reason,
      });
    }

    let metaPurchase: { ok: boolean; skipped: boolean; reason?: string; status?: number } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };

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
      } catch {
        metaPurchase = { ok: false, skipped: false, reason: "queued_for_retry" };
      }
    }

    await syncOrderToGoogleSheetWithActivity(confirmation.order, {
      source: "Manual payment confirm",
      landingPageUrl: `${siteConfig.url}/thanh-toan/${encodeURIComponent(confirmation.order.orderCode)}`,
    });
    invalidateAdminModules(["orders", "leads", "students", "activities"]);

    return NextResponse.json({
      ok: true,
      order: confirmation.order,
      wasAlreadyPaid: confirmation.wasAlreadyPaid,
      ...(process.env.NODE_ENV === "development" ? { metaPurchase } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Khong xac nhan duoc thanh toan." },
      { status: 422 },
    );
  }
}
