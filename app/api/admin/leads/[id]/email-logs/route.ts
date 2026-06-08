import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { getLeadEmailLogs } from "@/services/leadService";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:email-logs"),
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền xem log email lead." }, { status: 403 });
      }
    }

    const { id } = await params;
    const logs = await getLeadEmailLogs(id);

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không tải được log email." },
      { status: 500 },
    );
  }
}
