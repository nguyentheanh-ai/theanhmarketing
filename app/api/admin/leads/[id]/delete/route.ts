import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanText } from "@/lib/security/validation";
import { softDeleteLead } from "@/services/adminDeletionService";
import { invalidateAdminModules } from "@/services/adminDataService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:delete"),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền xóa lead." }, { status: 403 });
      }
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = cleanText(body.reason, 300) || "Admin ẩn lead khỏi giao diện, giữ 30 ngày trước khi purge.";

    if (!id) {
      return NextResponse.json({ ok: false, message: "Thiếu lead cần xóa." }, { status: 400 });
    }

    const result = await softDeleteLead(id, reason);

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error ?? "Chưa xóa được lead." }, { status: 500 });
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({
      ok: true,
      message: "Đã ẩn lead khỏi giao diện. Dữ liệu được giữ 30 ngày trước khi purge tự động.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không xóa được lead." },
      { status: 500 },
    );
  }
}
