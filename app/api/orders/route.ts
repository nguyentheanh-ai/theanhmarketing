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
    };
    const studentName = cleanText(body.studentName, 120);
    const email = cleanEmail(body.email);
    const phone = cleanPhone(body.phone);
    const courseSlug = cleanSlug(body.courseSlug);
    const courseSlugs = cleanSlugList(body.courseSlugs);
    const paymentPlan = cleanText(body.paymentPlan, 40);

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
