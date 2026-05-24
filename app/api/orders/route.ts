import { NextResponse } from "next/server";
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
import { sendOrderCreatedEmails } from "@/lib/notifications/pending-payment-email";
import { createLeadAdmin } from "@/services/leadService";
import { createPaymentOrder } from "@/services/orderService";

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
      utmTerm?: string;
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
      `UTM term: ${cleanText(body.utmTerm, 160)}`,
      `IP: ${cleanText(ipAddress, 80)}`,
      `fbp: ${cleanText(body.fbp, 180)}`,
      `fbc: ${cleanText(body.fbc, 220)}`,
      `Lead ID: ${cleanText(body.leadId, 120)}`,
    ].join("\n");

    const leadSync = await createLeadAdmin({
      name: studentName,
      email,
      phone,
      message: remarketingNote,
      source: "LDP Facebook Ads Master 2026",
    });

    if (!leadSync.ok) {
      console.warn("[orders] Remarketing lead sync failed:", leadSync.error);
    }

    try {
      const orderEmails = await sendOrderCreatedEmails(order);

      if (!orderEmails.admin.ok || !orderEmails.customer.ok) {
        console.warn("[orders] Order-created email failed:", orderEmails);
      }
    } catch (emailError) {
      console.warn("[orders] Order-created email failed:", emailError);
    }

    return NextResponse.json({
      ok: true,
      order,
      ...(process.env.NODE_ENV === "development" ? { leadSync } : {}),
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
