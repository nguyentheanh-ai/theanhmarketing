import type { PaymentOrder } from '@/services/orderService';
import { emptyInvoiceDetails } from '@/lib/orders/invoice';
import { normalizeAttribution } from '@/lib/tracking/attribution';
import { buildPaymentSuccessEmailPayload } from '@/lib/notifications/payment-success-email';
import { provisionNativePaidAccount } from './native-paid-account';
import { NativePaymentUnavailable, type NativeOrderDatabase } from './native-order-settlement';

type Payload = ReturnType<typeof buildPaymentSuccessEmailPayload>;
export type NativeMailSender = (payload: Payload, idempotencyKey: string) => Promise<{ ok: boolean; id?: string | null }>;
type Options = Parameters<typeof provisionNativePaidAccount>[2] & { send: NativeMailSender; siteUrl: string; now?: () => number };
const STALE_CLAIM_MS = 10 * 60_000;

// Resend sender for the Worker runtime. Redirects are refused (workerd does not
// support redirect:'error'); the key never leaves this closure.
export function createResendSender(apiKey: string): NativeMailSender {
  if (typeof apiKey !== 'string' || !/^re_[A-Za-z0-9_]{8,200}$/.test(apiKey)) throw new NativePaymentUnavailable();
  return async (payload, idempotencyKey) => {
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', redirect: 'manual', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json; charset=utf-8', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) });
      if (!response.ok) return { ok: false };
      const body = await response.json().catch(() => null) as { id?: unknown } | null;
      return { ok: true, id: typeof body?.id === 'string' ? body.id.slice(0, 128) : null };
    } catch { return { ok: false }; }
  };
}

export function toPaymentOrder(source: Record<string, unknown>, email: string): PaymentOrder {
  const text = (key: string) => typeof source[key] === 'string' ? source[key] as string : '';
  const amount = typeof source.amount === 'number' && Number.isSafeInteger(source.amount) ? source.amount : 0;
  return {
    id: text('id'), leadId: null, orderCode: text('order_code'), studentName: text('student_name'), email, phone: text('phone'),
    courseSlug: text('course_slug'), courseTitle: text('course_title'), amount, amountLabel: `${amount.toLocaleString('vi-VN')}đ`,
    currency: text('currency') || 'VND', status: 'paid', paymentMethod: 'sepay', paymentQrUrl: '', paidAt: text('paid_at') || null,
    expiresAt: null, createdAt: text('created_at'), sepayReferenceCode: null,
    orderItems: Array.isArray(source.order_items) ? source.order_items as PaymentOrder['orderItems'] : [],
    paymentEmailSentAt: null, paymentEmailLastError: null, accountingEmailSentAt: null, accountingEmailLastError: null,
    purchaseEventSent: false, paymentPlan: text('payment_plan') || null, parentOrderCode: null, attribution: normalizeAttribution({ utmSource: text('utm_source'), utmMedium: text('utm_medium'), utmCampaign: text('utm_campaign'), utmContent: text('utm_content'), utmId: text('utm_id'), utmTerm: text('utm_term'), campaignId: text('campaign_id'), campaignName: text('campaign_name'), adsetId: text('adset_id'), adId: text('ad_id'), adName: text('ad_name'), fbclid: text('fbclid'), fbc: text('fbc'), fbp: text('fbp'), landingPage: text('landing_page') }), invoice: emptyInvoiceDetails,
  };
}

// Candidate only. Sends the existing payment-success email once per order after
// native account provisioning. A temporary password appears only while the
// account is still untouched; existing users are told to use their password.
export async function deliverNativePaidEmail(db: NativeOrderDatabase, code: string, options: Options) {
  const account = await provisionNativePaidAccount(db, code, options);
  if (account.skipped) return { status: 'skipped' as const, reason: account.reason };
  const now = options.now?.() ?? Date.now(), stamp = new Date(now).toISOString(), stale = new Date(now - STALE_CLAIM_MS).toISOString(), token = crypto.randomUUID();
  try {
    await db.batch([{ sql: `INSERT INTO d1_native_paid_emails(order_code,status,claim_token,claimed_at,attempts) SELECT ?1,'sending',?2,?3,1 WHERE EXISTS(SELECT 1 FROM d1_native_paid_accounts WHERE order_code=?1 AND user_id=?5) ON CONFLICT(order_code) DO UPDATE SET status='sending',claim_token=?2,claimed_at=?3,attempts=attempts+1 WHERE status='failed' OR (status='sending' AND julianday(claimed_at)<julianday(?4))`, params: [code, token, stamp, stale, account.userId] }]);
  } catch { throw new NativePaymentUnavailable(); }
  const claim = await db.first('SELECT status,claim_token FROM d1_native_paid_emails WHERE order_code=?1', [code]);
  if (claim?.status === 'sent') return { status: 'already_sent' as const };
  if (claim?.claim_token !== token) return { status: 'in_progress' as const };
  const row = await db.first('SELECT order_snapshot FROM d1_native_paid_accounts WHERE order_code=?1 AND user_id=?2', [code, account.userId]);
  if (typeof row?.order_snapshot !== 'string') throw new NativePaymentUnavailable();
  const order = toPaymentOrder(JSON.parse(row.order_snapshot) as Record<string, unknown>, account.email);
  const payload = buildPaymentSuccessEmailPayload(order, { siteUrl: options.siteUrl, account: { email: account.email, temporaryPassword: account.temporaryPassword, created: account.created, mustChangePassword: Boolean(account.temporaryPassword) } });
  const result = await options.send(payload, `tam-native-paid-email/${code}`).catch(() => ({ ok: false as const, id: null }));
  const done = result.ok
    ? { sql: `UPDATE d1_native_paid_emails SET status='sent',sent_at=?3,resend_email_id=?4,last_error=NULL WHERE order_code=?1 AND claim_token=?2`, params: [code, token, new Date(options.now?.() ?? Date.now()).toISOString(), result.id ?? null] }
    : { sql: `UPDATE d1_native_paid_emails SET status='failed',last_error='provider_rejected_or_unreachable' WHERE order_code=?1 AND claim_token=?2`, params: [code, token] };
  // If this write is lost the claim goes stale and a retry resends with the same
  // idempotency key, which the provider deduplicates.
  try { await db.batch([done]); } catch { throw new NativePaymentUnavailable(); }
  return result.ok ? { status: 'sent' as const, includesPassword: Boolean(account.temporaryPassword) } : { status: 'failed' as const };
}
