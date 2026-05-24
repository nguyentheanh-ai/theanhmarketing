import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { sendOrderCreatedEmails } from "@/lib/notifications/pending-payment-email";
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
import { createPaymentOrder } from "@/services/orderService";

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

    try {
      const orderEmails = await sendOrderCreatedEmails(order);

      if (!orderEmails.admin.ok || !orderEmails.customer.ok) {
        console.warn("[orders] Order-created email failed:", orderEmails);
      }
    } catch (emailError) {
      console.warn("[orders] Order-created email failed:", emailError);
    }

    return NextResponse.json({ ok: true, order });
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
