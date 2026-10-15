import bcrypt from 'bcryptjs';
import { nativeAuthoritySql, type AuthorityHandoff } from './d1-data-authority';
import { sealLegacyBcryptHash } from './legacy-password';
import { validNativeNewPassword } from './d1-password-change';
import type { NativeOrderDatabase } from './native-order-settlement';

const PROJECT = 'vsxxgdzwtscuxcmjfckt';
const SIGNUP_TTL_MS = 24 * 3600_000, RECOVERY_TTL_MS = 3600_000;
type Db = Pick<NativeOrderDatabase, 'first' | 'batch'>;
export type NativeEmailAuthOptions = { nativeAuthority: AuthorityHandoff; credentialKey: string; now?: () => number };
export class NativeEmailAuthUnavailable extends Error { constructor() { super('Native email auth unavailable'); } }
const unavailable = () => new NativeEmailAuthUnavailable();

export function normalizeSignupEmail(value: unknown) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
async function sha256(text: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join(''); }
function newToken() { const raw = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...raw)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
function guard(options: NativeEmailAuthOptions) {
  if (options.nativeAuthority?.projectId !== PROJECT || !/^[A-Za-z0-9_-]{43}$/.test(options.credentialKey ?? '')) throw unavailable();
  const t = (options.now ?? Date.now)(); if (!Number.isFinite(t)) throw unavailable();
  return new Date(t);
}
async function commit(db: Db, statements: { sql: string; params: (string | number | null)[] }[]) {
  try {
    // Bind exactly the highest ?N each statement references (D1 rejects extras).
    const result = await db.batch(statements.map(s => ({ sql: s.sql, params: s.params.slice(0, Math.max(0, ...Array.from(s.sql.matchAll(/\?(\d+)/g), m => Number(m[1])))) })));
    if (result.at(-1)?.results?.[0]?.ok !== 1) throw unavailable();
  } catch { throw unavailable(); }
}
const assert = (cond: string, params: (string | number | null)[]) => ({ sql: `SELECT CASE WHEN ${cond} THEN 1 ELSE abs(-9223372036854775808) END AS ok`, params });

// Native signup (email confirmation required, same as Supabase A today).
// Existing confirmed accounts are never changed. An existing unconfirmed
// account only gets a fresh confirmation token; its password is not replaced,
// so a second signup cannot take over a pending registration.
export async function requestNativeSignup(db: Db, input: { email: unknown; password: unknown; fullName?: unknown; phone?: unknown; interestedCourse?: unknown }, options: NativeEmailAuthOptions) {
  const now = guard(options), stamp = now.toISOString(), email = normalizeSignupEmail(input.email);
  if (!email || !validNativeNewPassword(input.password)) throw new RangeError('Invalid signup');
  const text = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const authority = nativeAuthoritySql(options.nativeAuthority, 2);
  const prior = await db.first('SELECT u.id,a.email_confirmed_at,a.deleted_at,a.session_version FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE u.normalized_email=?1', [email]);
  if (prior && (prior.email_confirmed_at !== null || prior.deleted_at !== null)) return { status: 'exists' as const, email };
  const token = newToken(), hash = await sha256(token), expires = new Date(now.getTime() + SIGNUP_TTL_MS).toISOString();
  if (prior) {
    const uid = String(prior.id), version = Number(prior.session_version);
    await commit(db, [
      { sql: `INSERT INTO d1_auth_email_tokens(token_hash,project_id,user_id,kind,session_version,created_at,expires_at) SELECT ?1,'${PROJECT}',?3,'signup',?4,?2,?5 WHERE ${authority} AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?3 AND email_confirmed_at IS NULL AND deleted_at IS NULL AND session_version=?4)`, params: [hash, stamp, uid, version, expires] },
      assert(`EXISTS(SELECT 1 FROM d1_auth_email_tokens WHERE token_hash=?1 AND user_id=?2)`, [hash, uid]),
    ]);
    return { status: 'resent' as const, email, token };
  }
  const uid = crypto.randomUUID();
  const cipher = await sealLegacyBcryptHash(await bcrypt.hash(input.password as string, 10), options.credentialKey, { projectId: PROJECT, userId: uid });
  const metadata = JSON.stringify({ full_name: text(input.fullName, 200), phone: text(input.phone, 40), interested_course: text(input.interestedCourse, 400), signup_source: 'native' });
  const p = [uid, stamp, email, cipher, metadata, hash, expires];
  await commit(db, [
    { sql: `INSERT INTO d1_access_users(id,normalized_email,admin_role) SELECT ?1,?3,NULL WHERE ${authority}`, params: p },
    { sql: `INSERT INTO d1_auth_accounts(user_id,credential_ciphertext,email_confirmed_at,session_version,must_change_password,user_metadata,created_at,updated_at) SELECT ?1,?4,NULL,1,0,?5,?2,?2 WHERE ${authority} AND EXISTS(SELECT 1 FROM d1_access_users WHERE id=?1 AND normalized_email=?3)`, params: p },
    { sql: `INSERT INTO d1_auth_email_tokens(token_hash,project_id,user_id,kind,session_version,created_at,expires_at) SELECT ?6,'${PROJECT}',?1,'signup',1,?2,?7 WHERE ${authority} AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?1)`, params: p },
    assert(`${authority} AND EXISTS(SELECT 1 FROM d1_auth_email_tokens t JOIN d1_auth_accounts a ON a.user_id=t.user_id JOIN d1_access_users u ON u.id=a.user_id WHERE t.token_hash=?6 AND u.normalized_email=?3 AND a.user_id=?1)`, p),
  ]);
  return { status: 'created' as const, email, token };
}

export async function confirmNativeSignup(db: Db, token: unknown, options: NativeEmailAuthOptions) {
  const now = guard(options), stamp = now.toISOString();
  if (typeof token !== 'string' || !TOKEN.test(token)) return { status: 'invalid' as const };
  const hash = await sha256(token), authority = nativeAuthoritySql(options.nativeAuthority, 2);
  const row = await db.first(`SELECT t.user_id,t.used_at,t.expires_at,a.email_confirmed_at FROM d1_auth_email_tokens t JOIN d1_auth_accounts a ON a.user_id=t.user_id WHERE t.token_hash=?1 AND t.kind='signup' AND a.deleted_at IS NULL`, [hash]);
  if (!row) return { status: 'invalid' as const };
  if (row.email_confirmed_at !== null) return { status: 'confirmed' as const }; // retry/second click
  if (row.used_at !== null || !(Date.parse(String(row.expires_at)) > now.getTime())) return { status: 'expired' as const };
  const p = [hash, stamp, String(row.user_id)];
  await commit(db, [
    { sql: `UPDATE d1_auth_accounts SET email_confirmed_at=?2,updated_at=?2 WHERE user_id=?3 AND email_confirmed_at IS NULL AND deleted_at IS NULL AND ${authority} AND EXISTS(SELECT 1 FROM d1_auth_email_tokens WHERE token_hash=?1 AND user_id=?3 AND kind='signup' AND used_at IS NULL AND julianday(expires_at)>julianday(?2))`, params: p },
    { sql: `UPDATE d1_auth_email_tokens SET used_at=?2 WHERE user_id=?3 AND kind='signup' AND used_at IS NULL AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?3 AND email_confirmed_at=?2)`, params: p },
    assert(`EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?3 AND email_confirmed_at IS NOT NULL)`, p),
  ]);
  return { status: 'confirmed' as const };
}

// Same disclosure as the production forgot-password route (it reports whether
// the email exists). Issuing a new link invalidates earlier unused links.
export async function requestNativeRecovery(db: Db, emailInput: unknown, options: NativeEmailAuthOptions) {
  const now = guard(options), stamp = now.toISOString(), email = normalizeSignupEmail(emailInput);
  if (!email) throw new RangeError('Invalid email');
  const row = await db.first(`SELECT a.user_id,a.session_version FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE u.normalized_email=?1 AND a.deleted_at IS NULL AND a.is_anonymous=0 AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2))`, [email, stamp]);
  if (!row) return { status: 'not_found' as const, email };
  const token = newToken(), hash = await sha256(token), authority = nativeAuthoritySql(options.nativeAuthority, 2);
  const p = [hash, stamp, String(row.user_id), Number(row.session_version), new Date(now.getTime() + RECOVERY_TTL_MS).toISOString()];
  await commit(db, [
    { sql: `UPDATE d1_auth_email_tokens SET used_at=?2 WHERE user_id=?3 AND kind='recovery' AND used_at IS NULL AND ${authority}`, params: p },
    { sql: `INSERT INTO d1_auth_email_tokens(token_hash,project_id,user_id,kind,session_version,created_at,expires_at) SELECT ?1,'${PROJECT}',?3,'recovery',?4,?2,?5 WHERE ${authority} AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?3 AND session_version=?4 AND deleted_at IS NULL)`, params: p },
    assert(`EXISTS(SELECT 1 FROM d1_auth_email_tokens WHERE token_hash=?1 AND user_id=?3 AND used_at IS NULL)`, p),
  ]);
  return { status: 'issued' as const, email, token };
}

// One-time link + new password. Replaces the credential, confirms the email
// (the link proves inbox control), bumps session_version and revokes every
// native session and refresh family. Token is single use and bound to the
// session_version at issue, so any later password change invalidates it.
export async function completeNativeRecovery(db: Db, input: { token: unknown; newPassword: unknown }, options: NativeEmailAuthOptions & { refreshFamilies?: boolean }) {
  const now = guard(options), stamp = now.toISOString();
  if (typeof input.token !== 'string' || !TOKEN.test(input.token)) return { status: 'invalid' as const };
  if (!validNativeNewPassword(input.newPassword)) throw new RangeError('Invalid new password');
  const hash = await sha256(input.token), authority = nativeAuthoritySql(options.nativeAuthority, 2);
  const row = await db.first(`SELECT t.user_id,t.session_version FROM d1_auth_email_tokens t JOIN d1_auth_accounts a ON a.user_id=t.user_id AND a.session_version=t.session_version WHERE t.token_hash=?1 AND t.kind='recovery' AND t.used_at IS NULL AND julianday(t.expires_at)>julianday(?2) AND a.deleted_at IS NULL`, [hash, stamp]);
  if (!row) return { status: 'invalid' as const };
  const uid = String(row.user_id), version = Number(row.session_version);
  const cipher = await sealLegacyBcryptHash(await bcrypt.hash(input.newPassword as string, 10), options.credentialKey, { projectId: PROJECT, userId: uid });
  const p = [hash, stamp, uid, version, cipher, version + 1];
  const claimed = `EXISTS(SELECT 1 FROM d1_auth_email_tokens WHERE token_hash=?1 AND user_id=?3 AND kind='recovery' AND used_at=?2)`;
  await commit(db, [
    { sql: `UPDATE d1_auth_email_tokens SET used_at=?2 WHERE token_hash=?1 AND user_id=?3 AND kind='recovery' AND used_at IS NULL AND session_version=?4 AND julianday(expires_at)>julianday(?2) AND ${authority}`, params: p },
    { sql: `UPDATE d1_auth_accounts SET credential_ciphertext=?5,session_version=?6,must_change_password=0,email_confirmed_at=coalesce(email_confirmed_at,?2),updated_at=?2,user_metadata=json_set(user_metadata,'$.must_change_password',json('false'),'$.password_changed_at',?2) WHERE user_id=?3 AND session_version=?4 AND ${claimed}`, params: p },
    { sql: `UPDATE d1_auth_sessions SET revoked_at=?2 WHERE user_id=?3 AND revoked_at IS NULL AND ${claimed}`, params: p },
    ...(options.refreshFamilies ? [{ sql: `UPDATE d1_auth_refresh_families SET revoked_at=?2 WHERE user_id=?3 AND revoked_at IS NULL AND ${claimed}`, params: p }] : []),
    { sql: `UPDATE d1_auth_email_tokens SET used_at=?2 WHERE user_id=?3 AND used_at IS NULL AND ${claimed}`, params: p },
    assert(`${claimed} AND EXISTS(SELECT 1 FROM d1_auth_accounts WHERE user_id=?3 AND credential_ciphertext=?5 AND session_version=?6) AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE user_id=?3 AND revoked_at IS NULL)`, p),
  ]);
  return { status: 'changed' as const, userId: uid };
}
