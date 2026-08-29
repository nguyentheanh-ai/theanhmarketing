import { sendTelegramTextMessage, type TelegramSendResult } from "@/lib/notifications/telegram";
import {
  buildTelegramReportWindow,
  type TelegramBusinessReportSlot,
  type TelegramBusinessReportWindow,
} from "@/lib/reports/telegram-business-day";
import {
  aggregateProductMetrics,
  buildTelegramAdAccountSummaryMessage,
  buildMonthToDateWindow,
  buildSevenDayWindow,
  buildTelegramProductReportMessages,
  type CampaignSpendInput,
  type AccountPerformanceInput,
  type IsoWindow,
  type ProductOrderInput,
} from "@/lib/reports/telegram-product-report";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdsResult =
  | { available: true; campaigns: CampaignSpendInput[]; accounts?: AccountPerformanceInput[] }
  | { available: false; campaigns: []; reason?: string; accounts?: AccountPerformanceInput[] };
type ClaimInput = TelegramBusinessReportWindow & { runKey: string };
type FinishInput = { runKey: string; leaseToken: string; outcome: "sent" | "failed"; reason?: string };
type SnapshotRow = {
  entity_level: "account" | "campaign";
  entity_id: string;
  entity_name: string | null;
  local_start_at: string;
  spend: number | string;
  impressions?: number | string;
  clicks?: number | string;
  purchases?: number | string;
  purchase_value?: number | string;
  data_status: "final" | "partial" | "missing";
};

const REPORT_AD_ACCOUNTS = [
  { accountId: "1255736315302940", accountName: "Greezhub 01" },
  { accountId: "1103665698635605", accountName: "TAM01" },
] as const;
const PRODUCT_REPORT_AD_ACCOUNT_ID = "1255736315302940";
const HOUR_MS = 60 * 60 * 1000;

export type TelegramBusinessReportDependencies = {
  readPaidOrders: (window: IsoWindow) => Promise<ProductOrderInput[]>;
  readAds: (window: IsoWindow) => Promise<AdsResult>;
  claim: (input: ClaimInput) => Promise<{ claimed: boolean; leaseToken?: string }>;
  finish: (input: FinishInput) => Promise<{ ok: boolean }>;
  send: (text: string) => Promise<TelegramSendResult>;
};

function safeReason(error: unknown, fallback: string) {
  const value = error instanceof Error ? error.message : String(error ?? "");
  return (value.trim() || fallback).slice(0, 800);
}

function itemProductName(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = row.product_name ?? row.title ?? row.name;
    if (typeof label === "string" && label.trim()) return label.trim();
  }
  return undefined;
}

async function readPaidOrders(window: IsoWindow): Promise<ProductOrderInput[]> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Canonical paid-order source is unavailable.");

  const orders: ProductOrderInput[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("orders")
      .select("amount,course_slug,course_title,order_items")
      .eq("status", "paid")
      .gte("paid_at", window.startIso)
      .lt("paid_at", window.endIso)
      .order("paid_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not read paid orders: ${error.message}`);
    const rows = (data ?? []).map((row) => ({
      amount: Number(row.amount ?? 0),
      courseSlug: row.course_slug,
      courseTitle: row.course_title,
      productName: itemProductName(row.order_items),
    })).filter((row) => Number.isFinite(row.amount));
    orders.push(...rows);
    if (rows.length < pageSize) break;
  }
  return orders;
}

function snapshotUnavailable(reason: string): AdsResult {
  return { available: false, campaigns: [], reason };
}

function aggregateAccountPerformance(
  rows: SnapshotRow[],
  window: IsoWindow,
  account: (typeof REPORT_AD_ACCOUNTS)[number],
): AccountPerformanceInput {
  const startMs = new Date(window.startIso).getTime();
  const endMs = new Date(window.endIso).getTime();
  const expectedHours = (endMs - startMs) / HOUR_MS;
  const accountRows = rows.filter((row) => row.entity_level === "account");
  if (!Number.isInteger(expectedHours) || expectedHours <= 0 || accountRows.length !== expectedHours) {
    return { ...account, available: false, reason: `Snapshot MCP thiếu giờ tài khoản (${accountRows.length}/${expectedHours}).` };
  }
  if (accountRows.some((row) => row.data_status !== "final")) {
    return { ...account, available: false, reason: "Snapshot MCP còn trạng thái partial hoặc missing." };
  }
  const byHour = new Map(accountRows.map((row) => [row.local_start_at, row]));
  for (let hour = startMs; hour < endMs; hour += HOUR_MS) {
    if (!byHour.has(new Date(hour).toISOString())) return { ...account, available: false, reason: "Snapshot MCP không phủ liên tục toàn bộ kỳ." };
  }
  const total = (field: "spend" | "impressions" | "clicks" | "purchases" | "purchase_value") =>
    accountRows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);
  return {
    ...account,
    available: true,
    spend: total("spend"),
    impressions: total("impressions"),
    clicks: total("clicks"),
    purchases: total("purchases"),
    purchaseValue: total("purchase_value"),
  };
}

export function validateAndAggregateSnapshots(rows: SnapshotRow[], window: IsoWindow): AdsResult {
  const startMs = new Date(window.startIso).getTime();
  const endMs = new Date(window.endIso).getTime();
  const expectedHours = (endMs - startMs) / HOUR_MS;
  if (!Number.isInteger(expectedHours) || expectedHours <= 0) return snapshotUnavailable("Kỳ Ads không nằm trên ranh giới giờ hợp lệ.");

  const accountRows = rows.filter((row) => row.entity_level === "account");
  const campaignRows = rows.filter((row) => row.entity_level === "campaign");
  if (accountRows.length !== expectedHours) return snapshotUnavailable(`Snapshot MCP thiếu giờ tài khoản (${accountRows.length}/${expectedHours}).`);
  if (rows.some((row) => row.data_status !== "final")) return snapshotUnavailable("Snapshot MCP còn trạng thái partial hoặc missing.");

  const accountByHour = new Map<string, number>();
  for (const row of accountRows) {
    if (accountByHour.has(row.local_start_at)) return snapshotUnavailable("Snapshot MCP bị trùng giờ tài khoản.");
    accountByHour.set(row.local_start_at, Number(row.spend ?? 0));
  }
  for (let hour = startMs; hour < endMs; hour += HOUR_MS) {
    if (!accountByHour.has(new Date(hour).toISOString())) return snapshotUnavailable("Snapshot MCP không phủ liên tục toàn bộ kỳ.");
  }

  const accountSpend = [...accountByHour.values()].reduce((sum, spend) => sum + spend, 0);
  const campaignSpend = campaignRows.reduce((sum, row) => sum + Number(row.spend ?? 0), 0);
  const reconciliationTolerance = Math.max(2, accountSpend * 0.005);
  if (Math.abs(campaignSpend - accountSpend) > reconciliationTolerance) {
    return snapshotUnavailable("Tổng campaign MCP chưa khớp tổng tài khoản trong kỳ.");
  }

  const campaignTotals = new Map<string, number>();
  for (const row of campaignRows) {
    const name = row.entity_name?.trim() || `Campaign ${row.entity_id}`;
    campaignTotals.set(name, (campaignTotals.get(name) ?? 0) + Number(row.spend ?? 0));
  }
  return {
    available: true,
    campaigns: [...campaignTotals].map(([campaignName, spend]) => ({ campaignName, spend })),
  };
}

async function readAds(window: IsoWindow): Promise<AdsResult> {
  const client = createSupabaseAdminClient();
  if (!client) return snapshotUnavailable("Nguồn snapshot MCP không khả dụng.");

  const rows: SnapshotRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("telegram_meta_campaign_hourly_snapshots")
      .select("ad_account_id,entity_level,entity_id,entity_name,local_start_at,spend,impressions,clicks,purchases,purchase_value,data_status")
      .in("ad_account_id", REPORT_AD_ACCOUNTS.map((account) => account.accountId))
      .gte("local_start_at", window.startIso)
      .lt("local_start_at", window.endIso)
      .order("local_start_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return snapshotUnavailable(`Không đọc được snapshot MCP: ${error.message}`);
    rows.push(...((data ?? []) as SnapshotRow[]));
    if ((data ?? []).length < pageSize) break;
  }
  const accounts = REPORT_AD_ACCOUNTS.map((account) => aggregateAccountPerformance(
    rows.filter((row) => (row as SnapshotRow & { ad_account_id?: string }).ad_account_id === account.accountId),
    window,
    account,
  ));
  const product = validateAndAggregateSnapshots(
    rows.filter((row) => (row as SnapshotRow & { ad_account_id?: string }).ad_account_id === PRODUCT_REPORT_AD_ACCOUNT_ID),
    window,
  );
  return product.available
    ? { ...product, accounts }
    : { ...product, accounts };
}

async function claim(input: ClaimInput) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Telegram report delivery ledger is unavailable.");
  const { data, error } = await client.rpc("claim_telegram_business_report", {
    p_run_key: input.runKey,
    p_slot: input.slot,
    p_window_start: input.startIso,
    p_window_end: input.endIso,
  });
  if (error) throw new Error(`Could not claim Telegram report: ${error.message}`);
  const result = (data ?? {}) as { claimed?: boolean; lease_token?: string };
  return { claimed: result.claimed === true, leaseToken: result.lease_token };
}

async function finish(input: FinishInput) {
  const client = createSupabaseAdminClient();
  if (!client) return { ok: false };
  const { data, error } = await client.rpc("finish_telegram_business_report", {
    p_run_key: input.runKey,
    p_lease_token: input.leaseToken,
    p_outcome: input.outcome,
    p_error: input.reason ?? null,
  });
  return { ok: !error && data === true };
}

const productionDependencies: TelegramBusinessReportDependencies = {
  readPaidOrders,
  readAds,
  claim,
  finish,
  send: sendTelegramTextMessage,
};

export async function runTelegramBusinessReport(
  input: { slot: TelegramBusinessReportSlot; now?: Date; test?: boolean },
  dependencies: TelegramBusinessReportDependencies = productionDependencies,
) {
  const now = input.now ?? new Date();
  const window = buildTelegramReportWindow(input.slot, now);
  const sevenDayWindow = buildSevenDayWindow(now);
  const monthWindow = buildMonthToDateWindow(new Date(window.endIso));
  const runKey = `${window.slot}:${window.startIso}:${window.endIso}`;
  let leaseToken = "";

  if (!input.test) {
    const claimed = await dependencies.claim({ ...window, runKey });
    if (!claimed.claimed || !claimed.leaseToken) {
      return { ok: true, skipped: true, reason: "Report window already claimed or sent." };
    }
    leaseToken = claimed.leaseToken;
  }

  try {
    let messages: string[];
    if (input.slot === "full-day") {
      const currentAds = await dependencies.readAds(window);
      const incompleteAccount = currentAds.accounts?.find((account) => !account.available);
      if (incompleteAccount) {
        throw new Error(`${incompleteAccount.accountName}: ${incompleteAccount.reason || "snapshot Ads chưa đủ 24 giờ final"}`);
      }
      messages = [buildTelegramAdAccountSummaryMessage({
        test: input.test,
        startIso: window.startIso,
        endIso: window.endIso,
        accounts: currentAds.accounts,
      })];
    } else {
      const [currentOrders, currentAds, sevenDayOrders, sevenDayAds, monthOrders, monthAds] = await Promise.all([
        dependencies.readPaidOrders(window), dependencies.readAds(window),
        dependencies.readPaidOrders(sevenDayWindow), dependencies.readAds(sevenDayWindow),
        dependencies.readPaidOrders(monthWindow), dependencies.readAds(monthWindow),
      ]);
      messages = buildTelegramProductReportMessages({
        slot: input.slot,
        test: input.test,
        current: { ...window, accounts: currentAds.accounts, metrics: aggregateProductMetrics({ orders: currentOrders, campaigns: currentAds.campaigns, ads: currentAds.available ? { available: true } : { available: false, reason: currentAds.reason } }) },
        sevenDay: { ...sevenDayWindow, metrics: aggregateProductMetrics({ orders: sevenDayOrders, campaigns: sevenDayAds.campaigns, ads: sevenDayAds.available ? { available: true } : { available: false, reason: sevenDayAds.reason } }) },
        month: { ...monthWindow, metrics: aggregateProductMetrics({ orders: monthOrders, campaigns: monthAds.campaigns, ads: monthAds.available ? { available: true } : { available: false, reason: monthAds.reason } }) },
      });
    }
    let status: number | undefined;
    for (const message of messages) {
      const delivery = await dependencies.send(message);
      if (!delivery.ok || delivery.skipped) throw new Error(delivery.reason || "Telegram report was not sent.");
      status = delivery.status;
    }
    if (!input.test) {
      const recorded = await dependencies.finish({ runKey, leaseToken, outcome: "sent" });
      if (!recorded.ok) return { ok: false, skipped: false, reason: "Telegram sent but delivery marker failed." };
    }
    return { ok: true, skipped: false, status, window, parts: messages.length };
  } catch (error) {
    const reason = safeReason(error, "Telegram business report failed.");
    if (!input.test && leaseToken) {
      await dependencies.finish({ runKey, leaseToken, outcome: "failed", reason }).catch(() => ({ ok: false }));
    }
    return { ok: false, skipped: false, reason, window };
  }
}
