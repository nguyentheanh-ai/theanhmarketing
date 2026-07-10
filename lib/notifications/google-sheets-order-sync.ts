import { syncOrderToGoogleSheet } from "@/lib/notifications/google-sheets";
import { logStudentActivity } from "@/services/activityLogService";
import type { PaymentOrder } from "@/services/orderService";

type OrderSheetSyncOptions = {
  source: string;
  landingPageUrl?: string;
};

function describeSheetSyncFailure(result: Awaited<ReturnType<typeof syncOrderToGoogleSheet>>) {
  if (result.reason) {
    return result.reason;
  }

  if (result.skipped) {
    return "Google Sheets sync skipped.";
  }

  return "Google Sheets order sync failed.";
}

export async function syncOrderToGoogleSheetWithActivity(order: PaymentOrder, options: OrderSheetSyncOptions) {
  try {
    const result = await syncOrderToGoogleSheet(order, options);

    if (result.ok && !result.skipped) {
      await logStudentActivity({
        studentEmail: order.email,
        studentPhone: order.phone,
        eventType: "sheet_sync_success",
        eventTitle: "Da dong bo Google Sheet don hang",
        eventDescription: `Don ${order.orderCode} da duoc gui sang Google Sheet.`,
        status: "success",
        actorType: "system",
        metadata: {
          orderCode: order.orderCode,
          source: options.source,
          status: result.status ?? null,
          webhookHost: result.webhookHost ?? null,
        },
      });
      return result;
    }

    const reason = describeSheetSyncFailure(result);

    console.warn("[orders] Google Sheets order sync failed:", {
      reason,
      status: result.status,
      skipped: result.skipped,
      webhookHost: result.webhookHost,
    });
    await logStudentActivity({
      studentEmail: order.email,
      studentPhone: order.phone,
      eventType: "sheet_sync_failed",
      eventTitle: "Dong bo Google Sheet don hang that bai",
      eventDescription: reason,
      status: "failed",
      actorType: "system",
      metadata: {
        orderCode: order.orderCode,
        source: options.source,
        status: result.status ?? null,
        skipped: result.skipped,
        webhookHost: result.webhookHost ?? null,
      },
    });

    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Google Sheets order sync failed.";

    console.warn("[orders] Google Sheets order sync failed:", error);
    await logStudentActivity({
      studentEmail: order.email,
      studentPhone: order.phone,
      eventType: "sheet_sync_failed",
      eventTitle: "Dong bo Google Sheet don hang that bai",
      eventDescription: reason,
      status: "failed",
      actorType: "system",
      metadata: {
        orderCode: order.orderCode,
        source: options.source,
      },
    });

    return { ok: false, skipped: false, reason };
  }
}
