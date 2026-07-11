import { NextResponse } from "next/server";
import { mapStudentActivityDto } from "@/lib/admin/student-activity";
import { canAccessAdminRole, getCurrentAuth } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { cleanEmail, isValidEmail } from "@/lib/security/validation";
import { getStudentActivityTimelineStrict } from "@/services/activityLogService";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function json(body: { ok: boolean; message?: string; logs?: ReturnType<typeof mapStudentActivityDto>[] }, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:activity"),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return json({ ok: false, message: "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." }, 429);
    }

    const { adminRole } = await getCurrentAuth();
    if (!canAccessAdminRole(adminRole, ["owner", "editor"])) {
      return json({ ok: false, message: "Anh/chị không có quyền xem lịch sử hoạt động học viên." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ ok: false, message: "Nội dung yêu cầu không hợp lệ." }, 400);
    }

    const email = cleanEmail((body as { email?: unknown }).email);
    if (!email || !isValidEmail(email)) {
      return json({ ok: false, message: "Email học viên không hợp lệ." }, 400);
    }

    const logs = await getStudentActivityTimelineStrict({ studentEmail: email, limit: 20 });
    return json({ ok: true, logs: logs.map(mapStudentActivityDto) });
  } catch {
    return json({ ok: false, message: "Không tải được lịch sử hoạt động học viên." }, 500);
  }
}
