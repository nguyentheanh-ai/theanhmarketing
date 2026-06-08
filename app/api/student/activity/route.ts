import { NextResponse } from "next/server";
import { getCurrentAuth } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanText } from "@/lib/security/validation";
import { logStudentActivity, type ActivityEventType } from "@/services/activityLogService";

const allowedStudentEvents = new Set<ActivityEventType>(["student_login_success", "password_changed", "password_reset_completed"]);

function getRequestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "student:activity"),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

    const { user } = await getCurrentAuth();

    if (!user?.email) {
      return NextResponse.json({ ok: false, message: "Bạn cần đăng nhập để ghi nhận hoạt động." }, { status: 401 });
    }

    const body = (await request.json()) as { eventType?: string; title?: string; description?: string; metadata?: Record<string, unknown> };
    const eventType = cleanText(body.eventType, 80) as ActivityEventType;

    if (!allowedStudentEvents.has(eventType)) {
      return NextResponse.json({ ok: false, message: "Loại hoạt động không hợp lệ." }, { status: 400 });
    }

    const result = await logStudentActivity({
      userId: user.id,
      studentEmail: user.email,
      eventType,
      eventTitle: cleanText(body.title, 220) || (eventType === "student_login_success" ? "Học viên đăng nhập thành công" : "Học viên cập nhật mật khẩu"),
      eventDescription: cleanText(body.description, 1000) || null,
      status: "success",
      actorType: "student",
      actorId: user.id,
      actorEmail: user.email,
      metadata: body.metadata ?? {},
      ipAddress: getRequestIp(request),
      userAgent: request.headers.get("user-agent"),
      dedupeWindowMinutes: eventType === "student_login_success" ? 15 : 0,
    });

    return NextResponse.json({ ok: result.ok, skipped: result.skipped ?? false });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không ghi nhận được hoạt động học viên." },
      { status: 500 },
    );
  }
}
