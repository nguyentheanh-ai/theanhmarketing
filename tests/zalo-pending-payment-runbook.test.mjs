import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const runbookPath = path.resolve("docs/runbooks/zalo-zns-pending-payment.md");

test("pending-payment ZNS runbook documents a fail-closed one-minute rollout", () => {
  assert.ok(fs.existsSync(runbookPath), "operations runbook must exist");
  const runbook = fs.readFileSync(runbookPath, "utf8");

  assert.match(runbook, /pg_cron/i);
  assert.match(runbook, /pg_net/i);
  assert.match(runbook, /Supabase Vault/i);
  assert.match(runbook, /\*\/1 \* \* \* \*/);
  assert.match(runbook, /POST[\s\S]*\/api\/zalo\/pending-payment\/send-due/i);
  assert.match(runbook, /Authorization[\s\S]*Bearer/i);
  assert.match(runbook, /ZALO_ZNS_ENABLED=false/);
  assert.match(runbook, /ZALO_ZNS_ROLLOUT_AT/);
  assert.match(runbook, /không backfill|no backfill/i);
  assert.match(runbook, /ZALO_ZNS_DAILY_LIMIT/);
  assert.match(runbook, /test có kiểm soát|controlled test/i);
  assert.match(runbook, /tắt hoặc xóa Cron/i);
  assert.match(runbook, /không xóa[\s\S]*sent_at/i);
  assert.doesNotMatch(runbook, /CRON_SECRET\s*=\s*[^<\s`]+/i);
});
