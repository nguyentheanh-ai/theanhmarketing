import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadClientModule() {
  const source = fs.readFileSync(path.resolve("lib/zalo/client.ts"), "utf8");
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
    if (specifier === "@/tests/fixtures/zalo-zbs-contract.json") {
      return JSON.parse(
        fs.readFileSync("tests/fixtures/zalo-zbs-contract.json", "utf8"),
      );
    }
    if (specifier === "@/lib/supabase/admin") {
      return { createSupabaseAdminClient: () => null };
    }
    throw new Error(`Unsupported test import: ${specifier}`);
  });
  return { ...cjsModule.exports, source };
}

const { createZaloZbsClient, source } = loadClientModule();

const payload = {
  phone: "84901234567",
  trackingId: "PPTAMABC123",
  templateData: {
    customer_name: "Nguyễn Minh Anh",
    product_name: "Facebook Ads Master 2026",
    order_code: "TAMABC123",
    amount: "399.000đ",
    transfer_content: "TAMABC123",
    status: "Chờ thanh toán",
  },
};

const env = {
  ZALO_APP_ID: "921439943985766939",
  ZALO_APP_SECRET: "test-secret-value",
  ZALO_ZNS_PENDING_PAYMENT_TEMPLATE_ID: "template-123",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function freshCredentialStore(overrides = {}) {
  return {
    async get() {
      return {
        state: "ready",
        accessToken: "fresh-access-token-value",
        refreshToken: "fresh-refresh-token-value",
        accessExpiresAt: "2026-08-04T10:00:00.000Z",
      };
    },
    async claimRefresh() {
      return { state: "busy" };
    },
    async finishRefresh() {
      return { state: "ready" };
    },
    ...overrides,
  };
}

test("sends the verified request contract with a fresh access token", async () => {
  const calls = [];
  const client = createZaloZbsClient({
    env,
    now: () => Date.parse("2026-08-03T00:00:00.000Z"),
    credentialStore: freshCredentialStore(),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({ error: 0, message: "Success", data: { msg_id: "msg-safe-123" } });
    },
  });

  const result = await client.sendPendingPaymentZbs(payload);

  assert.deepEqual(result, {
    ok: true,
    retryable: false,
    reason: null,
    status: 200,
    messageId: "msg-safe-123",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://business.openapi.zalo.me/message/template");
  assert.equal(calls[0].init.headers.access_token, "fresh-access-token-value");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    phone: payload.phone,
    template_id: "template-123",
    template_data: payload.templateData,
    tracking_id: payload.trackingId,
  });
});

test("refreshes an expired token and atomically stores the rotated pair", async () => {
  const finishes = [];
  const calls = [];
  const credentialStore = freshCredentialStore({
    async get() {
      return {
        state: "ready",
        accessToken: "expired-access-token",
        refreshToken: "single-use-refresh-token",
        accessExpiresAt: "2026-08-02T00:00:00.000Z",
      };
    },
    async claimRefresh(force) {
      assert.equal(force, false);
      return {
        state: "claimed",
        leaseToken: "refresh-lease-1",
        refreshToken: "single-use-refresh-token",
      };
    },
    async finishRefresh(input) {
      finishes.push(input);
      return { state: "ready" };
    },
  });
  const client = createZaloZbsClient({
    env,
    now: () => Date.parse("2026-08-03T00:00:00.000Z"),
    credentialStore,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (url.includes("oauth.zaloapp.com")) {
        return jsonResponse({
          access_token: "rotated-access-token-value",
          refresh_token: "rotated-refresh-token-value",
          expires_in: "90000",
        });
      }
      return jsonResponse({ error: 0, data: { msg_id: "msg-after-refresh" } });
    },
  });

  const result = await client.sendPendingPaymentZbs(payload);

  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers.secret_key, env.ZALO_APP_SECRET);
  assert.equal(
    calls[0].init.body.toString(),
    "refresh_token=single-use-refresh-token&app_id=921439943985766939&grant_type=refresh_token",
  );
  assert.deepEqual(finishes, [
    {
      leaseToken: "refresh-lease-1",
      accessToken: "rotated-access-token-value",
      refreshToken: "rotated-refresh-token-value",
      accessExpiresAt: "2026-08-04T01:00:00.000Z",
    },
  ]);
});

test("one HTTP authentication failure forces one refresh and one resend", async () => {
  let claims = 0;
  let sends = 0;
  const credentialStore = freshCredentialStore({
    async claimRefresh(force) {
      claims += 1;
      assert.equal(force, true);
      return {
        state: "claimed",
        leaseToken: "refresh-lease-2",
        refreshToken: "refresh-after-auth-failure",
      };
    },
  });
  const client = createZaloZbsClient({
    env,
    now: () => Date.parse("2026-08-03T00:00:00.000Z"),
    credentialStore,
    fetchImpl: async (url) => {
      if (url.includes("oauth.zaloapp.com")) {
        return jsonResponse({
          access_token: "new-access-after-auth-failure",
          refresh_token: "new-refresh-after-auth-failure",
          expires_in: "90000",
        });
      }
      sends += 1;
      return sends === 1
        ? jsonResponse({ error: -1, message: "unauthorized" }, 401)
        : jsonResponse({ error: 0, data: { msg_id: "msg-retried-once" } });
    },
  });

  const result = await client.sendPendingPaymentZbs(payload);
  assert.equal(result.ok, true);
  assert.equal(claims, 1);
  assert.equal(sends, 2);
});

test("timeouts, 429, and 5xx are retryable while other 4xx are terminal", async () => {
  for (const status of [429, 500, 503]) {
    const client = createZaloZbsClient({
      env,
      now: () => Date.parse("2026-08-03T00:00:00.000Z"),
      credentialStore: freshCredentialStore(),
      fetchImpl: async () => jsonResponse({ error: -1, message: "provider detail" }, status),
    });
    const result = await client.sendPendingPaymentZbs(payload);
    assert.equal(result.ok, false);
    assert.equal(result.retryable, true);
    assert.equal(result.reason, "zalo_provider_unavailable");
  }

  const terminalClient = createZaloZbsClient({
    env,
    now: () => Date.parse("2026-08-03T00:00:00.000Z"),
    credentialStore: freshCredentialStore(),
    fetchImpl: async () => jsonResponse({ error: -1, message: "private provider detail" }, 400),
  });
  const terminal = await terminalClient.sendPendingPaymentZbs(payload);
  assert.deepEqual(terminal, {
    ok: false,
    retryable: false,
    reason: "zalo_request_rejected",
    status: 400,
  });

  const timeout = new Error("request included token and phone 84901234567");
  timeout.name = "AbortError";
  const timeoutClient = createZaloZbsClient({
    env,
    now: () => Date.parse("2026-08-03T00:00:00.000Z"),
    credentialStore: freshCredentialStore(),
    fetchImpl: async () => {
      throw timeout;
    },
  });
  assert.deepEqual(await timeoutClient.sendPendingPaymentZbs(payload), {
    ok: false,
    retryable: true,
    reason: "zalo_timeout",
  });
});

test("missing config and provider errors never expose secrets or customer data", async () => {
  const missing = createZaloZbsClient({
    env: {},
    credentialStore: freshCredentialStore(),
    fetchImpl: async () => {
      throw new Error("must not run");
    },
  });
  assert.deepEqual(await missing.sendPendingPaymentZbs(payload), {
    ok: false,
    retryable: false,
    reason: "missing_zalo_config",
  });

  const provider = createZaloZbsClient({
    env,
    now: () => Date.parse("2026-08-03T00:00:00.000Z"),
    credentialStore: freshCredentialStore(),
    fetchImpl: async () =>
      jsonResponse({
        error: -999,
        message: `secret ${env.ZALO_APP_SECRET} phone ${payload.phone}`,
      }),
  });
  const serialized = JSON.stringify(await provider.sendPendingPaymentZbs(payload));
  assert.doesNotMatch(serialized, new RegExp(env.ZALO_APP_SECRET));
  assert.doesNotMatch(serialized, new RegExp(payload.phone));
  assert.doesNotMatch(serialized, /private provider detail/i);
  assert.doesNotMatch(source, /console\.(?:log|warn|error)\(/);
});
