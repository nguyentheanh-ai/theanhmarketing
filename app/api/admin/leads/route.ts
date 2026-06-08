import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { cleanEmail, cleanPhone, cleanText, isValidEmail, isValidPhone } from "@/lib/security/validation";
import { getAdminLeads, invalidateAdminModules } from "@/services/adminDataService";
import { recordLeadActivity } from "@/services/leadActivityService";
import { createLeadAdmin } from "@/services/leadService";

async function requireOwner() {
  if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
    const { adminRole } = await getCurrentAuth();

    if (!canAccessAdminRole(adminRole, ["owner"])) {
      return false;
    }
  }

  return true;
}

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:list"),
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (!(await requireOwner())) {
      return NextResponse.json({ ok: false, message: "Bạn không có quyền xem lead." }, { status: 403 });
    }

    const url = new URL(request.url);

    if (url.searchParams.get("force_refresh") === "1") {
      invalidateAdminModules(["leads"]);
    }

    const leads = await getAdminLeads();

    return NextResponse.json({ ok: true, leads, refreshedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không tải được lead." },
      { status: 500 },
    );
  }
}

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

    if (!(await requireOwner())) {
      return NextResponse.json({ ok: false, message: "Bạn không có quyền tạo lead." }, { status: 403 });
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

    await recordLeadActivity({
      leadId: result.lead?.id ?? null,
      activityType: "lead_created",
      title: `${result.lead?.name || name} đã được thêm vào hệ thống lead`,
      description: message || source,
      metadata: { source },
    });
    invalidateAdminModules(["leads", "students", "activities"]);

    return NextResponse.json({
      ok: true,
      message: "Đã lưu lead vào Supabase.",
      lead: result.lead,
      sheetSync: result.sheetSync,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không lưu được lead." },
      { status: 500 },
    );
  }
}
