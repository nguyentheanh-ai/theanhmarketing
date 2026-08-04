import { sendTelegramTextMessage, type TelegramSendResult } from "@/lib/notifications/telegram";
import {
  buildTelegramBusinessReportMessage,
  buildTelegramReportWindow,
  type TelegramBusinessReportSlot,
  type TelegramBusinessReportWindow,
} from "@/lib/reports/telegram-business-day";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMetaAdsReportForWindow } from "@/services/metaAdsReportService";

type PaidOrderAmount = { amount: number };
type AdsResult = { available: true; spend: number } | { available: false; reason?: string };
type ClaimInput = TelegramBusinessReportWindow & { runKey: string };
type FinishInput = { runKey: string; leaseToken: string; outcome: "sent" | "failed"; reason?: string };

export type TelegramBusinessReportDependencies = {
  readPaidOrders: (window: TelegramBusinessReportWindow) => Promise<PaidOrderAmount[]>;
  readAds: (window: TelegramBusinessReportWindow) => Promise<AdsResult>;
  claim: (input: ClaimInput) => Promise<{ claimed: boolean; leaseToken?: string }>;
  finish: (input: FinishInput) => Promise<{ ok: boolean }>;
  send: (text: string) => Promise<TelegramSendResult>;
};

function safeReason(error: unknown, fallback: string) {
  const value = error instanceof Error ? error.message : String(error ?? "");
  return (value.trim() || fallback).slice(0, 800);
}

async function readPaidOrders(window: TelegramBusinessReportWindow): Promise<PaidOrderAmount[]> {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Canonical paid-order source is unavailable.");

  const orders: PaidOrderAmount[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", window.startIso)
      .lt("paid_at", window.endIso)
      .order("paid_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not read paid orders: ${error.message}`);
    const rows = (data ?? []).map((row) => ({ amount: Number(row.amount ?? 0) })).filter((row) => Number.isFinite(row.amount));
    orders.push(...rows);
    if (rows.length < pageSize) break;
  }
  return orders;
}

async function readAds(window: TelegramBusinessReportWindow): Promise<AdsResult> {
  const report = await getMetaAdsReportForWindow(window);
  return report.available
    ? { available: true, spend: report.totals.spend }
    : { available: false, reason: report.reason };
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
  const window = buildTelegramReportWindow(input.slot, input.now);
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
    const [orders, ads] = await Promise.all([
      dependencies.readPaidOrders(window),
      dependencies.readAds(window),
    ]);
    const grossReceived = orders.reduce((sum, order) => sum + order.amount, 0);
    const text = buildTelegramBusinessReportMessage({
      ...window,
      test: input.test,
      orderCount: orders.length,
      grossReceived,
      ads,
    });
    const delivery = await dependencies.send(text);
    if (!delivery.ok || delivery.skipped) {
      throw new Error(delivery.reason || "Telegram report was not sent.");
    }
    if (!input.test) {
      const recorded = await dependencies.finish({ runKey, leaseToken, outcome: "sent" });
      if (!recorded.ok) return { ok: false, skipped: false, reason: "Telegram sent but delivery marker failed." };
    }
    return { ok: true, skipped: false, status: delivery.status, window };
  } catch (error) {
    const reason = safeReason(error, "Telegram business report failed.");
    if (!input.test && leaseToken) {
      await dependencies.finish({ runKey, leaseToken, outcome: "failed", reason }).catch(() => ({ ok: false }));
    }
    return { ok: false, skipped: false, reason, window };
  }
}
