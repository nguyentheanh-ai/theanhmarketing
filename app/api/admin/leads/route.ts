import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { invalidateAdminModules } from "@/services/adminDataService";
import { createLeadAdmin } from "@/services/leadService";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:create"),
      limit: 60,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền tạo lead." }, { status: 403 });
      }
    }

    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      email?: string;
      message?: string;
      source?: string;
    };
    const name = cleanText(body.name, 120);
    const phone = cleanPhone(body.phone);
    const email = cleanEmail(body.email);
    const message = cleanText(body.message, 1000);
    const source = cleanText(body.source, 80) || "Admin";

    if (!name || !phone || !isValidPhone(phone) || (email && !isValidEmail(email))) {
      return NextResponse.json(
        { ok: false, message: "Thiếu tên, số điện thoại hoặc email không hợp lệ." },
        { status: 400 },
      );
    }

    const result = await createLeadAdmin({
      name,
      phone,
      email,
      message,
      source,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error ?? "Chưa lưu được lead." }, { status: 500 });
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({ ok: true, message: "Đã lưu lead vào Supabase." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không lưu được lead." },
      { status: 500 },
    );
  }
}
