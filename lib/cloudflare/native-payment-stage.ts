import type { AuthorityHandoff } from './d1-data-authority';
import { createD1AuthDatabase, type AuthD1Binding } from './d1-auth-database';
import { consumeD1AuthAttempt } from './d1-auth-rate-limit';
import { handleNativeSepayWebhook } from './native-sepay-http';
import { applyNativePaidOrderAccess } from './native-paid-order-access';
import { createResendSender, deliverNativePaidEmail, type NativeMailSender } from './native-paid-email';
import { runNativePaidSideEffects, type NativeSideEffectConfig } from './native-paid-side-effects';
import type { NativeOrderDatabase } from './native-order-settlement';
import type { NativeStageEnv } from './native-stage-router';

export type NativePaymentStageEnv = Pick<NativeStageEnv, 'NATIVE_AUTH_DB' | 'NATIVE_AUTH_CREDENTIAL_KEY' | 'NATIVE_AUTH_LIMITER_KEY'> & {
  CF_NATIVE_QA_PAYMENT_MODE?: string; CF_NATIVE_QA_ORDERS?: string; NATIVE_SEPAY_API_KEY?: string; NATIVE_SEPAY_ACCOUNT?: string;
  NATIVE_AUTH_AUTHORITY?: string; NATIVE_RESEND_API_KEY?: string; NATIVE_ACCOUNTING_EMAIL?: string;
  NATIVE_META_CAPI_ACCESS_TOKEN?: string; NATIVE_META_CAPI_DATASET_ID?: string; NATIVE_META_CAPI_TEST_EVENT_CODE?: string;
  NATIVE_TELEGRAM_BOT_TOKEN?: string; NATIVE_TELEGRAM_CHAT_ID?: string; NATIVE_GOOGLE_SHEETS_WEBHOOK_URL?: string;
};
// Each provider is enabled only by its own complete config; partial config is ignored.
export function resolveNativeSideEffectConfig(env: NativePaymentStageEnv, mail: NativeMailSender | null): NativeSideEffectConfig {
  const v = (value?: string) => (value ?? '').trim();
  const sheet = v(env.NATIVE_GOOGLE_SHEETS_WEBHOOK_URL), sheetOk = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(sheet);
  return {
    siteUrl: SITE,
    ...(mail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v(env.NATIVE_ACCOUNTING_EMAIL)) ? { accounting: { recipient: v(env.NATIVE_ACCOUNTING_EMAIL).toLowerCase(), send: mail } } : {}),
    ...(v(env.NATIVE_META_CAPI_ACCESS_TOKEN) && /^\d{6,30}$/.test(v(env.NATIVE_META_CAPI_DATASET_ID)) ? { meta: { accessToken: v(env.NATIVE_META_CAPI_ACCESS_TOKEN), datasetId: v(env.NATIVE_META_CAPI_DATASET_ID), testEventCode: v(env.NATIVE_META_CAPI_TEST_EVENT_CODE) || undefined } } : {}),
    ...(/^\d+:[A-Za-z0-9_-]{20,}$/.test(v(env.NATIVE_TELEGRAM_BOT_TOKEN)) && /^-?\d{3,20}$/.test(v(env.NATIVE_TELEGRAM_CHAT_ID)) ? { telegram: { botToken: v(env.NATIVE_TELEGRAM_BOT_TOKEN), chatId: v(env.NATIVE_TELEGRAM_CHAT_ID) } } : {}),
    ...(sheetOk ? { googleSheet: { webhookUrl: sheet } } : {}),
  };
}
const ORIGIN = 'https://theanh-main-cf-staging.12c1thdtheanh.workers.dev', SITE = 'https://www.theanhmarketing.com';
// Order code needs first/all/batch on one primary-pinned session; raw D1 errors
// can carry SQL or bound values, so callers only ever see an outage.
export function createOrderDatabase(binding: AuthD1Binding): NativeOrderDatabase {
  const session = binding.withSession('first-primary');
  const guard = async <T>(task: () => Promise<T>) => { try { return await task(); } catch { throw new Error('Order database unavailable'); } };
  return {
    first: (sql, params) => guard(async () => await session.prepare(sql).bind(...params).first() as Record<string, unknown> | null),
    all: (sql, params) => guard(async () => (await session.prepare(sql).bind(...params).all()).results as Record<string, unknown>[]),
    batch: statements => guard(async () => {
      // One platform batch is one transaction; never emulate with Promise.all.
      const results = await session.batch(statements.map(s => session.prepare(s.sql).bind(...s.params)));
      if (results.length !== statements.length || results.some((r: { success?: boolean }) => r.success !== true)) throw new Error();
      return results.map((r: { results?: unknown }) => ({ results: r.results as Record<string, unknown>[] }));
    }),
  };
}
const unavailable = () => Response.json({ success: false, message: 'Không xử lý được webhook.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });

// Settle → notifications + access → account → email. Every step is idempotent;
// a SePay retry (duplicate settle) re-runs the remaining steps. Notifications
// (accounting/Meta/Telegram/Sheets) do not depend on access or Auth, matching the
// production webhook. Account and email stay off until a pinned native Auth
// authority and a Resend key are both configured.
export async function runNativePaidFulfillment(db: NativeOrderDatabase, code: string, input: { approvedOrders: readonly string[]; credentialKey: string; authority: AuthorityHandoff | null; send: NativeMailSender | null; sideEffects?: NativeSideEffectConfig }) {
  const notifications = input.sideEffects ? await runNativePaidSideEffects(db, code, input.sideEffects).catch(() => 'unavailable' as const) : 'not_configured' as const;
  await applyNativePaidOrderAccess(db, code, input.approvedOrders);
  if (!input.authority || !input.send) return { notifications, access: 'applied' as const, email: 'pending_authority' as const };
  const email = await deliverNativePaidEmail(db, code, { nativeAuthority: input.authority, credentialKey: input.credentialKey, approvedOrders: input.approvedOrders, send: input.send, siteUrl: SITE });
  return { notifications, access: 'applied' as const, email: email.status };
}

function readCode(text: string, type: string | null) {
  try {
    const value = type?.startsWith('application/json') ? (JSON.parse(text) as { code?: unknown }).code : new URLSearchParams(text).get('code');
    return typeof value === 'string' ? value : null;
  } catch { return null; }
}

// Staging A only, default disabled: returns null so the existing Supabase
// webhook keeps handling the request. QA mode accepts only the listed orders.
export async function handleNativePaymentStage(request: Request, env: NativePaymentStageEnv, waitUntil?: (task: Promise<unknown>) => void): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/sepay/webhook' || (env.CF_NATIVE_QA_PAYMENT_MODE ?? 'disabled') === 'disabled') return null;
  if (env.CF_NATIVE_QA_PAYMENT_MODE !== 'qa' || url.origin !== ORIGIN || !waitUntil) return unavailable();
  let orders: string[], authority: AuthorityHandoff | null, send: NativeMailSender | null, sideEffects: NativeSideEffectConfig;
  try {
    const parsed: unknown = JSON.parse(env.CF_NATIVE_QA_ORDERS ?? '[]');
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > 10 || parsed.some(c => typeof c !== 'string' || !/^TAM[A-Z0-9]{1,77}$/.test(c))) return unavailable();
    orders = parsed as string[];
    if (!/^\d{6,20}$/.test(env.NATIVE_SEPAY_ACCOUNT ?? '') || !/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_CREDENTIAL_KEY ?? '') || !/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_LIMITER_KEY ?? '')) return unavailable();
    authority = env.NATIVE_AUTH_AUTHORITY ? JSON.parse(env.NATIVE_AUTH_AUTHORITY) as AuthorityHandoff : null;
    const mail = env.NATIVE_RESEND_API_KEY ? createResendSender(env.NATIVE_RESEND_API_KEY) : null;
    send = authority ? mail : null;
    sideEffects = resolveNativeSideEffectConfig(env, mail);
  } catch { return unavailable(); }
  const db = createOrderDatabase(env.NATIVE_AUTH_DB), limiterDb = createD1AuthDatabase(env.NATIVE_AUTH_DB);
  const copy = request.clone();
  const response = await handleNativeSepayWebhook(request, {
    db, apiKey: env.NATIVE_SEPAY_API_KEY ?? '', policy: { expectedAccount: env.NATIVE_SEPAY_ACCOUNT!, allowedOrderCodes: orders },
    allowAttempt: async () => { const ip = request.headers.get('CF-Connecting-IP'); if (!ip) return false; return (await consumeD1AuthAttempt(limiterDb, { projectId: 'vsxxgdzwtscuxcmjfckt', ip, email: 'sepay-webhook@native.invalid' }, { secret: env.NATIVE_AUTH_LIMITER_KEY, ip: { limit: 60, windowMs: 60000 }, email: { limit: 120, windowMs: 60000 } })).allowed; },
  });
  if (response.status !== 200) return response;
  const code = readCode(await copy.text(), copy.headers.get('content-type'));
  // Fulfillment failure must not un-acknowledge a committed payment; a SePay
  // retry or the operator re-runs these idempotent steps.
  if (code && orders.includes(code)) waitUntil(runNativePaidFulfillment(db, code, { approvedOrders: orders, credentialKey: env.NATIVE_AUTH_CREDENTIAL_KEY, authority, send, sideEffects }).catch(() => undefined));
  return response;
}
