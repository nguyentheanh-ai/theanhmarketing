import { NextResponse } from "next/server";
import {
  sendRegistrationNotification,
  type RegistrationNotificationInput,
} from "@/lib/notifications/registration-email";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import {
  cleanEmail,
  cleanPhone,
  cleanText,
  isValidEmail,
  isValidPhone,
} from "@/lib/security/validation";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "notifications:registration"),
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const body = (await request.json()) as Partial<RegistrationNotificationInput>;
    const payload: RegistrationNotificationInput = {
      studentName: cleanText(body.studentName, 120),
      phone: cleanPhone(body.phone),
      email: cleanEmail(body.email),
      courseTitle: cleanText(body.courseTitle, 180),
      registeredAt: body.registeredAt ? cleanText(body.registeredAt, 80) : new Date().toISOString(),
      source: body.source ? cleanText(body.source, 80) : "Website",
    };

    if (
      !payload.studentName ||
      !payload.phone ||
      !payload.email ||
      !payload.courseTitle ||
      !isValidEmail(payload.email) ||
      !isValidPhone(payload.phone)
    ) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên học viên, SĐT, email hoặc khóa đăng ký." },
        { status: 400 },
      );
    }

    const result = await sendRegistrationNotification(payload);

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.reason ?? "Không gửi được email thông báo." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, skipped: result.skipped });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không gửi được email thông báo.",
      },
      { status: 500 },
    );
  }
}
