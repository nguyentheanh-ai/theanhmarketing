import type { AuthorityHandoff } from './d1-data-authority';
import { createD1AuthDatabase } from './d1-auth-database';
import { consumeD1AuthAttempt } from './d1-auth-rate-limit';
import { createOrderDatabase } from './native-payment-stage';
import { createResendSender, type NativeMailSender } from './native-paid-email';
import { buildPasswordResetEmail } from '@/lib/notifications/password-reset-email';
import { completeNativeRecovery, confirmNativeSignup, normalizeSignupEmail, requestNativeRecovery, requestNativeSignup, NativeEmailAuthUnavailable } from './d1-auth-signup-recovery';
import type { NativeStageEnv } from './native-stage-router';

export type NativeEmailAuthEnv = Pick<NativeStageEnv, 'NATIVE_AUTH_DB' | 'NATIVE_AUTH_CREDENTIAL_KEY' | 'NATIVE_AUTH_LIMITER_KEY'> & {
  CF_NATIVE_QA_EMAIL_AUTH_MODE?: string; CF_NATIVE_QA_EMAIL_AUTH_EMAILS?: string; CF_NATIVE_DATA_MODE?: string; NATIVE_AUTH_AUTHORITY?: string; NATIVE_RESEND_API_KEY?: string;
};
const STAGING_ORIGIN = 'https://theanh-main-cf-staging.12c1thdtheanh.workers.dev', PROJECT = 'vsxxgdzwtscuxcmjfckt';
const PATHS = new Set(['/api/cloudflare-auth/signup', '/api/cloudflare-auth/confirm', '/api/cloudflare-auth/forgot-password', '/api/cloudflare-auth/recovery', '/api/cloudflare-auth/recovery/complete']);
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers });
const redirect = (path: string) => new Response(null, { status: 303, headers: { ...headers, Location: path } });
// Same wording as the production forgot-password route.
const MSG = {
  sent: 'Email đã tồn tại trong hệ thống. Hệ thống đã gửi link đặt lại mật khẩu qua email để anh/chị tạo mật khẩu mới.',
  notFound: 'Email này chưa tồn tại trong hệ thống. Anh/chị kiểm tra lại email hoặc đăng ký tài khoản mới.',
  invalidEmail: 'Email chưa đúng định dạng. Anh/chị kiểm tra lại email rồi gửi lại.',
  unavailable: 'Hệ thống chưa kiểm tra được tài khoản email lúc này. Anh/chị thử lại sau ít phút.',
};
const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]!));

function signupEmail(email: string, url: string) {
  const link = esc(url);
  return { from: 'The Anh Marketing <noreply@theanhmarketing.com>', to: email, subject: 'Xác nhận email đăng ký The Anh Marketing',
    text: ['Anh/chị vừa đăng ký tài khoản tại The Anh Marketing.', '', 'Bấm link sau để xác nhận email (hiệu lực 24 giờ):', url, '', 'Nếu anh/chị không đăng ký, hãy bỏ qua email này.'].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><p>Anh/chị vừa đăng ký tài khoản tại The Anh Marketing.</p><p><a href="${link}" style="display:inline-block;background:#d8b653;color:#111;padding:12px 18px;border-radius:8px;font-weight:700;text-decoration:none">Xác nhận email</a></p><p style="color:#666;font-size:13px">Link có hiệu lực 24 giờ. Nếu anh/chị không đăng ký, hãy bỏ qua email này.</p></div>` };
}
// Minimal self-contained reset form. GET never consumes the token (mail link
// scanners), the POST below does. No external assets or inline token in logs.
function resetPage() {
  return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đặt lại mật khẩu</title>
<body style="font-family:Arial,sans-serif;max-width:420px;margin:48px auto;padding:0 16px"><h1 style="font-size:22px">Đặt lại mật khẩu</h1>
<form id="f"><label>Mật khẩu mới (ít nhất 8 ký tự)<br><input id="p" type="password" minlength="8" required style="width:100%;padding:10px;margin:8px 0"></label>
<button style="padding:10px 16px">Lưu mật khẩu</button></form><p id="m" role="status"></p>
<script>const t=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'',location.pathname);
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/cloudflare-auth/recovery/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:t,newPassword:document.getElementById('p').value})});const d=await r.json().catch(()=>({}));document.getElementById('m').textContent=d.message||'Có lỗi, vui lòng thử lại.';if(r.ok)setTimeout(()=>location.href='/dang-nhap',1500)};</script></body></html>`,
    { status: 200, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'" } });
}
async function body(request: Request, origin: string) {
  if (request.headers.get('origin') !== origin) return null; // CSRF: same-origin browser POST only
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return null;
  const text = await request.text(); if (text.length > 4096) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}

// Staging A only, default disabled (returns null so the existing router answers).
// QA mode accepts only emails in CF_NATIVE_QA_EMAIL_AUTH_EMAILS and needs a
// pinned native Auth authority plus a Resend key; otherwise 503.
// Shared senders for the same-origin /auth/v1 surface (supabase-js signUp/resetPasswordForEmail).
export async function sendNativeAuthEmail(kind: 'signup' | 'recovery', email: string, token: string, origin: string, send: NativeMailSender) {
  const mail = kind === 'signup' ? signupEmail(email, `${origin}/api/cloudflare-auth/confirm?token=${token}`) : { ...buildPasswordResetEmail({ email, resetUrl: `${origin}/doi-mat-khau?mode=reset#token=${token}` }), to: email };
  return send(mail as Parameters<NativeMailSender>[0], `tam-native-${kind}/${token.slice(0, 16)}`);
}

export async function handleNativeEmailAuth(request: Request, env: NativeEmailAuthEnv, deps: { send?: NativeMailSender } = {}): Promise<Response | null> {
  const url = new URL(request.url);
  // Native data mode (after writer switch) serves every user on the request origin.
  const full = env.CF_NATIVE_DATA_MODE === 'd1', ORIGIN = full ? url.origin : STAGING_ORIGIN;
  if (!PATHS.has(url.pathname) || (!full && (env.CF_NATIVE_QA_EMAIL_AUTH_MODE ?? 'disabled') === 'disabled')) return null;
  if (!full && (env.CF_NATIVE_QA_EMAIL_AUTH_MODE !== 'qa' || url.origin !== ORIGIN)) return json(503, { ok: false, status: 'unavailable', message: MSG.unavailable });
  let allowed: string[], authority: AuthorityHandoff, send: NativeMailSender;
  try {
    const list: unknown = full ? [] : JSON.parse(env.CF_NATIVE_QA_EMAIL_AUTH_EMAILS ?? '[]');
    if (!full && (!Array.isArray(list) || !list.length || list.length > 10 || list.some(e => normalizeSignupEmail(e) !== e))) throw Error();
    allowed = list as string[];
    authority = JSON.parse(env.NATIVE_AUTH_AUTHORITY ?? 'null'); if (!authority) throw Error();
    send = deps.send ?? createResendSender(env.NATIVE_RESEND_API_KEY ?? '');
    if (!/^[A-Za-z0-9_-]{43}$/.test(env.NATIVE_AUTH_LIMITER_KEY ?? '')) throw Error();
  } catch { return json(503, { ok: false, status: 'unavailable', message: MSG.unavailable }); }
  const db = createOrderDatabase(env.NATIVE_AUTH_DB), limiter = createD1AuthDatabase(env.NATIVE_AUTH_DB);
  const options = { nativeAuthority: authority, credentialKey: env.NATIVE_AUTH_CREDENTIAL_KEY };
  const limit = async (subject: string) => { const ip = request.headers.get('CF-Connecting-IP'); if (!ip) return false; return (await consumeD1AuthAttempt(limiter, { projectId: PROJECT, ip, email: subject }, { secret: env.NATIVE_AUTH_LIMITER_KEY, ip: { limit: 10, windowMs: 60000 }, email: { limit: 5, windowMs: 30 * 60000 } })).allowed; };
  try {
    if (url.pathname === '/api/cloudflare-auth/confirm' || url.pathname === '/api/cloudflare-auth/recovery') {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET' } });
      if (url.pathname === '/api/cloudflare-auth/recovery') return resetPage();
      const r = await confirmNativeSignup(db, url.searchParams.get('token'), options);
      return redirect(r.status === 'confirmed' ? '/dang-nhap?confirmed=1' : '/dang-nhap?confirm_error=' + r.status);
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
    const input = await body(request, ORIGIN); if (!input) return json(400, { ok: false, status: 'invalid_request', message: 'Yêu cầu không hợp lệ.' });
    if (url.pathname === '/api/cloudflare-auth/recovery/complete') {
      if (!await limit('recovery-complete@native.invalid')) return json(429, { ok: false, status: 'rate_limited', message: 'Vui lòng thử lại sau ít phút.' });
      try {
        const r = await completeNativeRecovery(db, { token: input.token, newPassword: input.newPassword }, { ...options, refreshFamilies: true });
        return r.status === 'changed' ? json(200, { ok: true, status: 'changed', message: 'Đã đặt lại mật khẩu. Anh/chị đăng nhập lại bằng mật khẩu mới.' }) : json(400, { ok: false, status: 'invalid_token', message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
      } catch (e) { if (e instanceof RangeError) return json(400, { ok: false, status: 'weak_password', message: 'Mật khẩu mới cần ít nhất 8 ký tự.' }); throw e; }
    }
    const email = normalizeSignupEmail(input.email);
    if (!email) return json(400, { ok: false, status: 'invalid_email', message: MSG.invalidEmail });
    if (!full && !allowed.includes(email)) return json(403, { ok: false, status: 'not_in_qa', message: MSG.unavailable });
    if (!await limit(email)) return json(429, { ok: false, status: 'rate_limited', message: 'Vui lòng thử lại sau ít phút.' });
    if (url.pathname === '/api/cloudflare-auth/forgot-password') {
      const r = await requestNativeRecovery(db, email, options);
      if (r.status === 'not_found') return json(404, { ok: false, status: 'not_found', message: MSG.notFound });
      const mail = buildPasswordResetEmail({ email, resetUrl: `${ORIGIN}/doi-mat-khau?mode=reset#token=${r.token}` });
      const sent = await send({ ...mail, to: email } as Parameters<NativeMailSender>[0], `tam-native-recovery/${r.token.slice(0, 16)}`);
      return sent.ok ? json(200, { ok: true, status: 'sent', message: MSG.sent }) : json(502, { ok: false, status: 'failed', message: MSG.unavailable });
    }
    // signup
    try {
      const r = await requestNativeSignup(db, { email, password: input.password, fullName: input.fullName, phone: input.phone, interestedCourse: input.interestedCourse }, options);
      if (r.status !== 'exists') {
        const sent = await send(signupEmail(email, `${ORIGIN}/api/cloudflare-auth/confirm?token=${r.token}`) as Parameters<NativeMailSender>[0], `tam-native-signup/${r.token.slice(0, 16)}`);
        if (!sent.ok) return json(502, { ok: false, status: 'failed', message: MSG.unavailable });
      }
      // Same response for new and existing emails (Supabase signUp does not reveal it).
      return json(200, { ok: true, status: 'pending_confirmation', message: 'Vui lòng kiểm tra email để xác nhận tài khoản.' });
    } catch (e) { if (e instanceof RangeError) return json(400, { ok: false, status: 'weak_password', message: 'Mật khẩu cần ít nhất 8 ký tự.' }); throw e; }
  } catch (e) {
    return json(503, { ok: false, status: e instanceof NativeEmailAuthUnavailable ? 'unavailable' : 'failed', message: MSG.unavailable });
  }
}
