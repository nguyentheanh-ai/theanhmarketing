import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { invalidateAdminModules } from "@/services/adminDataService";
import { purgeExpiredAdminDeletes } from "@/services/adminDeletionService";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  if (process.env.NODE_ENV === "development" && !process.env.CRON_SECRET) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return Boolean(process.env.CRON_SECRET && authorization === `Bearer ${process.env.CRON_SECRET}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logSecurityEvent({ action: "admin_purge_deleted_bad_cron_secret", request });
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await purgeExpiredAdminDeletes();

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error ?? "Không purge được dữ liệu đã xóa." }, { status: 500 });
    }

    invalidateAdminModules(["leads", "students"]);

    return NextResponse.json({
      ok: true,
      purgedLeads: result.purgedLeads,
      purgedStudents: result.purgedStudents,
      deletedAuthUsers: result.deletedAuthUsers,
    });
  } catch (error) {
    logSecurityEvent({
      action: "admin_purge_deleted_failed",
      request,
      detail: { reason: error instanceof Error ? error.message : "unknown" },
    });

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Không purge được dữ liệu đã xóa." },
      { status: 500 },
    );
  }
}
