import { NextResponse } from "next/server";
import {
  cleanEmail,
  cleanPhone,
  cleanSlug,
  cleanSlugList,
  cleanText,
  isValidEmail,
  isValidPhone,
  isValidSlug,
} from "@/lib/security/validation";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { sendMetaLeadEvent } from "@/lib/meta/conversions-api";
import { syncOrderToGoogleSheet } from "@/lib/notifications/google-sheets";
import { sendOrderCreatedEmails } from "@/lib/notifications/pending-payment-email";
import { sendTelegramOrderNotification } from "@/lib/notifications/telegram";
import { invalidateAdminModules } from "@/services/adminDataService";
import { createLeadAdmin, syncLeadByIdToGoogleSheet, updateLeadAdmin } from "@/services/leadService";
import { createPaymentOrder, type PaymentOrder } from "@/services/orderService";

function determineLeadSource(order: PaymentOrder, landingPage?: string) {
  const page = cleanText(landingPage, 120);
  const courseIdentity = `${order.courseSlug} ${order.courseTitle}`.toLowerCase();

  if (page.includes("ai-master-x10") || courseIdentity.includes("ai-master-x10")) {
    return "LDP AI Master X10";
  }

  if (page.includes("facebook-ads-master-2026") || courseIdentity.includes("facebook-ads-2026")) {
    return "LDP Facebook Ads Master 2026";
  }

  return page ? `LDP ${page}` : `LDP ${order.courseTitle || "Website"}`;
}

function isDatabaseLeadId(value?: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? "").trim());
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "orders:create"),
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const body = (await request.json()) as {
      studentName?: string;
      email?: string;
      phone?: string;
      courseSlug?: string;
      courseSlugs?: string[];
      paymentPlan?: string;
      landingPage?: string;
      pageUrl?: string;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmId?: string;
      utmTerm?: string;
      campaignId?: string;
      campaignName?: string;
      adsetId?: string;
      adId?: string;
      adName?: string;
      fbclid?: string;
      fbp?: string;
      fbc?: string;
      leadId?: string;
    };
    const studentName = cleanText(body.studentName, 120);
    const email = cleanEmail(body.email);
    const phone = cleanPhone(body.phone);
    const courseSlug = cleanSlug(body.courseSlug);
    const courseSlugs = cleanSlugList(body.courseSlugs);
    const paymentPlan = cleanText(body.paymentPlan, 40);
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
    const ipAddress =
      request.headers.get("cf-connecting-ip") ?? forwardedFor.split(",")[0]?.trim() ?? "";
    const userAgent = request.headers.get("user-agent") ?? "";
    const incomingLeadId = cleanText(body.leadId, 120);
    const databaseLeadId = isDatabaseLeadId(incomingLeadId) ? incomingLeadId : "";
    const attribution = {
      utmSource: cleanText(body.utmSource, 120),
      utmMedium: cleanText(body.utmMedium, 120),
      utmCampaign: cleanText(body.utmCampaign, 160),
      utmContent: cleanText(body.utmContent, 160),
      utmId: cleanText(body.utmId, 160),
      utmTerm: cleanText(body.utmTerm, 160),
      campaignId: cleanText(body.campaignId, 120) || cleanText(body.utmId, 160),
      campaignName: cleanText(body.campaignName, 200) || cleanText(body.utmCampaign, 160),
      adsetId: cleanText(body.adsetId, 120),
      adId: cleanText(body.adId, 120),
      adName: cleanText(body.adName, 200),
      fbclid: cleanText(body.fbclid, 220),
      fbp: cleanText(body.fbp, 180),
      fbc: cleanText(body.fbc, 220),
      landingPage: cleanText(body.pageUrl, 500) || cleanText(body.landingPage, 160),
    };

    if (!studentName || !email || !phone || !isValidEmail(email) || !isValidPhone(phone)) {
      return NextResponse.json(
        { ok: false, message: "Thiếu thông tin tạo đơn thanh toán." },
        { status: 400 },
      );
    }

    if (!courseSlugs.length && (!courseSlug || !isValidSlug(courseSlug))) {
      return NextResponse.json(
        { ok: false, message: "Khóa học thanh toán không hợp lệ." },
        { status: 400 },
      );
    }

    const order = await createPaymentOrder({
      studentName,
      email,
      phone,
      courseSlug,
      courseSlugs,
      paymentPlan,
      leadId: databaseLeadId || null,
      attribution,
    });

    const remarketingNote = [
      `Mã đơn: ${order.orderCode}`,
      `Khóa: ${order.courseTitle}`,
      `Gói: ${paymentPlan || "default"}`,
      `Số tiền: ${order.amountLabel}`,
      `Trạng thái: ${order.status}`,
      `Landing: ${cleanText(body.landingPage, 120)}`,
      `URL: ${cleanText(body.pageUrl, 500)}`,
      `Referrer: ${cleanText(body.referrer, 500)}`,
      `UTM source: ${cleanText(body.utmSource, 120)}`,
      `UTM medium: ${cleanText(body.utmMedium, 120)}`,
      `UTM campaign: ${cleanText(body.utmCampaign, 160)}`,
      `UTM content: ${cleanText(body.utmContent, 160)}`,
      `UTM id: ${cleanText(body.utmId, 160)}`,
      `UTM term: ${cleanText(body.utmTerm, 160)}`,
      `campaign_id: ${attribution.campaignId}`,
      `campaign_name: ${attribution.campaignName}`,
      `adset_id: ${attribution.adsetId}`,
      `ad_id: ${attribution.adId}`,
      `ad_name: ${attribution.adName}`,
      `fbclid: ${attribution.fbclid}`,
      `IP: ${cleanText(ipAddress, 80)}`,
      `fbp: ${cleanText(body.fbp, 180)}`,
      `fbc: ${cleanText(body.fbc, 220)}`,
      `Lead ID: ${incomingLeadId}`,
    ].join("\n");

    const leadSource = determineLeadSource(order, body.landingPage);
    const leadSync = databaseLeadId
      ? await updateLeadAdmin(databaseLeadId, {
          name: studentName,
          email,
          phone,
          message: remarketingNote,
          source: leadSource,
          attribution,
        })
      : await createLeadAdmin({
          name: studentName,
          email,
          phone,
          message: remarketingNote,
          source: leadSource,
          attribution,
        });

    if (!leadSync.ok) {
      console.warn("[orders] Remarketing lead sync failed:", leadSync.error);
    }

    if (leadSync.ok && databaseLeadId) {
      const updatedLeadSheetSync = await syncLeadByIdToGoogleSheet(databaseLeadId);

      if (!updatedLeadSheetSync.ok && !updatedLeadSheetSync.skipped) {
        console.warn("[orders] Google Sheets lead update sync failed:", {
          reason: updatedLeadSheetSync.reason,
          status: updatedLeadSheetSync.status,
        });
      }
    }

    invalidateAdminModules(["orders", "leads", "students"]);

    let metaLead: { ok: boolean; skipped: boolean; reason?: string; status?: number } = {
      ok: true,
      skipped: true,
      reason: "not_sent",
    };

    try {
      metaLead = await sendMetaLeadEvent({
        orderCode: order.orderCode,
        studentName,
        email,
        phone,
        courseSlug: order.courseSlug,
        courseTitle: order.courseTitle,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        landingPage: cleanText(body.landingPage, 120),
        pageUrl: cleanText(body.pageUrl, 500),
        referrer: cleanText(body.referrer, 500),
        utmSource: cleanText(body.utmSource, 120),
        utmMedium: cleanText(body.utmMedium, 120),
        utmCampaign: cleanText(body.utmCampaign, 160),
        utmContent: cleanText(body.utmContent, 160),
        utmId: cleanText(body.utmId, 160),
        utmTerm: cleanText(body.utmTerm, 160),
        campaignId: attribution.campaignId,
        campaignName: attribution.campaignName,
        adsetId: attribution.adsetId,
        adId: attribution.adId,
        adName: attribution.adName,
        fbclid: attribution.fbclid,
        fbp: cleanText(body.fbp, 180),
        fbc: cleanText(body.fbc, 220),
        leadId: leadSync.ok ? leadSync.lead?.id ?? incomingLeadId : incomingLeadId,
        ipAddress,
        userAgent,
      });

      if (!metaLead.ok && !metaLead.skipped) {
        console.warn("[orders] Meta Lead event failed:", {
          reason: metaLead.reason,
          status: metaLead.status,
        });
      }
    } catch (metaError) {
      console.warn("[orders] Meta Lead event failed:", metaError);
    }

    try {
      const orderEmails = await sendOrderCreatedEmails(order);

      if (!orderEmails.admin.ok || !orderEmails.customer.ok) {
        console.warn("[orders] Order-created email failed:", orderEmails);
      }
    } catch (emailError) {
      console.warn("[orders] Order-created email failed:", emailError);
    }

    try {
      const telegram = await sendTelegramOrderNotification(order, "order_created");

      if (!telegram.ok && !telegram.skipped) {
        console.warn("[orders] Telegram order notification failed:", {
          reason: telegram.reason,
          status: telegram.status,
        });
      }
    } catch (telegramError) {
      console.warn("[orders] Telegram order notification failed:", telegramError);
    }

    try {
      const sheetSync = await syncOrderToGoogleSheet(order, {
        source: leadSource,
        landingPageUrl: cleanText(body.pageUrl, 500),
      });

      if (!sheetSync.ok && !sheetSync.skipped) {
        console.warn("[orders] Google Sheets order sync failed:", {
          reason: sheetSync.reason,
          status: sheetSync.status,
        });
      }
    } catch (sheetError) {
      console.warn("[orders] Google Sheets order sync failed:", sheetError);
    }

    return NextResponse.json({
      ok: true,
      order,
      leadId: leadSync.ok ? leadSync.lead?.id ?? null : null,
      ...(process.env.NODE_ENV === "development" ? { leadSync, metaLead } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không tạo được đơn thanh toán.",
      },
      { status: 500 },
    );
  }
}
