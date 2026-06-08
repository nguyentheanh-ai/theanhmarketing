import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanText } from "@/lib/security/validation";
import { getStudentActivityLogs } from "@/services/activityLogService";

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:activity-logs"),
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner", "editor"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền xem lịch sử hoạt động học viên." }, { status: 403 });
      }
    }

    const url = new URL(request.url);
    const logs = await getStudentActivityLogs({
      studentEmail: cleanEmail(url.searchParams.get("email")),
      leadId: cleanText(url.searchParams.get("leadId"), 120),
      userId: cleanText(url.searchParams.get("userId"), 120),
      limit: Number(url.searchParams.get("limit") ?? 25),
    });

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không tải được lịch sử hoạt động học viên." },
      { status: 500 },
    );
  }
}
