import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { getAdminLeadActivities, invalidateAdminModules } from "@/services/adminDataService";

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimit({
      key: rateLimitKey(request, "admin:activities:recent"),
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.ok) return rateLimitResponse(rateLimit.resetAt);

    if (isAuthGuardEnabled() || process.env.NODE_ENV !== "development") {
      const { adminRole } = await getCurrentAuth();
      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền xem activity." }, { status: 403 });
      }
    }

    const url = new URL(request.url);
    if (url.searchParams.get("refresh") === "1") invalidateAdminModules(["activities"]);

    const activities = await getAdminLeadActivities();
    return NextResponse.json({ ok: true, activities, refreshedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không tải được activity." },
      { status: 500 },
    );
  }
}
