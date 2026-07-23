import { after, NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { sendMetaInitiateCheckoutEvent, sendMetaLeadEvent } from "@/lib/meta/conversions-api";
import { syncOrderToGoogleSheetWithActivity } from "@/lib/notifications/google-sheets-order-sync";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
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
import { invalidateAdminModules } from "@/services/adminDataService";
import { createPaymentOrder } from "@/services/orderService";
import { siteConfig } from "@/data/site";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "orders:from-session"),
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const auth = await getCurrentAuth();
    const user = auth.user;

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Bạn cần đăng nhập trước khi thanh toán." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      courseSlug?: string;
      courseSlugs?: string[];
      attribution?: {
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
        landingPage?: string;
      };
    };

    const studentName =
      cleanText(user.user_metadata?.full_name, 120) || cleanEmail(user.email) || "Học viên";
    const email = cleanEmail(user.email);
    const phone = cleanPhone(user.user_metadata?.phone);
    const courseSlug = cleanSlug(body.courseSlug);
    const courseSlugs = cleanSlugList(body.courseSlugs);
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
    const ipAddress =
      request.headers.get("cf-connecting-ip") ?? forwardedFor.split(",")[0]?.trim() ?? "";
    const userAgent = request.headers.get("user-agent") ?? "";
    const attribution = {
      utmSource: cleanText(body.attribution?.utmSource, 120),
      utmMedium: cleanText(body.attribution?.utmMedium, 120),
      utmCampaign: cleanText(body.attribution?.utmCampaign, 160),
      utmContent: cleanText(body.attribution?.utmContent, 160),
      utmId: cleanText(body.attribution?.utmId, 160),
      utmTerm: cleanText(body.attribution?.utmTerm, 160),
      campaignId:
        cleanText(body.attribution?.campaignId, 120) || cleanText(body.attribution?.utmId, 160),
      campaignName:
        cleanText(body.attribution?.campaignName, 200) ||
        cleanText(body.attribution?.utmCampaign, 160),
      adsetId: cleanText(body.attribution?.adsetId, 120),
      adId: cleanText(body.attribution?.adId, 120),
      adName: cleanText(body.attribution?.adName, 200),
      fbclid: cleanText(body.attribution?.fbclid, 220),
      fbp: cleanText(body.attribution?.fbp, 180),
      fbc: cleanText(body.attribution?.fbc, 220),
      landingPage: cleanText(body.attribution?.landingPage, 500),
    };

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, message: "Tài khoản chưa có email hợp lệ để tạo đơn thanh toán." },
        { status: 400 },
      );
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { ok: false, message: "Số điện thoại trong tài khoản chưa hợp lệ." },
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
      phone: phone || "Chưa cập nhật",
      courseSlug,
      courseSlugs,
      attribution,
    });

    invalidateAdminModules(["orders", "students"]);

    let metaLead: { ok: boolean; skipped: boolean; reason?: string; status?: number } = {
      ok: true,
      skipped: true,
      reason: "scheduled_after_response",
    };

    after(async () => {
      try {
        metaLead = await sendMetaLeadEvent({
          orderCode: order.orderCode,
          studentName,
          email,
          phone: phone || "",
          courseSlug: order.courseSlug,
          courseTitle: order.courseTitle,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          pageUrl: `${siteConfig.url}/gio-hang`,
          landingPage: attribution.landingPage,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          utmContent: attribution.utmContent,
          utmId: attribution.utmId,
          utmTerm: attribution.utmTerm,
          campaignId: attribution.campaignId,
          campaignName: attribution.campaignName,
          adsetId: attribution.adsetId,
          adId: attribution.adId,
          adName: attribution.adName,
          fbclid: attribution.fbclid,
          fbp: attribution.fbp,
          fbc: attribution.fbc,
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
        const metaCheckout = await sendMetaInitiateCheckoutEvent({
          eventId: order.orderCode,
          orderCode: order.orderCode,
          studentName,
          email,
          phone: phone || "",
          courseSlug: order.courseSlug,
          courseTitle: order.courseTitle,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          pageUrl: `${siteConfig.url}/gio-hang`,
          landingPage: attribution.landingPage,
          utmSource: attribution.utmSource,
          utmMedium: attribution.utmMedium,
          utmCampaign: attribution.utmCampaign,
          utmContent: attribution.utmContent,
          utmId: attribution.utmId,
          utmTerm: attribution.utmTerm,
          campaignId: attribution.campaignId,
          campaignName: attribution.campaignName,
          adsetId: attribution.adsetId,
          adId: attribution.adId,
          adName: attribution.adName,
          fbclid: attribution.fbclid,
          fbp: attribution.fbp,
          fbc: attribution.fbc,
          ipAddress,
          userAgent,
        });

        if (!metaCheckout.ok && !metaCheckout.skipped) {
          console.warn("[orders] Meta InitiateCheckout event failed:", {
            reason: metaCheckout.reason,
            status: metaCheckout.status,
          });
        }
      } catch (metaError) {
        console.warn("[orders] Meta InitiateCheckout event failed:", metaError);
      }

      try {
        const sheetSync = await syncOrderToGoogleSheetWithActivity(order, {
          source: "Logged-in checkout",
          landingPageUrl: `${siteConfig.url}/gio-hang`,
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
    });

    return NextResponse.json({
      ok: true,
      order,
      ...(process.env.NODE_ENV === "development" ? { metaLead } : {}),
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
