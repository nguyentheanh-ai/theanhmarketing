import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function load(relativePath, imports = {}, Clock = Date) {
  const source = fs.readFileSync(relativePath, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const cjsModule = { exports: {} };
  new Function("module", "exports", "require", "Date", compiled)(cjsModule, cjsModule.exports, (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, Clock);
  return cjsModule.exports;
}
const schedulePath = "lib/notifications/payment-reminder-schedule.ts";
const schedule = load(schedulePath);
for (const [local, expected] of [["00:00", false], ["00:25", false], ["08:29", false], ["08:30", true], ["08:55", true], ["09:00", false], ["21:00", false]]) {
  test(`morning send guard at ${local} Vietnam`, () => {
    assert.equal(schedule.isPaymentReminderMorning(new Date(`2026-09-26T${local}:00+07:00`)), expected);
  });
}
test("expired unpaid orders remain eligible; either paid flag cancels reminders", () => {
  for (const status of ["pending", "expired"]) {
    assert.equal(schedule.isUnpaidReminderOrder({ status }), true);
    assert.equal(schedule.isUnpaidReminderOrder({ status, paymentStatus: "paid" }), false);
  }
  for (const status of ["paid", "failed"]) assert.equal(schedule.isUnpaidReminderOrder({ status }), false);
});

function workerFixture(local, statuses) {
  const fixed = new Date(`2026-09-26T${local}:00+07:00`).getTime();
  class Clock extends Date { constructor(value = fixed) { super(value); } static now() { return fixed; } }
  const calls = [], queue = statuses.map((status, i) => ({ run_id: `run-${i}`, order_id: `order-${i}`, order_code: `TAM-${i}`, sequence_index: 1, lease_token: `lease-${i}`, status }));
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === "claim_due_payment_remarketing_runs") return { data: queue.splice(0, args.p_limit), error: null };
      return { data: { finish_state: name === "cancel_payment_remarketing_run" ? "cancelled" : "sent" }, error: null };
    },
    from() { return { select() { return this; }, eq(_, id) { this.id = id; return this; }, async maybeSingle() {
      const index = Number(this.id.split("-")[1]);
      return { error: null, data: { id: this.id, status: statuses[index], payment_status: statuses[index] === "paid" ? "paid" : "pending", email: "fixture@example.invalid", order_code: `TAM-${index}`, amount: 1, order_items: [] } };
    } }; },
  };
  const api = load("lib/notifications/payment-reminder-email.ts", {
    "@/lib/notifications/payment-reminder-schedule": load(schedulePath, {}, Clock),
    "@/lib/notifications/pending-payment-email": { buildPendingPaymentEmailPayload: () => ({ html: '<td style="padding:34px">', text: "fixture", to: "fixture@example.invalid" }) },
    "@/lib/tracking/attribution": { normalizeAttribution: () => ({}) },
    "@/lib/orders/invoice": { emptyInvoiceDetails: {} },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => { calls.push({ name: "create-client" }); return client; } },
    "@/services/emailLogService": { recordEmailLog: async () => {} },
  }, Clock);
  return { api, calls };
}
test("night worker returns before connecting or claiming", async () => {
  const { api, calls } = workerFixture("00:25", ["pending"]);
  assert.equal((await api.dispatchDuePaymentReminderRuns()).sent, 0);
  assert.equal(calls.length, 0);
});
test("morning worker drains more than one batch and cancels a newly paid order", async () => {
  const { api, calls } = workerFixture("08:30", ["pending", "expired", "paid", "pending", "expired", "pending", "expired"]);
  const oldFetch = globalThis.fetch, oldKey = process.env.RESEND_API_KEY;
  let sent = 0;
  process.env.RESEND_API_KEY = "fixture";
  globalThis.fetch = async (_url, init) => {
    assert.match(init.headers["Idempotency-Key"], /^payment-reminder\/run-/);
    sent += 1;
    return { ok: true, json: async () => ({ id: `fake-${sent}` }) };
  };
  try {
    const result = await api.dispatchDuePaymentReminderRuns();
    assert.equal(result.sent, 6);
    assert.equal(result.cancelled, 1);
    assert.equal(sent, 6);
    assert.equal(calls.filter((c) => c.name === "claim_due_payment_remarketing_runs").length, 4);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
  }
});
