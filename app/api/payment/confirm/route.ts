import { NextResponse } from "next/server";
import { sendMetaPurchaseEvent } from "@/lib/meta/conversions-api";
import { syncOrderToGoogleSheet } from "@/lib/notifications/google-sheets";
import { verifySepayApiKey } from "@/lib/payments/sepay";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { siteConfig } from "@/data/site";
import { invalidateAdminModules } from "@/services/adminDataService";
import { confirmPaymentManually, markPurchaseEventSent } from "@/services/orderService";

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

    let metaPurchase: { ok: boolean; skipped: boolean; reason?: string; status?: number } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };

    if (!confirmation.wasAlreadyPaid && !confirmation.order.purchaseEventSent) {
      const eventSourceUrl = `${siteConfig.url}/thanh-toan/${encodeURIComponent(confirmation.order.orderCode)}`;
      metaPurchase = await sendMetaPurchaseEvent({
        orderCode: confirmation.order.orderCode,
        studentName: confirmation.order.studentName,
        email: confirmation.order.email,
        phone: confirmation.order.phone,
        courseSlug: confirmation.order.courseSlug,
        courseTitle: confirmation.order.courseTitle || productName,
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
        await markPurchaseEventSent(confirmation.order.orderCode);
      }
    }

    await syncOrderToGoogleSheet(confirmation.order, {
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
