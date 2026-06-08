import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { resyncUnsyncedLeadsToGoogleSheet } from "@/services/leadService";

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:leads:resync-google-sheet"),
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền resync Google Sheet." }, { status: 403 });
      }
    }

    const result = await resyncUnsyncedLeadsToGoogleSheet();
    invalidateAdminModules(["leads"]);

    return NextResponse.json({
      ok: result.failed === 0,
      message: `Đã sync ${result.synced} lead, bỏ qua ${result.skipped}, lỗi ${result.failed}.`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không resync được Google Sheet." },
      { status: 500 },
    );
  }
}
