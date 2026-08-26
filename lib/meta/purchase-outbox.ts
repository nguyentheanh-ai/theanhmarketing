import { siteConfig } from "@/data/site";
import { sendMetaPurchaseEvent } from "@/lib/meta/conversions-api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ClaimedPurchaseOrder = {
  order_code: string;
  student_name?: string | null;
  email?: string | null;
  phone?: string | null;
  course_slug?: string | null;
  course_title?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  paid_at?: string | null;
  order_items?: Array<{ slug?: string; title?: string; price?: number }> | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_id?: string | null;
  utm_term?: string | null;
  campaign_id?: string | null;
  campaign_name?: string | null;
  adset_id?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  landing_page?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  meta_purchase_attempt_count: number;
  meta_purchase_lease_token: string;
};

export type MetaPurchaseDispatchSummary = {
  claimed: number;
  sent: number;
  retried: number;
  lostLease: number;
  error?: string;
};

const RETRY_MINUTES = [5, 15, 60, 180, 720] as const;

export function computeMetaPurchaseRetryDelayMinutes(attemptCount: number) {
  const index = Math.max(0, Math.min(RETRY_MINUTES.length - 1, Math.trunc(attemptCount) - 1));
  return RETRY_MINUTES[index];
}

function safeFailureReason(result: { skipped?: boolean; reason?: string; status?: number }) {
  if (result.skipped) {
    return result.reason === "Missing Meta CAPI config"
      ? result.reason
      : "Meta CAPI event skipped";
  }
  return result.status
    ? `Meta CAPI request failed (status ${result.status})`
    : "Meta CAPI request failed";
}

function parseClaimedOrders(value: unknown): ClaimedPurchaseOrder[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ClaimedPurchaseOrder => {
    if (!item || typeof item !== "object") return false;
    const row = item as Partial<ClaimedPurchaseOrder>;
    return typeof row.order_code === "string"
      && typeof row.meta_purchase_lease_token === "string"
      && typeof row.meta_purchase_attempt_count === "number";
  });
}

export async function dispatchMetaPurchaseOrders(
  input: { orderCode?: string; limit?: number } = {},
): Promise<MetaPurchaseDispatchSummary> {
  const client = createSupabaseAdminClient();
  const summary: MetaPurchaseDispatchSummary = {
    claimed: 0,
    sent: 0,
    retried: 0,
    lostLease: 0,
  };

  if (!client) return { ...summary, error: "Missing Supabase admin client" };

  const limit = Math.max(1, Math.min(25, Math.trunc(input.limit ?? 10)));
  const claim = await client.rpc("claim_meta_purchase_orders", {
    p_limit: limit,
    p_order_code: input.orderCode?.trim().toUpperCase() || null,
  });

  if (claim.error) return { ...summary, error: "Could not claim Meta Purchase orders" };

  const orders = parseClaimedOrders(claim.data);
  summary.claimed = orders.length;

  for (const order of orders) {
    const eventSourceUrl = `${siteConfig.url}/thanh-toan/${encodeURIComponent(order.order_code)}`;
    let succeeded = false;
    let fbtraceId: string | null = null;
    let errorReason = "Unexpected Meta Purchase dispatch error";

    try {
      const result = await sendMetaPurchaseEvent({
        // Meta deduplicates Purchase with event_id=order_code.
        orderCode: order.order_code,
        studentName: order.student_name ?? undefined,
        email: order.email ?? undefined,
        phone: order.phone ?? undefined,
        courseSlug: order.course_slug ?? undefined,
        courseTitle: order.course_title ?? undefined,
        amount: Number(order.amount ?? 0),
        currency: order.currency ?? "VND",
        status: order.status ?? "paid",
        pageUrl: eventSourceUrl,
        landingPage: order.landing_page || eventSourceUrl,
        utmSource: order.utm_source ?? undefined,
        utmMedium: order.utm_medium ?? undefined,
        utmCampaign: order.utm_campaign ?? undefined,
        utmContent: order.utm_content ?? undefined,
        utmId: order.utm_id ?? undefined,
        utmTerm: order.utm_term ?? undefined,
        campaignId: order.campaign_id ?? undefined,
        campaignName: order.campaign_name ?? undefined,
        adsetId: order.adset_id ?? undefined,
        adId: order.ad_id ?? undefined,
        adName: order.ad_name ?? undefined,
        fbclid: order.fbclid ?? undefined,
        fbp: order.fbp ?? undefined,
        fbc: order.fbc ?? undefined,
        ipAddress: order.ip_address ?? undefined,
        userAgent: order.user_agent ?? undefined,
        paidAt: order.paid_at,
        orderItems: order.order_items ?? undefined,
      });
      succeeded = result.ok && !result.skipped;
      fbtraceId = result.fbtraceId ?? null;
      errorReason = safeFailureReason(result);
    } catch {
      succeeded = false;
    }

    const delayMinutes = computeMetaPurchaseRetryDelayMinutes(order.meta_purchase_attempt_count);
    const nextAttemptAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
    const finish = await client.rpc("finish_meta_purchase_order", {
      p_order_code: order.order_code,
      p_lease_token: order.meta_purchase_lease_token,
      p_succeeded: succeeded,
      p_next_attempt_at: succeeded ? null : nextAttemptAt,
      p_error: succeeded ? null : errorReason,
      p_fbtrace_id: succeeded ? fbtraceId : null,
    });

    const finishState = finish.data && typeof finish.data === "object"
      ? String((finish.data as { finish_state?: unknown }).finish_state ?? "")
      : "";
    if (finish.error || finishState === "lost_lease") summary.lostLease += 1;
    else if (succeeded && finishState === "sent") summary.sent += 1;
    else summary.retried += 1;
  }

  return summary;
}
