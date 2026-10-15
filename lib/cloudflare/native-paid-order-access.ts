import { NativePaymentDenied, NativePaymentUnavailable, type NativeOrderDatabase } from './native-order-settlement';

// Candidate only: call with an explicitly approved QA cohort. This applies the
// paid-order input to the existing access resolver; it does not create users,
// remove admin revokes, send mail, or claim the whole fulfillment is complete.
export async function applyNativePaidOrderAccess(db: NativeOrderDatabase, orderCode: string, approvedOrders: readonly string[]) {
  if (!/^TAM[A-Z0-9]{1,77}$/.test(orderCode) || approvedOrders.length < 1 || approvedOrders.length > 10 || !approvedOrders.includes(orderCode)) throw new NativePaymentDenied();
  const ready = `EXISTS(SELECT 1 FROM d1_native_order_authority WHERE source_project_id='vsxxgdzwtscuxcmjfckt' AND status='verified' AND julianday(snapshot_at) BETWEEN julianday('now','-5 minutes') AND julianday('now') AND julianday(verified_at) BETWEEN julianday('now','-5 minutes') AND julianday('now'))`;
  const row = await db.first(`SELECT f.order_snapshot,f.order_revision,f.receipt_key FROM d1_native_order_fulfillment f JOIN d1_native_orders o ON o.order_code=f.order_code JOIN d1_native_sepay_receipts r ON r.event_key=f.receipt_key AND r.order_code=o.order_code WHERE f.order_code=?1 AND o.status='paid' AND o.revision=f.order_revision AND o.row_json=f.order_snapshot AND ${ready}`, [orderCode]);
  if (!row || typeof row.order_snapshot !== 'string' || typeof row.receipt_key !== 'string' || !Number.isSafeInteger(row.order_revision)) throw new NativePaymentUnavailable();
  const source = JSON.parse(row.order_snapshot) as Record<string, unknown>;
  if (typeof source.id !== 'string' || typeof source.email !== 'string' || !source.email.trim() || source.order_code !== orderCode || source.status !== 'paid') throw new NativePaymentDenied();
  for (const key of ['course_slug', 'course_title', 'payment_plan']) if (source[key] != null && typeof source[key] !== 'string') throw new NativePaymentDenied();
  if (source.order_items != null && (!Array.isArray(source.order_items) || source.order_items.some(item => !item || typeof item !== 'object' || typeof item.slug !== 'string' || typeof item.title !== 'string'))) throw new NativePaymentDenied();
  const params: (string | number | null)[] = [orderCode, row.order_snapshot, Number(row.order_revision), row.receipt_key, source.id, source.email.trim().toLowerCase(), source.course_slug as string ?? null, source.course_title as string ?? null, source.payment_plan as string ?? null, JSON.stringify(source.order_items ?? [])];
  const current = `EXISTS(SELECT 1 FROM d1_native_order_fulfillment f JOIN d1_native_orders o ON o.order_code=f.order_code JOIN d1_native_sepay_receipts r ON r.event_key=f.receipt_key AND r.order_code=f.order_code WHERE f.order_code=?1 AND f.order_snapshot=?2 AND f.order_revision=?3 AND f.receipt_key=?4 AND o.row_json=?2 AND o.revision=?3 AND o.status='paid') AND ${ready}`;
  const same = `id=?5 AND normalized_email=?6 AND course_slug IS ?7 AND course_title IS ?8 AND payment_plan IS ?9 AND order_items_json=?10 AND deleted_at IS NULL`;
  const applied = `EXISTS(SELECT 1 FROM d1_native_order_access_applied WHERE order_code=?1 AND receipt_key=?4 AND order_revision=?3 AND order_snapshot=?2)`;
  const statements = [
    { sql: `INSERT INTO d1_access_orders(id,normalized_email,status,course_slug,course_title,payment_plan,order_items_json) SELECT ?5,?6,'paid',?7,?8,?9,?10 WHERE ${current} ON CONFLICT(id) DO UPDATE SET status='paid' WHERE ${same} AND d1_access_orders.status IN ('pending','expired','failed','paid')`, params },
    { sql: `INSERT INTO d1_native_order_access_applied(order_code,receipt_key,order_revision,order_snapshot) SELECT ?1,?4,?3,?2 WHERE ${current} AND EXISTS(SELECT 1 FROM d1_access_orders WHERE ${same} AND status='paid') ON CONFLICT(order_code) DO NOTHING`, params },
    { sql: `SELECT CASE WHEN ${current} AND ${applied} AND EXISTS(SELECT 1 FROM d1_access_orders WHERE ${same} AND status='paid') THEN 1 ELSE abs(-9223372036854775808) END AS applied`, params },
  ];
  try {
    const results = await db.batch(statements);
    if (results[2]?.results?.[0]?.applied !== 1) throw new NativePaymentUnavailable();
  } catch {
    // A lost acknowledgement is retryable. Repeating this exact transaction is
    // safe; never acknowledge an uncertain or partially committed access grant.
    throw new NativePaymentUnavailable();
  }
  return { status: 'applied' as const };
}
