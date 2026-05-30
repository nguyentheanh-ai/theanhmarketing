import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { createLeadAdmin } from "@/services/leadService";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:students:delete"),
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền xóa học viên." }, { status: 403 });
      }
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      phone?: string;
    };
    const email = cleanEmail(body.email);
    const phone = cleanPhone(body.phone);
    const name = cleanText(body.name, 120) || email || phone || "Học viên";

    if ((!email || !isValidEmail(email)) && (!phone || !isValidPhone(phone))) {
      return NextResponse.json({ ok: false, message: "Thiếu email hoặc số điện thoại hợp lệ để xóa học viên." }, { status: 400 });
    }

    const result = await createLeadAdmin({
      name,
      email,
      phone,
      source: "admin-student-delete",
      message: [
        "Xóa học viên khỏi danh sách quản lý",
        "Đơn hàng đã thanh toán vẫn được giữ để đối soát.",
        `Email: ${email || "-"}`,
        `Phone: ${phone || "-"}`,
      ].join("\n"),
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: `Chưa xóa được học viên: ${result.error}` }, { status: 500 });
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({
      ok: true,
      message: "Đã xóa học viên khỏi danh sách quản lý. Lịch sử đơn hàng vẫn được giữ để đối soát.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không xóa được học viên." },
      { status: 500 },
    );
  }
}
