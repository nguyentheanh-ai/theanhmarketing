import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { sendMetaLeadEvent } from "@/lib/meta/conversions-api";
import { syncOrderToGoogleSheet } from "@/lib/notifications/google-sheets";
import { sendOrderCreatedEmails } from "@/lib/notifications/pending-payment-email";
import { sendTelegramOrderNotification } from "@/lib/notifications/telegram";
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
    });

    invalidateAdminModules(["orders", "students"]);

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
        phone: phone || "",
        courseSlug: order.courseSlug,
        courseTitle: order.courseTitle,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        pageUrl: `${siteConfig.url}/gio-hang`,
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
