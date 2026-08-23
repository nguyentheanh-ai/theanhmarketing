import { NextResponse } from "next/server";
import { sendCheckoutEntryNotifications } from "@/services/checkoutNotificationService";
import { createAgentKitRemainingPaymentOrders } from "@/services/orderService";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Không có quyền truy cập." }, { status: 401 });
  }

  try {
    const result = await createAgentKitRemainingPaymentOrders();
    let notified = 0;
    let notificationErrors = 0;

    for (const order of result.created) {
      const notification = await sendCheckoutEntryNotifications(order);
      if (notification.ok) notified += 1;
      else notificationErrors += 1;
    }

    return NextResponse.json({
      ok: notificationErrors === 0,
      phase: result.phase,
      created: result.created.length,
      skipped: result.skipped,
      notified,
      notificationErrors,
    });
  } catch (error) {
    console.error("[agent-kit-preorder-launch] worker failed", error);
    return NextResponse.json({ ok: false, message: "Không xử lý được đợt mở bán preorder." }, { status: 500 });
  }
}
