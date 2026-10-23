import bcrypt from 'bcryptjs';
import { buildAutoStudentAccountCredentials } from '@/lib/auth/student-account';
import { isAgentKitPreorderDepositOrder } from '@/lib/agent-kit-preorder';
import { isConsultationOrder } from '@/lib/consultation/constants';
import { SUPPORT_PRODUCT_SLUG } from '@/lib/support-booking/constants';
import { nativeAuthoritySql, type AuthorityHandoff } from './d1-data-authority';
import { sealLegacyBcryptHash, openLegacyBcryptHash, verifyLegacyBcryptPassword } from './legacy-password';
import { validNativeNewPassword } from './d1-password-change';
import { NativePaymentDenied, NativePaymentUnavailable, type NativeOrderDatabase } from './native-order-settlement';

type Options = { nativeAuthority: AuthorityHandoff; credentialKey: string; approvedOrders: readonly string[] };
// Backend-only candidate. Requires pinned native Auth authority, verified paid
// access evidence and a bounded QA order cohort. Never resets an existing user.
export async function provisionNativePaidAccount(db: NativeOrderDatabase, code: string, options: Options) {
  const project = 'vsxxgdzwtscuxcmjfckt';
  if (options.nativeAuthority?.projectId !== project || !/^TAM[A-Z0-9]{1,77}$/.test(code) || !options.approvedOrders.includes(code) || options.approvedOrders.length > 10) throw new NativePaymentDenied();
  const stamp = new Date().toISOString();
  const ready = `${nativeAuthoritySql(options.nativeAuthority, 2)} AND EXISTS(SELECT 1 FROM d1_native_order_authority WHERE source_project_id='${project}' AND status='verified' AND julianday(snapshot_at) BETWEEN julianday('now','-5 minutes') AND julianday('now') AND julianday(verified_at) BETWEEN julianday('now','-5 minutes') AND julianday('now'))`;
  const proof = `SELECT p.order_snapshot,p.receipt_key,p.order_revision FROM d1_native_order_access_applied p JOIN d1_native_order_fulfillment f ON f.order_code=p.order_code AND f.order_snapshot=p.order_snapshot AND f.receipt_key=p.receipt_key AND f.order_revision=p.order_revision JOIN d1_native_orders o ON o.order_code=p.order_code AND o.row_json=p.order_snapshot AND o.revision=p.order_revision AND o.status='paid' JOIN d1_native_sepay_receipts r ON r.event_key=p.receipt_key AND r.order_code=p.order_code WHERE p.order_code=?1 AND ${ready}`;
  const row = await db.first(proof, [code, stamp]);
  if (!row || typeof row.order_snapshot !== 'string') throw new NativePaymentUnavailable();
  const source = JSON.parse(row.order_snapshot) as Record<string, unknown>;
  const text = (key: string) => typeof source[key] === 'string' ? source[key] as string : '';
  const items = (Array.isArray(source.order_items) ? source.order_items : []) as { slug: string; title: string; price: number }[];
  const product = { courseSlug: text('course_slug'), courseTitle: text('course_title'), paymentPlan: text('payment_plan'), orderItems: items };
  // Bot 24/7 là phần mềm: không tạo tài khoản học viên (email riêng gửi bộ cài)
  if (product.courseSlug === "bot-24-7" || items.some(item => item.slug === "bot-24-7") || product.courseSlug === SUPPORT_PRODUCT_SLUG || items.some(item => item.slug === SUPPORT_PRODUCT_SLUG) || isConsultationOrder(product) || isAgentKitPreorderDepositOrder(product)) return { skipped: true as const, reason: 'product_has_no_account_fulfillment' };
  const credentials = buildAutoStudentAccountCredentials({ studentName: text('student_name'), email: text('email'), phone: text('phone') });
  if (!credentials.email || credentials.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) throw new NativePaymentDenied();
  const prior = await db.first('SELECT id FROM d1_access_users WHERE normalized_email=?1', [credentials.email]);
  if (!prior && !validNativeNewPassword(credentials.password)) throw new NativePaymentDenied();
  const candidate = crypto.randomUUID();
  const cipher = prior ? null : await sealLegacyBcryptHash(await bcrypt.hash(credentials.password, 10), options.credentialKey, { projectId: project, userId: candidate });
  const metadata = JSON.stringify({ full_name: text('student_name'), phone: text('phone'), must_change_password: true, auto_created_from_paid_order: true, source_order_code: code, native_paid_order: code, enrolled_course_slug: product.courseSlug, enrolled_course_title: product.courseTitle });
  const params = [code, stamp, row.order_snapshot, credentials.email, candidate, cipher, metadata];
  const current = `EXISTS(SELECT 1 FROM (${proof}) p WHERE p.order_snapshot=?3)`;
  const active = `a.deleted_at IS NULL AND a.is_anonymous=0 AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2) AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2))`;
  try {
    const result = await db.batch([
      { sql: `INSERT INTO d1_access_users(id,normalized_email) SELECT ?5,?4 WHERE ${current} AND ?6 IS NOT NULL AND typeof(?7)='text' ON CONFLICT(normalized_email) DO NOTHING`, params },
      { sql: `INSERT INTO d1_auth_accounts(user_id,credential_ciphertext,email_confirmed_at,must_change_password,user_metadata,created_at,updated_at) SELECT ?5,?6,?2,1,?7,?2,?2 WHERE ${current} AND ?6 IS NOT NULL AND EXISTS(SELECT 1 FROM d1_access_users WHERE id=?5 AND normalized_email=?4) ON CONFLICT(user_id) DO NOTHING`, params },
      { sql: `INSERT INTO d1_native_paid_accounts(order_code,order_snapshot,user_id,created_account,initial_ciphertext) SELECT ?1,?3,u.id,CASE WHEN u.id=?5 THEN 1 ELSE 0 END,CASE WHEN u.id=?5 THEN ?6 ELSE NULL END FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE u.normalized_email=?4 AND ${active} AND ${current} AND typeof(?7)='text' ON CONFLICT(order_code) DO NOTHING`, params },
      { sql: `SELECT CASE WHEN ${current} AND EXISTS(SELECT 1 FROM d1_native_paid_accounts p JOIN d1_access_users u ON u.id=p.user_id JOIN d1_auth_accounts a ON a.user_id=u.id WHERE p.order_code=?1 AND p.order_snapshot=?3 AND u.normalized_email=?4 AND ${active}) THEN 1 ELSE abs(-9223372036854775808) END AS provisioned`, params: params.slice(0,4) },
    ]);
    if (result[3]?.results?.[0]?.provisioned !== 1) throw new NativePaymentUnavailable();
  } catch { throw new NativePaymentUnavailable(); }
  const receipt = await db.first(`SELECT p.user_id,p.created_account,p.initial_ciphertext,a.credential_ciphertext,a.must_change_password,a.session_version FROM d1_native_paid_accounts p JOIN d1_access_users u ON u.id=p.user_id JOIN d1_auth_accounts a ON a.user_id=u.id WHERE p.order_code=?1 AND p.order_snapshot=?3 AND u.normalized_email=?4 AND ${active} AND ${current}`, params.slice(0,4));
  if (!receipt || typeof receipt.user_id !== 'string') throw new NativePaymentUnavailable();
  let temporaryPassword: string | null = null;
  if (receipt.created_account === 1 && receipt.must_change_password === 1 && receipt.session_version === 1 && receipt.initial_ciphertext === receipt.credential_ciphertext && typeof receipt.credential_ciphertext === 'string') {
    const hash = await openLegacyBcryptHash(receipt.credential_ciphertext, options.credentialKey, { projectId: project, userId: receipt.user_id });
    if (!await verifyLegacyBcryptPassword(credentials.password, hash)) throw new NativePaymentUnavailable();
    temporaryPassword = credentials.password;
  }
  // Server memory only. Never serialize this result to a public route or log it.
  return { skipped: false as const, userId: receipt.user_id, email: credentials.email, created: receipt.created_account === 1, temporaryPassword };
}
