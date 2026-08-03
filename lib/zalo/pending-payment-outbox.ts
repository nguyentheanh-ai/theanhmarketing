import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendPendingPaymentZbs } from "@/lib/zalo/client";
import {
  buildPendingPaymentZbsPayload,
  isPendingPaymentZnsEligible,
  type PendingPaymentZnsOrder,
  type PendingPaymentZbsPayload,
} from "@/lib/zalo/pending-payment";

type ClaimedOrder = {
  orderCode: string;
  leaseToken: string;
  attemptCount: number;
};

type FinishOutcome = "sent" | "retry" | "cancelled" | "dead";

export type PendingPaymentZnsRepository = {
  claim(input: {
    limit: number;
    rolloutAt: string;
    dailyLimit: number;
  }): Promise<
    | { ok: true; orders: ClaimedOrder[] }
    | { ok: false; reason: string }
  >;
  reread(orderCode: string): Promise<
    | { ok: true; order: PendingPaymentZnsOrder | null }
    | { ok: false; reason: string }
  >;
  finish(input: {
    orderCode: string;
    leaseToken: string;
    outcome: FinishOutcome;
    nextAttemptAt: string | null;
    error: string | null;
    messageId: string | null;
  }): Promise<{ state: FinishOutcome | "lost_lease" | "error" }>;
};

type ProviderResult =
  | {
      ok: true;
      retryable: false;
      reason: null;
      status: number;
      messageId: string;
    }
  | {
      ok: false;
      retryable: boolean;
      reason: string;
      status?: number;
    };

type DispatcherDependencies = {
  env?: Record<string, string | undefined>;
  now?: () => number;
  repository?: PendingPaymentZnsRepository;
  send?: (payload: PendingPaymentZbsPayload) => Promise<ProviderResult>;
};

export type PendingPaymentZnsDispatchSummary = {
  claimed: number;
  sent: number;
  retried: number;
  cancelled: number;
  dead: number;
  lostLease: number;
  disabled: boolean;
  error?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseClaimedOrders(value: unknown): ClaimedOrder[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asRecord(item);
    const orderCode = stringValue(row.order_code);
    const leaseToken = stringValue(row.zns_pending_payment_lease_token);
    const attemptCount = Number(row.zns_pending_payment_attempt_count);
    return orderCode && leaseToken && Number.isInteger(attemptCount)
      ? [{ orderCode, leaseToken, attemptCount }]
      : [];
  });
}

function createSupabaseRepository(): PendingPaymentZnsRepository {
  return {
    async claim(input) {
      const client = createSupabaseAdminClient();
      if (!client) return { ok: false, reason: "missing_supabase_admin" };
      const result = await client.rpc("claim_pending_payment_zns_orders", {
        p_limit: input.limit,
        p_rollout_at: input.rolloutAt,
        p_daily_limit: input.dailyLimit,
      });
      if (result.error) return { ok: false, reason: "zns_claim_failed" };
      return { ok: true, orders: parseClaimedOrders(result.data) };
    },

    async reread(orderCode) {
      const client = createSupabaseAdminClient();
      if (!client) return { ok: false, reason: "missing_supabase_admin" };
      const result = await client
        .from("orders")
        .select("order_code,student_name,status,course_slug,course_title,phone,amount,currency,sepay_reference_code,order_items")
        .eq("order_code", orderCode)
        .maybeSingle();
      if (result.error) return { ok: false, reason: "zns_reread_failed" };
      if (!result.data) return { ok: true, order: null };
      const row = asRecord(result.data);
      return {
        ok: true,
        order: {
          orderCode: stringValue(row.order_code),
          studentName: stringValue(row.student_name),
          phone: stringValue(row.phone),
          courseSlug: stringValue(row.course_slug),
          courseTitle: stringValue(row.course_title),
          amount: typeof row.amount === "number" || typeof row.amount === "string"
            ? row.amount
            : 0,
          currency: stringValue(row.currency) || "VND",
          status: stringValue(row.status),
          sepayReferenceCode: stringValue(row.sepay_reference_code) || null,
          orderItems: Array.isArray(row.order_items)
            ? (row.order_items as PendingPaymentZnsOrder["orderItems"])
            : [],
        },
      };
    },

    async finish(input) {
      const client = createSupabaseAdminClient();
      if (!client) return { state: "error" };
      const result = await client.rpc("finish_pending_payment_zns_order", {
        p_order_code: input.orderCode,
        p_lease_token: input.leaseToken,
        p_outcome: input.outcome,
        p_next_attempt_at: input.nextAttemptAt,
        p_error: input.error,
        p_message_id: input.messageId,
      });
      if (result.error) return { state: "error" };
      const state = stringValue(asRecord(result.data).finish_state);
      return state === "sent" ||
        state === "retry" ||
        state === "cancelled" ||
        state === "dead" ||
        state === "lost_lease"
        ? { state }
        : { state: "error" };
    },
  };
}

function emptySummary(): PendingPaymentZnsDispatchSummary {
  return {
    claimed: 0,
    sent: 0,
    retried: 0,
    cancelled: 0,
    dead: 0,
    lostLease: 0,
    disabled: false,
  };
}

export function createPendingPaymentZnsDispatcher(
  dependencies: DispatcherDependencies = {},
) {
  const env = dependencies.env ?? process.env;
  const now = dependencies.now ?? Date.now;
  const repository = dependencies.repository ?? createSupabaseRepository();
  const send = dependencies.send ?? sendPendingPaymentZbs;

  return async function dispatchPendingPaymentZnsOrders(
    input: { limit?: number } = {},
  ): Promise<PendingPaymentZnsDispatchSummary> {
    const summary = emptySummary();
    if (env.ZALO_ZNS_ENABLED !== "true") {
      return { ...summary, disabled: true };
    }

    const rolloutAt = stringValue(env.ZALO_ZNS_ROLLOUT_AT);
    const rolloutTimestamp = Date.parse(rolloutAt);
    const dailyLimit = Number(env.ZALO_ZNS_DAILY_LIMIT);
    if (
      !rolloutAt ||
      !Number.isFinite(rolloutTimestamp) ||
      rolloutTimestamp > now() ||
      !Number.isInteger(dailyLimit) ||
      dailyLimit < 1 ||
      dailyLimit > 1000
    ) {
      return {
        ...summary,
        disabled: true,
        error: "invalid_zalo_rollout_config",
      };
    }

    const limit = Math.max(1, Math.min(25, Math.trunc(input.limit ?? 10)));
    const claim = await repository.claim({ limit, rolloutAt, dailyLimit });
    if (!claim.ok) return { ...summary, error: claim.reason };
    summary.claimed = claim.orders.length;

    async function finish(
      order: ClaimedOrder,
      outcome: FinishOutcome,
      options: {
        nextAttemptAt?: string | null;
        error?: string | null;
        messageId?: string | null;
      } = {},
    ) {
      const result = await repository.finish({
        orderCode: order.orderCode,
        leaseToken: order.leaseToken,
        outcome,
        nextAttemptAt: options.nextAttemptAt ?? null,
        error: options.error ?? null,
        messageId: options.messageId ?? null,
      });
      if (result.state === "lost_lease" || result.state === "error") {
        summary.lostLease += 1;
        return;
      }
      if (outcome === "sent") summary.sent += 1;
      if (outcome === "retry") summary.retried += 1;
      if (outcome === "cancelled") summary.cancelled += 1;
      if (outcome === "dead") summary.dead += 1;
    }

    for (const claimedOrder of claim.orders) {
      const reread = await repository.reread(claimedOrder.orderCode);
      if (!reread.ok) {
        const canRetry = claimedOrder.attemptCount < 3;
        await finish(claimedOrder, canRetry ? "retry" : "dead", {
          nextAttemptAt: canRetry
            ? new Date(now() + (claimedOrder.attemptCount === 1 ? 5 : 15) * 60_000).toISOString()
            : null,
          error: reread.reason,
        });
        continue;
      }

      const current = reread.order;
      if (
        !current ||
        current.status !== "pending" ||
        !isPendingPaymentZnsEligible(current)
      ) {
        await finish(claimedOrder, "cancelled", {
          error: "order_no_longer_eligible",
        });
        continue;
      }

      let payload: PendingPaymentZbsPayload;
      try {
        payload = buildPendingPaymentZbsPayload(current);
      } catch {
        await finish(claimedOrder, "cancelled", {
          error: "invalid_pending_payment_payload",
        });
        continue;
      }

      const result = await send(payload);
      if (result.ok) {
        await finish(claimedOrder, "sent", { messageId: result.messageId });
        continue;
      }

      if (result.retryable && claimedOrder.attemptCount < 3) {
        const delayMinutes = claimedOrder.attemptCount === 1 ? 5 : 15;
        await finish(claimedOrder, "retry", {
          nextAttemptAt: new Date(now() + delayMinutes * 60_000).toISOString(),
          error: result.reason,
        });
        continue;
      }

      await finish(claimedOrder, "dead", { error: result.reason });
    }

    return summary;
  };
}

export const dispatchPendingPaymentZnsOrders =
  createPendingPaymentZnsDispatcher();
