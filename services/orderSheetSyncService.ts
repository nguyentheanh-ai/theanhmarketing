import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncOrderToGoogleSheetWithActivity } from "@/lib/notifications/google-sheets-order-sync";
import { getPaymentOrders, type PaymentOrder } from "@/services/orderService";

type ActivityMetadata = {
  orderCode?: unknown;
};

export type OrderSheetBackfillResult = {
  ok: boolean;
  scanned: number;
  alreadySynced: number;
  attempted: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: Array<{ orderCode: string; error: string }>;
};

export type OrderSheetBackfillOptions = {
  limit?: number;
  force?: boolean;
};

function getOrderCodeFromMetadata(value: unknown) {
  const metadata = value as ActivityMetadata | null;
  const orderCode = metadata?.orderCode;
  return typeof orderCode === "string" ? orderCode.trim().toUpperCase() : "";
}

async function getOrderCodesWithSheetSuccess() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .select("metadata")
    .eq("event_type", "sheet_sync_success")
    .limit(10000);

  if (error || !data) {
    return new Set<string>();
  }

  return new Set(
    data
      .map((row) => getOrderCodeFromMetadata((row as { metadata?: unknown }).metadata))
      .filter(Boolean),
  );
}

function shouldRetryOrder(order: PaymentOrder, syncedOrderCodes: Set<string>, options: OrderSheetBackfillOptions) {
  if (options.force) {
    return true;
  }

  const orderCode = order.orderCode.trim().toUpperCase();
  return Boolean(orderCode) && !syncedOrderCodes.has(orderCode);
}

export async function resyncOrdersMissingGoogleSheetSuccess(
  options: OrderSheetBackfillOptions = {},
): Promise<OrderSheetBackfillResult> {
  const orders = await getPaymentOrders({ includeFallback: false });
  const syncedOrderCodes = await getOrderCodesWithSheetSuccess();
  const pendingOrders = orders.filter((order) => shouldRetryOrder(order, syncedOrderCodes, options));
  const rawLimit = Number.isFinite(options.limit) ? options.limit : undefined;
  const resolvedLimit = options.force
    ? (rawLimit ?? pendingOrders.length)
    : Math.max(1, Math.min(rawLimit ?? 25, 500));
  const retryOrders = pendingOrders.slice(0, Math.max(0, Math.min(resolvedLimit, 10000)));
  const result: OrderSheetBackfillResult = {
    ok: true,
    scanned: orders.length,
    alreadySynced: options.force ? Math.max(0, orders.length - pendingOrders.length) : orders.length - pendingOrders.length,
    attempted: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const order of retryOrders) {
    result.attempted += 1;

    const sheetSync = await syncOrderToGoogleSheetWithActivity(order, {
      source: "Google Sheet required backfill",
    });

    if (sheetSync.ok && !sheetSync.skipped) {
      result.synced += 1;
    } else if (sheetSync.skipped) {
      result.skipped += 1;
    } else {
      result.failed += 1;
      result.errors.push({
        orderCode: order.orderCode,
        error: sheetSync.reason ?? "Google Sheet sync failed",
      });
    }
  }

  result.ok = result.failed === 0;
  return result;
}
