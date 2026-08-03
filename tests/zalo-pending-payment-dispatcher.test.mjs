import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadDispatcherModule() {
  const source = fs.readFileSync(
    path.resolve("lib/zalo/pending-payment-outbox.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "@/lib/zalo/client") {
      return { sendPendingPaymentZbs: async () => ({ ok: false }) };
    }
    if (specifier === "@/lib/zalo/pending-payment") {
      return {
        isPendingPaymentZnsEligible(order) {
          const allowed = new Set([
            "facebook-ads-2026",
            "ebook-facebook-ads-2026",
          ]);
          const slugs = [
            ...String(order.courseSlug ?? "").split(","),
            ...(order.orderItems ?? []).map((item) => item.slug ?? ""),
          ].map((value) => value.trim()).filter(Boolean);
          return slugs.length > 0 && slugs.every((slug) => allowed.has(slug));
        },
        buildPendingPaymentZbsPayload(order) {
          if (!/^0(?:3|5|7|8|9)\d{8}$/.test(order.phone)) {
            throw new Error("invalid_phone");
          }
          return {
            phone: `84${order.phone.slice(1)}`,
            trackingId: `PP${order.orderCode}`,
            paymentUrl: `https://www.theanhmarketing.com/thanh-toan/${order.orderCode}?openBank=1`,
            templateData: {},
          };
        },
      };
    }
    if (specifier === "@/lib/supabase/admin") {
      return { createSupabaseAdminClient: () => null };
    }
    throw new Error(`Unsupported test import: ${specifier}`);
  });
  return { ...cjsModule.exports, source };
}

const { createPendingPaymentZnsDispatcher, source } = loadDispatcherModule();

const enabledEnv = {
  ZALO_ZNS_ENABLED: "true",
  ZALO_ZNS_ROLLOUT_AT: "2026-08-03T00:00:00.000Z",
  ZALO_ZNS_DAILY_LIMIT: "25",
};

const claimed = {
  orderCode: "TAMABC123",
  leaseToken: "lease-1",
  attemptCount: 1,
};

const pendingOrder = {
  orderCode: "TAMABC123",
  studentName: "Nguyễn Minh Anh",
  phone: "0901234567",
  courseSlug: "facebook-ads-2026",
  courseTitle: "Facebook Ads Master 2026",
  amount: 399000,
  currency: "VND",
  status: "pending",
  sepayReferenceCode: null,
  orderItems: [],
};

function fakeRepository(overrides = {}) {
  const finishes = [];
  let claimCalls = 0;
  return {
    finishes,
    get claimCalls() {
      return claimCalls;
    },
    async claim() {
      claimCalls += 1;
      return { ok: true, orders: [claimed] };
    },
    async reread() {
      return { ok: true, order: pendingOrder };
    },
    async finish(input) {
      finishes.push(input);
      return { state: input.outcome };
    },
    ...overrides,
  };
}

test("disabled or incomplete rollout configuration claims nothing", async () => {
  for (const env of [
    {},
    { ...enabledEnv, ZALO_ZNS_ENABLED: "false" },
    { ...enabledEnv, ZALO_ZNS_ROLLOUT_AT: "" },
    { ...enabledEnv, ZALO_ZNS_DAILY_LIMIT: "" },
  ]) {
    const repository = fakeRepository();
    const dispatch = createPendingPaymentZnsDispatcher({
      env,
      repository,
      send: async () => ({ ok: true }),
    });
    const summary = await dispatch({ limit: 10 });
    assert.equal(repository.claimCalls, 0);
    assert.equal(summary.claimed, 0);
    assert.equal(summary.disabled, true);
  }
});

test("reread paid, ineligible, and invalid-phone rows cancel without sending", async () => {
  for (const order of [
    { ...pendingOrder, status: "paid" },
    { ...pendingOrder, courseSlug: "another-course" },
    { ...pendingOrder, phone: "0281234567" },
  ]) {
    let sends = 0;
    const repository = fakeRepository({
      async reread() {
        return { ok: true, order };
      },
    });
    const dispatch = createPendingPaymentZnsDispatcher({
      env: enabledEnv,
      repository,
      send: async () => {
        sends += 1;
        return { ok: true };
      },
    });

    const summary = await dispatch({ limit: 10 });
    assert.equal(sends, 0);
    assert.equal(summary.cancelled, 1);
    assert.equal(repository.finishes[0].outcome, "cancelled");
  }
});

test("provider success is finished once as sent", async () => {
  let sends = 0;
  const repository = fakeRepository();
  const dispatch = createPendingPaymentZnsDispatcher({
    env: enabledEnv,
    repository,
    send: async () => {
      sends += 1;
      return {
        ok: true,
        retryable: false,
        reason: null,
        status: 200,
        messageId: "msg-123",
      };
    },
  });

  const summary = await dispatch({ limit: 10 });
  assert.equal(sends, 1);
  assert.equal(summary.sent, 1);
  assert.equal(repository.finishes.length, 1);
  assert.deepEqual(repository.finishes[0], {
    orderCode: "TAMABC123",
    leaseToken: "lease-1",
    outcome: "sent",
    nextAttemptAt: null,
    error: null,
    messageId: "msg-123",
  });
});

test("retryable failures wait 5 then 15 minutes and attempt three is dead", async () => {
  for (const [attemptCount, expectedOutcome, expectedMinutes] of [
    [1, "retry", 5],
    [2, "retry", 15],
    [3, "dead", null],
  ]) {
    const repository = fakeRepository({
      async claim() {
        return { ok: true, orders: [{ ...claimed, attemptCount }] };
      },
    });
    const dispatch = createPendingPaymentZnsDispatcher({
      env: enabledEnv,
      repository,
      now: () => Date.parse("2026-08-03T01:00:00.000Z"),
      send: async () => ({
        ok: false,
        retryable: true,
        reason: "zalo_provider_unavailable",
        status: 503,
      }),
    });

    const summary = await dispatch({ limit: 10 });
    assert.equal(repository.finishes[0].outcome, expectedOutcome);
    if (expectedMinutes === null) {
      assert.equal(repository.finishes[0].nextAttemptAt, null);
      assert.equal(summary.dead, 1);
    } else {
      assert.equal(
        repository.finishes[0].nextAttemptAt,
        new Date(Date.parse("2026-08-03T01:00:00.000Z") + expectedMinutes * 60_000).toISOString(),
      );
      assert.equal(summary.retried, 1);
    }
  }
});

test("permanent failures are dead and lost leases do not claim an outcome", async () => {
  const permanentRepository = fakeRepository();
  const permanentDispatch = createPendingPaymentZnsDispatcher({
    env: enabledEnv,
    repository: permanentRepository,
    send: async () => ({
      ok: false,
      retryable: false,
      reason: "zalo_request_rejected",
      status: 400,
    }),
  });
  assert.equal((await permanentDispatch()).dead, 1);

  const lostRepository = fakeRepository({
    async finish() {
      return { state: "lost_lease" };
    },
  });
  const lostDispatch = createPendingPaymentZnsDispatcher({
    env: enabledEnv,
    repository: lostRepository,
    send: async () => ({
      ok: true,
      retryable: false,
      reason: null,
      status: 200,
      messageId: "msg-lost",
    }),
  });
  const lost = await lostDispatch();
  assert.equal(lost.lostLease, 1);
  assert.equal(lost.sent, 0);
});

test("dispatcher source rereads authoritative fields and emits no PII logs", () => {
  assert.match(source, /status,course_slug,course_title,phone,amount,currency,sepay_reference_code,order_items/);
  assert.match(source, /claim_pending_payment_zns_orders/);
  assert.match(source, /finish_pending_payment_zns_order/);
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\(/);
});
