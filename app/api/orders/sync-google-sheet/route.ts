import { NextResponse } from "next/server";

import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { invalidateAdminModules } from "@/services/adminDataService";
import { resyncOrdersMissingGoogleSheetSuccess } from "@/services/orderSheetSyncService";

export const runtime = "nodejs";

function isCronAuthorized(request: Request) {
  if (process.env.NODE_ENV === "development" && !process.env.CRON_SECRET) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return Boolean(process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(request: Request) {
  const hasCronAuth = isCronAuthorized(request);
  const isProduction = process.env.NODE_ENV === "production";
  const isProtected = isAuthGuardEnabled() || isProduction;

  if (!hasCronAuth && isProtected) {
    const { adminRole } = await getCurrentAuth();
    if (!canAccessAdminRole(adminRole, ["owner"])) {
      logSecurityEvent({ action: "orders_google_sheet_sync_unauthorized", request });
      return NextResponse.json({ ok: false, message: "Bạn không có quyền chạy sync Google Sheet." }, { status: 403 });
    }
  }

  try {
    const url = new URL(request.url);
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";

    const result = await resyncOrdersMissingGoogleSheetSuccess({
      limit: Number.isFinite(requestedLimit) ? requestedLimit : undefined,
      force,
    });

    if (result.attempted > 0) {
      invalidateAdminModules(["orders", "leads", "activities"]);
    }

    return NextResponse.json(result);
  } catch (error) {
    logSecurityEvent({
      action: "orders_google_sheet_sync_failed",
      request,
      detail: { reason: error instanceof Error ? error.message : "unknown" },
    });

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Khong sync duoc don hang sang Google Sheet.",
      },
      { status: 500 },
    );
  }
}
