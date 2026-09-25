import { NextResponse } from "next/server";

import { logSecurityEvent } from "@/lib/security/audit-log";
import { invalidateAdminModules } from "@/services/adminDataService";
import { expirePendingPaymentOrders } from "@/services/orderService";

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
    logSecurityEvent({ action: "expire_orders_bad_cron_secret", request });
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const expiredOrders = await expirePendingPaymentOrders();
    if (expiredOrders.length > 0) {
      invalidateAdminModules(["orders"]);
    }

    return NextResponse.json({
      ok: true,
      expired: expiredOrders.length,
      // Customer reminders are sent only by the morning queue.
      emails: [],
    });
  } catch (error) {
    logSecurityEvent({
      action: "expire_orders_failed",
      request,
      detail: { reason: error instanceof Error ? error.message : "unknown" },
    });

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Không xử lý được đơn hết hạn.",
      },
      { status: 500 },
    );
  }
}
