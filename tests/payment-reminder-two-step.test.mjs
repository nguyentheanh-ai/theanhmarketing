import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("payment reminder worker is cron-protected and dispatches the two-step service", () => {
  const source = read("app/api/email/worker/send-due/route.ts");

  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /Authorization/);
  assert.match(source, /dispatchDuePaymentReminderRuns/);
  assert.doesNotMatch(source, /PAYMENT_REMARKETING_DISABLED|status:\s*410/);
});

test("Vercel invokes the reminder worker every five minutes", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(
    config.crons.find((cron) => cron.path === "/api/email/worker/send-due"),
    { path: "/api/email/worker/send-due", schedule: "*/5 * * * *" },
  );
});

test("migration seeds only new pending orders and never restores the legacy backlog", () => {
  const sql = read("supabase/migrations/20260828113000_enable_two_step_payment_reminders.sql");

  assert.match(sql, /interval\s+'10 minutes'/i);
  assert.match(sql, /sequence_index[^;]+1/is);
  assert.match(sql, /after insert on public\.orders/i);
  assert.match(sql, /o\.status\s*=\s*'pending'/i);
  assert.match(sql, /coalesce\(trim\(o\.email\),\s*''\)\s*<>\s*''/i);
  assert.doesNotMatch(sql, /select\s+public\.seed_payment_remarketing_runs\(id\)\s+from\s+public\.orders/i);
});

test("second reminder waits four hours after the first successful send and only claims from 09:00 to 21:00 Vietnam time", () => {
  const sql = read("supabase/migrations/20260828113000_enable_two_step_payment_reminders.sql");

  assert.match(sql, /sequence_index[^;]+2/is);
  assert.match(sql, /v_now\s*\+\s*interval\s+'4 hours'/i);
  assert.match(sql, /Asia\/Ho_Chi_Minh/i);
  assert.match(sql, /sequence_index\s*=\s*1[\s\S]+sequence_index\s*=\s*2/i);
  assert.match(sql, /time\s+'09:00'/i);
  assert.match(sql, /time\s+'21:00'/i);
  assert.match(sql, /previous_run\.status\s*=\s*'sent'/i);
  assert.doesNotMatch(sql, /previous_run\.opened_at\s+is\s+not\s+null/i);
});

test("paid or expired orders cancel unsent reminders and the worker rechecks status before Resend", () => {
  const sql = read("supabase/migrations/20260828113000_enable_two_step_payment_reminders.sql");
  const service = read("lib/notifications/payment-reminder-email.ts");

  assert.match(sql, /after update of status on public\.orders/i);
  assert.match(sql, /status\s*=\s*'cancelled'/i);
  assert.match(service, /\.from\("orders"\)/);
  assert.match(service, /order\.status\s*!==\s*"pending"/);
  assert.match(service, /cancel_payment_remarketing_run/);
  assert.match(service, /Idempotency-Key/);
  assert.match(service, /payment_reminder_\$\{run\.sequence_index\}/);
});

test("the new migration retires the obsolete database cron to prevent duplicate worker calls", () => {
  const sql = read("supabase/migrations/20260828113000_enable_two_step_payment_reminders.sql");
  assert.match(sql, /cron\.unschedule/i);
  assert.match(sql, /payment-remarketing-send-due/i);
});
