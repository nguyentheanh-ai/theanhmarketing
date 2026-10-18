import { createHash, randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { buildPaymentSuccessEmailPayload, buildPreorderDepositEmailPayload, sendPaymentSuccessEmail } from '@/lib/notifications/payment-success-email';
import { ensureStudentAccountForPaidOrder } from '@/services/studentAccountService';
import { notifyStudentPortalProvisioning } from '@/services/studentPortalProvisioningService';
import { buildConsultationPaymentEmailPayload, sendConsultationPaymentEmail } from '@/lib/notifications/consultation-payment-email';
import type { PaymentOrder } from '@/services/orderService';

// No credentials or email bodies are persisted. The existing private order error
// field holds a versioned CAS receipt until payment_email_sent_at is committed.
// Unknown legacy receipts are never adopted automatically: Blue may have sent an
// email without recording it, and its sender does not share our idempotency key.
type Receipt = { protocol: 'sepay-fulfillment-v1'; token?: string; until?: number; hash?: string; started?: number; accepted?: boolean; providerId?: string };
type Row = { payment_email_last_error: string | null; payment_email_sent_at: string | null };
export function initialSepayFulfillmentReceipt() { return JSON.stringify({ protocol: 'sepay-fulfillment-v1' }); }
function parse(raw: string | null): Receipt | null {
  try {
    const r = JSON.parse(raw ?? 'null');
    if (r?.protocol !== 'sepay-fulfillment-v1') return null;
    if (r.started !== undefined && (!Number.isFinite(r.started) || r.started < 0)) return null;
    if (r.hash !== undefined && !/^[a-f0-9]{64}$/.test(r.hash)) return null;
    if (r.until !== undefined && (!Number.isFinite(r.until) || r.until < 0)) return null;
    if (r.accepted && (typeof r.providerId !== 'string' || !/^[A-Za-z0-9._:-]{1,160}$/.test(r.providerId))) return null;
    return r;
  } catch { return null; }
}
export class PaidFulfillmentUnavailable extends Error {
  constructor(readonly reason: string) { super(reason); this.name = 'PaidFulfillmentUnavailable'; }
}
export type FulfillmentStore = {
  read(code: string): Promise<Row>;
  replace(code: string, previous: string | null, next: string | null, sentAt?: string): Promise<boolean>;
};
export function createSourceFulfillmentStore(): FulfillmentStore {
  const client = createSupabaseAdminClient();
  if (!client) throw new PaidFulfillmentUnavailable('missing_database');
  return {
    async read(code) {
      const r = await client.from('orders').select('payment_email_last_error,payment_email_sent_at').eq('order_code', code).eq('status', 'paid').single();
      if (r.error || !r.data) throw new PaidFulfillmentUnavailable('receipt_read_failed');
      return r.data as Row;
    },
    async replace(code, previous, next, sentAt) {
      let q = client.from('orders').update({ payment_email_last_error: next, ...(sentAt ? { payment_email_sent_at: sentAt } : {}), updated_at: new Date().toISOString() }).eq('order_code', code).eq('status', 'paid').is('payment_email_sent_at', null);
      q = previous === null ? q.is('payment_email_last_error', null) : q.eq('payment_email_last_error', previous);
      const r = await q.select('order_code').maybeSingle();
      if (r.error) throw new PaidFulfillmentUnavailable('receipt_write_failed');
      return Boolean(r.data);
    },
  };
}
type Dependencies = {
  store: FulfillmentStore;
  account: typeof ensureStudentAccountForPaidOrder;
  portal: typeof notifyStudentPortalProvisioning;
  send: typeof sendPaymentSuccessEmail;
  build: typeof buildPaymentSuccessEmailPayload;
  now: () => number;
};
export async function fulfillSourcePaidOrder(order: PaymentOrder, supplied?: Dependencies, kind: 'course' | 'preorder' | 'consultation' = 'course') {
  const d = supplied ?? { store: createSourceFulfillmentStore(), account: ensureStudentAccountForPaidOrder, portal: notifyStudentPortalProvisioning, send: kind === 'consultation' ? sendConsultationPaymentEmail : sendPaymentSuccessEmail, build: kind === 'consultation' ? buildConsultationPaymentEmailPayload : kind === 'preorder' ? buildPreorderDepositEmailPayload : buildPaymentSuccessEmailPayload, now: Date.now };
  const row = await d.store.read(order.orderCode);
  if (row.payment_email_sent_at) return { ok: true, skipped: true };
  const parsed = parse(row.payment_email_last_error);
  if (!parsed) throw new PaidFulfillmentUnavailable('legacy_receipt_requires_review');
  let receipt: Receipt = parsed;
  if ((receipt.until ?? 0) > d.now()) throw new PaidFulfillmentUnavailable('fulfillment_in_progress');
  let previous = row.payment_email_last_error;
  const token = randomUUID();
  receipt = { ...receipt, token, until: d.now() + 120_000 };
  async function persist(next: Receipt, sentAt?: string) {
    const raw = sentAt ? null : JSON.stringify(next);
    if (!await d.store.replace(order.orderCode, previous, raw, sentAt)) throw new PaidFulfillmentUnavailable('fulfillment_lost_claim');
    previous = raw; receipt = next;
  }
  await persist(receipt);
  try {
    if (receipt.accepted) {
      await persist(receipt, new Date(d.now()).toISOString());
      return { ok: true, skipped: true };
    }
    // Provider keys expire at 24h. Ambiguous old attempts require reconciliation,
    // never a new key or a blind resend after that retention window.
    const checkProviderWindow = () => {
      if (receipt.started !== undefined && (d.now() < receipt.started || d.now() - receipt.started >= 23 * 60 * 60_000)) throw new PaidFulfillmentUnavailable('email_attempt_requires_review');
    };
    checkProviderWindow();
    const account = kind === 'course' ? await d.account(order, { preserveExistingAuth: true, provisioningOperationId: `sepay:${order.orderCode}` }) : null;
    if (kind === 'course' && (!account?.ok || !account.userId)) throw new PaidFulfillmentUnavailable('account_provisioning_failed');
    await persist({ ...receipt, until: d.now() + 120_000 });
    if (account?.userId) {
      const portal = await d.portal({ order, userId: account.userId });
      if (!portal.ok || portal.skipped) throw new PaidFulfillmentUnavailable('portal_provisioning_failed');
    }
    const options = {
      account: account?.temporaryPassword ? { email: account.email, temporaryPassword: account.temporaryPassword, created: account.created, mustChangePassword: true } : undefined,
      idempotencyKey: `tam-sepay-paid-email/${order.orderCode}`,
    };
    const hash = createHash('sha256').update(JSON.stringify(d.build(order, options))).digest('hex');
    if (receipt.hash && receipt.hash !== hash) throw new PaidFulfillmentUnavailable('email_payload_requires_review');
    await persist({ ...receipt, until: d.now() + 120_000, hash, started: receipt.started ?? d.now() });
    checkProviderWindow();
    const result = await d.send(order, options);
    if (!result.ok || result.skipped || !result.resendEmailId || !/^[A-Za-z0-9._:-]{1,160}$/.test(result.resendEmailId)) throw new PaidFulfillmentUnavailable('payment_email_failed');
    await persist({ ...receipt, accepted: true, providerId: result.resendEmailId });
    await persist(receipt, new Date(d.now()).toISOString());
    return { ok: true, skipped: false };
  } catch (error) {
    // Retain hash and first attempt time on ambiguity; release only our own CAS.
    // If a write/response is lost a future worker waits for the bounded lease.
    try { await persist({ ...receipt, until: 0 }); } catch { /* original failure remains */ }
    if (error instanceof PaidFulfillmentUnavailable) throw error;
    throw new PaidFulfillmentUnavailable('fulfillment_upstream_failed');
  }
}
