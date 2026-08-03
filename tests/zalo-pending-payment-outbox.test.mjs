import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(relativePath, "utf8");
}

test("pending-payment ZNS uses an exact-scope lease-fenced outbox", () => {
  const sql = read(
    "supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql",
  );

  assert.match(sql, /claim_pending_payment_zns_orders/);
  assert.match(sql, /finish_pending_payment_zns_order/);
  assert.match(sql, /FOR UPDATE\s+SKIP LOCKED/i);
  assert.match(sql, /interval\s*'5 minutes'/i);
  assert.match(sql, /interval\s*'10 minutes'/i);
  assert.match(sql, /interval\s*'24 hours'/i);
  assert.match(sql, /zns_pending_payment_attempt_count\s*<\s*3/i);
  assert.match(sql, /o\.status\s*=\s*'pending'/i);
  assert.match(sql, /facebook-ads-2026/);
  assert.match(sql, /ebook-facebook-ads-2026/);
  assert.match(sql, /not exists[\s\S]*not in\s*\([\s\S]*facebook-ads-2026[\s\S]*ebook-facebook-ads-2026/i);
  assert.match(sql, /lease_token\s+is distinct from\s+p_lease_token/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /p_rollout_at/i);
  assert.match(sql, /p_daily_limit/i);
  assert.match(sql, /grant execute[\s\S]*service_role/i);
  assert.doesNotMatch(
    sql,
    /(?:access_token|refresh_token)\s*=\s*'[A-Za-z0-9_-]{16,}'/i,
  );
});

test("Zalo OAuth credentials rotate behind service-role-only fenced RPCs", () => {
  const sql = read(
    "supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql",
  );

  assert.match(sql, /create schema if not exists private/i);
  assert.match(sql, /private\.zalo_oauth_credentials/i);
  assert.match(sql, /get_zalo_oauth_credentials/);
  assert.match(sql, /claim_zalo_oauth_refresh/);
  assert.match(sql, /finish_zalo_oauth_refresh/);
  assert.match(sql, /refresh_lease_token/);
  assert.match(sql, /refresh_lease_expires_at/);
  assert.match(sql, /refresh_token\s*=\s*p_refresh_token/i);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/i);
});

test("terminal ZNS outcomes clear leases and sent remains permanent", () => {
  const sql = read(
    "supabase/migrations/20260803090000_zalo_pending_payment_outbox.sql",
  );

  for (const outcome of ["sent", "retry", "cancelled", "dead"]) {
    assert.match(sql, new RegExp(`'${outcome}'`));
  }
  assert.match(sql, /zns_pending_payment_sent_at\s*=\s*case[\s\S]*p_outcome\s*=\s*'sent'/i);
  assert.match(sql, /zns_pending_payment_lease_token\s*=\s*null/i);
  assert.match(sql, /zns_pending_payment_lease_expires_at\s*=\s*null/i);
});
