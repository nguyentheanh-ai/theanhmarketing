import { NextResponse } from "next/server";

import { sendPaymentFailedEmail } from "@/lib/notifications/payment-success-email";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { expirePendingPaymentOrders, markPaymentEmailError } from "@/services/orderService";

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
    const emails = await Promise.all(
      expiredOrders.map(async (order) => {
        const result = await sendPaymentFailedEmail(order);

        if (!result.ok) {
          await markPaymentEmailError(
            order.orderCode,
            result.reason ?? "Could not send expired payment email.",
          );
        }

        return {
          orderCode: order.orderCode,
          ok: result.ok,
          skipped: result.skipped,
          reason: result.reason,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      expired: expiredOrders.length,
      emails,
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
