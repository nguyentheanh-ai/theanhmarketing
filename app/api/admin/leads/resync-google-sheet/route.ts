import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/security/rate-limit";
import { invalidateAdminModules } from "@/services/adminDataService";
import { resyncUnsyncedLeadsToGoogleSheet } from "@/services/leadService";

function isCronAuthorized(request: Request) {
  const authorization = request.headers.get("authorization");
  return Boolean(process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`);
}

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

    if (!isCronAuthorized(request) && (isAuthGuardEnabled() || process.env.NODE_ENV !== "development")) {
      const { adminRole } = await getCurrentAuth();

      if (!canAccessAdminRole(adminRole, ["owner"])) {
        return NextResponse.json({ ok: false, message: "Bạn không có quyền resync Google Sheet." }, { status: 403 });
      }
    }

    let requestBody: Record<string, unknown> = {};
    try {
      requestBody = (await request.json()) as Record<string, unknown>;
    } catch {
      requestBody = {};
    }

    const url = new URL(request.url);
    const limitFromQuery = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const forceFromQuery = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const requestedLimit = Number.isFinite(limitFromQuery) ? limitFromQuery : Number.parseInt(String(requestBody.limit ?? ""), 10);
    const force = forceFromQuery || requestBody.force === true || requestBody.force === "true";
    const result = await resyncUnsyncedLeadsToGoogleSheet({
      limit: Number.isFinite(requestedLimit) ? requestedLimit : undefined,
      force,
    });
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
