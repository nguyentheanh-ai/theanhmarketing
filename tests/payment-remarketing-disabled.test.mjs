import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const routePath = path.join(root, "app/api/email/worker/send-due/route.ts");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260828070000_disable_legacy_payment_remarketing.sql",
);

test("legacy payment remarketing worker is fail-closed", () => {
  assert.equal(fs.existsSync(routePath), true, "disabled worker route must exist");
  const source = fs.readFileSync(routePath, "utf8");
  assert.match(source, /status:\s*410/);
  assert.match(source, /PAYMENT_REMARKETING_DISABLED/);
  assert.doesNotMatch(source, /resend|claim_due_payment_remarketing_runs|\.send\s*\(/i);
});

test("database migration disables seeding and claiming without touching orders", () => {
  assert.equal(fs.existsSync(migrationPath), true, "disable migration must exist");
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert.match(sql, /drop trigger if exists payment_remarketing_runs_after_order_insert/i);
  assert.match(sql, /delete from public\.payment_remarketing_runs\s+where status <> 'sent'/i);
  assert.match(sql, /create or replace function public\.claim_due_payment_remarketing_runs/i);
  assert.match(sql, /return '\[\]'::jsonb/i);
  assert.doesNotMatch(sql, /delete from public\.orders|update public\.orders/i);
});
