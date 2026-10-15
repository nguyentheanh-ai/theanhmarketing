import { buildAccountingPaymentEmailPayload } from '@/lib/notifications/accounting-payment-email';
import { buildMetaPurchaseEvent } from '@/lib/meta/conversions-api';
import { sendTelegramOrderNotification } from '@/lib/notifications/telegram';
import { syncOrderToGoogleSheet } from '@/lib/notifications/google-sheets';
import { toPaymentOrder, type NativeMailSender } from './native-paid-email';
import { NativePaymentUnavailable, type NativeOrderDatabase } from './native-order-settlement';
import type { PaymentOrder } from '@/services/orderService';

export type NativeSideEffectStep = 'accounting_email' | 'meta_purchase' | 'telegram' | 'google_sheet';
type StepResult = { ok: boolean; id?: string | null };
export type NativeSideEffectConfig = {
  siteUrl: string; fetchImpl?: typeof fetch; now?: () => number;
  accounting?: { recipient: string; send: NativeMailSender };
  meta?: { accessToken: string; datasetId: string; apiVersion?: string; testEventCode?: string };
  telegram?: { botToken: string; chatId: string };
  googleSheet?: { webhookUrl: string };
};
const STALE_CLAIM_MS = 10 * 60_000;

async function sendMeta(order: PaymentOrder, snapshot: Record<string, unknown>, config: NonNullable<NativeSideEffectConfig['meta']>, siteUrl: string, fetchImpl: typeof fetch): Promise<StepResult> {
  const text = (key: string) => typeof snapshot[key] === 'string' ? snapshot[key] as string : undefined;
  const pageUrl = `${siteUrl}/thanh-toan/${encodeURIComponent(order.orderCode)}`, a = order.attribution;
  // Meta deduplicates Purchase with event_id=order_code, same as production.
  const event = buildMetaPurchaseEvent({ orderCode: order.orderCode, studentName: order.studentName, email: order.email, phone: order.phone, courseSlug: order.courseSlug, courseTitle: order.courseTitle, amount: order.amount, currency: order.currency, status: 'paid', pageUrl, landingPage: a.landingPage || pageUrl, utmSource: a.utmSource, utmMedium: a.utmMedium, utmCampaign: a.utmCampaign, utmContent: a.utmContent, utmId: a.utmId, utmTerm: a.utmTerm, campaignId: a.campaignId, campaignName: a.campaignName, adsetId: a.adsetId, adId: a.adId, adName: a.adName, fbclid: a.fbclid, fbp: a.fbp, fbc: a.fbc, ipAddress: text('ip_address'), userAgent: text('user_agent'), paidAt: order.paidAt, orderItems: order.orderItems });
  const version = /^v\d+\.\d+$/.test(config.apiVersion ?? '') ? config.apiVersion : 'v21.0';
  const response = await fetchImpl(`https://graph.facebook.com/${version}/${encodeURIComponent(config.datasetId)}/events?access_token=${encodeURIComponent(config.accessToken)}`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: [event], ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}) }) });
  if (!response.ok) return { ok: false };
  const body = await response.json().catch(() => null) as { events_received?: unknown; fbtrace_id?: unknown } | null;
  return { ok: body?.events_received === 1, id: typeof body?.fbtrace_id === 'string' ? body.fbtrace_id.slice(0, 128) : null };
}

async function runStep(db: NativeOrderDatabase, code: string, step: NativeSideEffectStep, now: () => number, task: () => Promise<StepResult>) {
  const t = now(), token = crypto.randomUUID();
  try {
    await db.batch([{ sql: `INSERT INTO d1_native_paid_side_effects(order_code,step,status,claim_token,claimed_at,attempts) SELECT ?1,?2,'sending',?3,?4,1 WHERE EXISTS(SELECT 1 FROM d1_native_order_fulfillment WHERE order_code=?1) ON CONFLICT(order_code,step) DO UPDATE SET status='sending',claim_token=?3,claimed_at=?4,attempts=attempts+1 WHERE status='failed' OR (status='sending' AND julianday(claimed_at)<julianday(?5))`, params: [code, step, token, new Date(t).toISOString(), new Date(t - STALE_CLAIM_MS).toISOString()] }]);
  } catch { throw new NativePaymentUnavailable(); }
  const claim = await db.first('SELECT status,claim_token FROM d1_native_paid_side_effects WHERE order_code=?1 AND step=?2', [code, step]);
  if (claim?.status === 'done') return 'already_done' as const;
  if (claim?.claim_token !== token) return 'in_progress' as const;
  const result = await task().catch(() => ({ ok: false, id: null }));
  try {
    await db.batch([result.ok
      ? { sql: `UPDATE d1_native_paid_side_effects SET status='done',done_at=?4,external_id=?5,last_error=NULL WHERE order_code=?1 AND step=?2 AND claim_token=?3`, params: [code, step, token, new Date(now()).toISOString(), result.id ?? null] }
      : { sql: `UPDATE d1_native_paid_side_effects SET status='failed',last_error='provider_rejected_or_unreachable' WHERE order_code=?1 AND step=?2 AND claim_token=?3`, params: [code, step, token] }]);
  } catch { throw new NativePaymentUnavailable(); }
  return result.ok ? 'done' as const : 'failed' as const;
}

// Candidate only. Runs the production webhook's post-payment notifications for
// a settled native order. Each step has its own ledger row, so one provider
// outage never blocks or repeats the others; unconfigured steps are not
// recorded and run on a later retry once configured.
export async function runNativePaidSideEffects(db: NativeOrderDatabase, code: string, config: NativeSideEffectConfig) {
  const row = await db.first(`SELECT f.order_snapshot FROM d1_native_order_fulfillment f JOIN d1_native_orders o ON o.order_code=f.order_code AND o.row_json=f.order_snapshot AND o.status='paid' WHERE f.order_code=?1`, [code]);
  if (typeof row?.order_snapshot !== 'string') throw new NativePaymentUnavailable();
  const snapshot = JSON.parse(row.order_snapshot) as Record<string, unknown>;
  const order = toPaymentOrder(snapshot, typeof snapshot.email === 'string' ? snapshot.email.trim().toLowerCase() : '');
  const now = config.now ?? Date.now, fetchImpl = config.fetchImpl ?? fetch, siteUrl = config.siteUrl, results: Partial<Record<NativeSideEffectStep, string>> = {};
  const steps: [NativeSideEffectStep, (() => Promise<StepResult>) | null][] = [
    ['accounting_email', config.accounting ? () => config.accounting!.send(buildAccountingPaymentEmailPayload(order, { recipient: config.accounting!.recipient }), `tam-native-accounting/${code}`) : null],
    ['meta_purchase', config.meta ? () => sendMeta(order, snapshot, config.meta!, siteUrl, fetchImpl) : null],
    ['telegram', config.telegram ? async () => ({ ok: (await sendTelegramOrderNotification(order, 'payment_paid', { ...config.telegram!, siteUrl, fetchImpl })).ok }) : null],
    ['google_sheet', config.googleSheet ? async () => { const r = await syncOrderToGoogleSheet(order, { source: 'SePay paid webhook (native)', landingPageUrl: `${siteUrl}/thanh-toan/${encodeURIComponent(code)}`, siteUrl, webhookUrl: config.googleSheet!.webhookUrl, fetchImpl }); return { ok: r.ok && !r.skipped }; } : null],
  ];
  for (const [step, task] of steps) {
    if (!task) { results[step] = 'not_configured'; continue; }
    results[step] = await runStep(db, code, step, now, task).catch(() => 'unavailable');
  }
  return results;
}
