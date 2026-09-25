// Run with PGLITE_MODULE_PATH pointing to an isolated @electric-sql/pglite install.
// All rows, clock overrides and sends below are local fixtures, never production data.
import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE_PATH).href);
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema extensions;
  create function extensions.gen_random_uuid() returns uuid language sql as 'select gen_random_uuid()';
  create table public.orders (id uuid primary key default gen_random_uuid(), order_code text, status text,
    payment_status text, email text, created_at timestamptz);
  create table public.payment_remarketing_runs (
    id uuid primary key default gen_random_uuid(), order_id uuid references orders(id), sequence_index smallint,
    product_key text, due_at timestamptz, status text default 'queued', attempt_count integer default 0,
    next_attempt_at timestamptz, lease_token uuid, lease_expires_at timestamptz, resend_email_id text,
    sent_at timestamptz, last_error text, updated_at timestamptz, unique(order_id,sequence_index));
`);
// Existing unsent work is rescheduled, but sent/cancelled history is never revived.
await db.exec(`
  insert into orders(id,order_code,status,payment_status,email,created_at) values
    ('00000000-0000-0000-0000-000000000001','HISTORY','pending','pending','fixture@example.invalid','2026-09-25T20:00:00+07:00');
  insert into payment_remarketing_runs(order_id,sequence_index,product_key,due_at,status) values
    ('00000000-0000-0000-0000-000000000001',1,'pending_order','2026-09-25T20:10:00+07:00','queued'),
    ('00000000-0000-0000-0000-000000000001',2,'pending_order','2026-09-25T20:10:00+07:00','cancelled');
`);
// Fixed clock is the only substitution in the real migration's functions.
const clock = async (value) => db.query("select set_config('test.now', $1, false)", [value]);
await clock("2026-09-26T00:30:00+07:00");
const migration = fs.readFileSync("supabase/migrations/20260925173127_payment_reminders_nearest_morning.sql", "utf8");
await db.exec(migration.replaceAll("clock_timestamp()", "current_setting('test.now')::timestamptz"));
let assertions = 0;
const history = (await db.query("select status,due_at from payment_remarketing_runs order by sequence_index")).rows;
assert.equal(new Date(history[0].due_at).toISOString(), "2026-09-26T01:30:00.000Z"); assertions++;
assert.equal(history[1].status, "cancelled"); assertions++;
assert.equal(new Date(history[1].due_at).toISOString(), "2026-09-25T13:10:00.000Z"); assertions++;
await db.exec("delete from payment_remarketing_runs; delete from orders;");
for (const [input, expected] of [
  ["2026-09-26T00:14:00+07:00", "2026-09-26T01:30:00.000Z"],
  ["2026-09-26T08:29:59+07:00", "2026-09-26T01:30:00.000Z"],
  ["2026-09-26T08:30:00+07:00", "2026-09-27T01:30:00.000Z"],
  ["2026-09-26T23:59:59+07:00", "2026-09-27T01:30:00.000Z"],
  ["2026-12-31T23:59:59+07:00", "2027-01-01T01:30:00.000Z"],
]) {
  const { rows } = await db.query("select public.next_payment_reminder_morning($1::timestamptz) as due", [input]);
  assert.equal(new Date(rows[0].due).toISOString(), expected); assertions++;
}
async function insert(code, status = "pending", paymentStatus = "pending") {
  return (await db.query("insert into orders(order_code,status,payment_status,email,created_at) values($1,$2,$3,'fixture@example.invalid','2026-09-26T00:14:00+07:00') returning id", [code,status,paymentStatus])).rows[0].id;
}
const unpaid = await insert("FIXTURE-UNPAID");
const expired = await insert("FIXTURE-EXPIRED");
const paid = await insert("FIXTURE-PAID");
await db.query("update orders set status='expired' where id=$1", [expired]);
await db.query("update orders set payment_status='paid' where id=$1", [paid]);
const claim = async () => (await db.query("select public.claim_due_payment_remarketing_runs(25) as claimed")).rows[0].claimed;
assert.deepEqual(await claim(), []); assertions++;
await clock("2026-09-26T08:29:59+07:00"); assert.deepEqual(await claim(), []); assertions++;
await clock("2026-09-26T08:30:00+07:00");
const runs = await claim();
assert.equal(runs.length, 2); assertions++;
assert.deepEqual(new Set(runs.map(r => r.order_id)), new Set([unpaid,expired])); assertions++;
assert.deepEqual(await claim(), []); assertions++; // active leases cannot be claimed twice
const run = runs.find(r=>r.order_id===unpaid);
const finish = (r,success) => db.query("select public.finish_payment_remarketing_run($1,$2,$3,$4,$5) as result", [r.run_id,r.lease_token,success,success?'fixture-id':null,success?null:'fixture-failure']);
assert.equal((await finish(run,true)).rows[0].result.finish_state,"sent"); assertions++;
assert.equal((await finish(run,true)).rows[0].result.finish_state,"lost_lease"); assertions++;
const due2 = (await db.query("select due_at from payment_remarketing_runs where order_id=$1 and sequence_index=2",[unpaid])).rows[0].due_at;
assert.equal(new Date(due2).toISOString(),"2026-09-27T01:30:00.000Z"); assertions++;
const failed = runs.find(r=>r.order_id===expired); await finish(failed,false);
const retry = (await db.query("select next_attempt_at from payment_remarketing_runs where id=$1",[failed.run_id])).rows[0].next_attempt_at;
assert.equal(new Date(retry).toISOString(),"2026-09-27T01:30:00.000Z"); assertions++;
await clock("2026-09-27T00:00:00+07:00"); assert.deepEqual(await claim(), []); assertions++;
await clock("2026-09-27T08:30:00+07:00"); const next = await claim(); assert.equal(next.length,2); assertions++;
await db.query("update orders set status='paid',payment_status='paid' where id=$1",[unpaid]);
assert.equal((await finish(next.find(r=>r.order_id===unpaid),true)).rows[0].result.finish_state,"lost_lease"); assertions++;
await clock("2026-09-28T09:00:00+07:00"); assert.deepEqual(await claim(), []); assertions++;
// Helpers and privileged queue functions remain service-only.
const grants = (await db.query("select has_function_privilege('anon','public.claim_due_payment_remarketing_runs(integer)','execute') as anon, has_function_privilege('authenticated','public.next_payment_reminder_morning(timestamptz)','execute') as authenticated, has_function_privilege('service_role','public.claim_due_payment_remarketing_runs(integer)','execute') as service")).rows[0];
assert.deepEqual(grants,{anon:false,authenticated:false,service:true}); assertions++;
console.log(JSON.stringify({ok:true,assertions,environment:'isolated PostgreSQL (PGlite)',realEmailsSent:0}));
await db.close();
