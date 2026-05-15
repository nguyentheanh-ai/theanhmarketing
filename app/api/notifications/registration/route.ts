import { NextResponse } from "next/server";
import {
  sendRegistrationNotification,
  type RegistrationNotificationInput,
} from "@/lib/notifications/registration-email";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegistrationNotificationInput>;
    const payload: RegistrationNotificationInput = {
      studentName: String(body.studentName ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
      email: String(body.email ?? "").trim(),
      courseTitle: String(body.courseTitle ?? "").trim(),
      registeredAt: body.registeredAt ? String(body.registeredAt) : new Date().toISOString(),
      source: body.source ? String(body.source) : "Website",
    };

    if (!payload.studentName || !payload.phone || !payload.email || !payload.courseTitle) {
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
