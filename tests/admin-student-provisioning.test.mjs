import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const servicePath = "services/studentProvisioningOperationService.ts";
const migrationPath = "supabase/migrations/20260711110000_admin_student_provisioning_operations.sql";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadService(createSupabaseAdminClient) {
  const compiled = ts.transpileModule(read(servicePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "@/lib/supabase/admin") return { createSupabaseAdminClient };
    if (specifier === "node:crypto") return crypto;
    throw new Error(`Unexpected test import: ${specifier}`);
  });
  return cjsModule.exports;
}

function dbRow(overrides = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    operation_id: "operation-123",
    request_fingerprint: "a".repeat(64),
    mode: "paid",
    status: "running",
    current_step: "validate",
    order_code: null,
    safe_result: {},
    actor_id: "20000000-0000-4000-8000-000000000002",
    created_at: "2026-07-11T01:00:00.000Z",
    updated_at: "2026-07-11T01:00:00.000Z",
    ...overrides,
  };
}

function completedSafeResult() {
  return {
    student: { state: "existing" },
    order: { state: "created", orderCode: "ORDER-100" },
    access: { state: "granted", courseSlugs: ["course-a"] },
    email: { state: "sent" },
    nextActions: [],
  };
}

function withServiceRole(fn) {
  return async () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    try {
      await fn();
    } finally {
      if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
      if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
  };
}

test("migration creates a service-role-only provisioning journal without sensitive columns", () => {
  const sql = read(migrationPath);
  assert.match(sql, /create table if not exists public\.admin_student_provisioning_operations/i);
  assert.match(sql, /operation_id text not null unique/i);
  assert.match(sql, /mode text not null[\s\S]*check \(mode in \('paid', 'free', 'trial'\)\)/i);
  assert.match(sql, /status text not null[\s\S]*check \(status in \('running', 'partial', 'completed', 'failed'\)\)/i);
  assert.match(sql, /create index[\s\S]*\(status, updated_at\)/i);
  assert.match(sql, /lease_token uuid/i);
  assert.match(sql, /lease_expires_at timestamptz/i);
  assert.match(sql, /create index[\s\S]*\(lease_expires_at\)[\s\S]*where lease_expires_at is not null/i);
  assert.match(sql, /create or replace function public\.claim_admin_student_provisioning_operation/i);
  assert.match(sql, /create or replace function public\.save_admin_student_provisioning_outcome/i);
  assert.match(sql, /security definer[\s\S]*set search_path = public, pg_temp/i);
  assert.match(sql, /select \*[\s\S]*for update/i);
  assert.match(sql, /on conflict \(operation_id\) do nothing/i);
  assert.match(sql, /lease_expires_at > v_now/i);
  assert.match(sql, /v_now \+ make_interval\(secs => p_lease_seconds\)/i);
  assert.match(sql, /revoke all on function public\.claim_admin_student_provisioning_operation[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.claim_admin_student_provisioning_operation[\s\S]*to service_role/i);
  assert.match(sql, /revoke all on function public\.save_admin_student_provisioning_outcome[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.save_admin_student_provisioning_outcome[\s\S]*to service_role/i);
  assert.match(sql, /check \(current_step in \('validate', 'resolve_student', 'create_order', 'ensure_account', 'grant_access', 'send_email', 'complete'\)\)/i);
  assert.match(sql, /check \(status <> 'completed' or current_step = 'complete'\)/i);
  assert.match(sql, /check \(\(lease_token is null\) = \(lease_expires_at is null\)\)/i);
  assert.match(sql, /check \(jsonb_typeof\(safe_result\) = 'object'\)/i);
  assert.match(sql, /check \(order_code is null[\s\S]*length\(order_code\)[\s\S]*order_code ~ /i);
  const claimSql = sql.match(/create or replace function public\.claim_admin_student_provisioning_operation[\s\S]*?(?=revoke all on function public\.claim_admin_student_provisioning_operation)/i)?.[0] ?? "";
  const saveSql = sql.match(/create or replace function public\.save_admin_student_provisioning_outcome[\s\S]*?(?=revoke all on function public\.save_admin_student_provisioning_outcome)/i)?.[0] ?? "";
  assert.doesNotMatch(claimSql, /\bnow\(\)/i);
  assert.doesNotMatch(saveSql, /\bnow\(\)/i);
  assert.match(claimSql, /v_now \+ make_interval\(secs => p_lease_seconds\)/i);
  const claimInsertSql = claimSql.slice(claimSql.indexOf("insert into"), claimSql.indexOf("if found then"));
  assert.doesNotMatch(claimInsertSql, /clock_timestamp\(\)|p_lease_token[\s\S]*make_interval/i);
  const newClockIndex = claimSql.indexOf("v_now := clock_timestamp()", claimSql.indexOf("if found then"));
  const newLeaseUpdateIndex = claimSql.indexOf("set lease_token = p_lease_token", claimSql.indexOf("if found then"));
  assert.ok(claimSql.indexOf("if found then") < newClockIndex && newClockIndex < newLeaseUpdateIndex);
  const claimLockIndex = claimSql.indexOf("for update");
  const replayClockIndex = claimSql.indexOf("v_now := clock_timestamp()", claimLockIndex);
  assert.ok(claimLockIndex < replayClockIndex);
  assert.ok(saveSql.indexOf("for update") < saveSql.indexOf("v_now := clock_timestamp()"));
  assert.match(saveSql, /jsonb_array_length\(p_safe_result->'nextActions'\) <> 0/i);
  assert.match(saveSql, /case[\s\S]*jsonb_typeof\(p_safe_result->'nextActions'\) = 'array'[\s\S]*jsonb_array_length/i);
  assert.match(saveSql, /p_status = 'completed'[\s\S]*p_current_step <> 'complete'/i);
  assert.match(saveSql, /#>> '\{student,state\}'[\s\S]*= 'failed'/i);
  assert.match(saveSql, /p_safe_result \? 'errorCode'/i);
  const replayCompleteSql = claimSql.match(/if v_operation\.status = 'completed' then[\s\S]*?return jsonb_build_object\('claim_state', 'complete'/i)?.[0] ?? "";
  assert.match(replayCompleteSql, /jsonb_typeof\(v_operation\.safe_result->'student'\)/i);
  assert.match(replayCompleteSql, /jsonb_array_length\(v_operation\.safe_result->'nextActions'\) <> 0/i);
  assert.match(replayCompleteSql, /v_operation\.safe_result \? 'errorCode'/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.admin_student_provisioning_operations from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update on table public\.admin_student_provisioning_operations to service_role/i);
  const columnBlock = sql.match(/create table[\s\S]*?\n\);/i)?.[0] ?? "";
  assert.doesNotMatch(columnBlock, /\b(email|phone|name|password|temporary_password|token|raw_request|notes?|error_text)\b/i);
  assert.doesNotMatch(read(servicePath), /\.from\(["']admin_student_provisioning_operations["']\)/);
  assert.match(read(servicePath), /\.rpc\("claim_admin_student_provisioning_operation"/);
  assert.match(read(servicePath), /\.rpc\("save_admin_student_provisioning_outcome"/);
});

test("fingerprint normalizes equivalent intent and changes when relevant intent changes", () => {
  const { createProvisioningRequestFingerprint } = loadService(() => null);
  const first = createProvisioningRequestFingerprint({
    mode: " PAID ", email: " Student@Example.COM ", phone: "+84 901-234-567",
    courseSlugs: [" Course-B ", "course-a", "COURSE-A"], sendEmail: true,
    trialExpiresAt: "2026-07-20T07:00:00+07:00",
  });
  const equivalent = createProvisioningRequestFingerprint({
    mode: "paid", email: "student@example.com", phone: "84901234567",
    courseSlugs: ["course-a", "course-b"], sendEmail: true,
    trialExpiresAt: "2026-07-20T00:00:00.000Z",
  });
  const changed = createProvisioningRequestFingerprint({
    mode: "paid", email: "student@example.com", phone: "84901234567",
    courseSlugs: ["course-a", "course-b"], sendEmail: false,
    trialExpiresAt: "2026-07-20T00:00:00.000Z",
  });
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, equivalent);
  assert.notEqual(first, changed);
  assert.doesNotMatch(read(servicePath), /temporaryPassword/);
});

test("fingerprint rejects malformed runtime input instead of coercing it", () => {
  const service = loadService(() => null);
  const valid = {
    mode: "paid", email: "student@example.com", phone: "", courseSlugs: ["course-a"],
    sendEmail: true, trialExpiresAt: null,
  };
  for (const input of [
    { ...valid, email: null },
    { ...valid, email: {} },
    { ...valid, phone: 901234567 },
    { ...valid, sendEmail: "false" },
    { ...valid, sendEmail: 0 },
    { ...valid, courseSlugs: ["course-a", 1] },
    { ...valid, trialExpiresAt: new Date() },
    { ...valid, trialExpiresAt: "not-a-date" },
    { ...valid, email: "", phone: "" },
  ]) {
    assert.throws(
      () => service.createProvisioningRequestFingerprint(input),
      (error) => error.code === "PROVISIONING_INVALID_INPUT",
    );
  }
  const inputType = read(servicePath).match(/export type ProvisioningRequestFingerprintInput[\s\S]*?\n};/)?.[0] ?? "";
  assert.doesNotMatch(inputType, /Date/);
});

test("claim creates a lease for new work and completed work returns without one", withServiceRole(async () => {
  let claimArgs;
  const newClient = {
    async rpc(name, args) {
      assert.equal(name, "claim_admin_student_provisioning_operation");
      claimArgs = args;
      return { data: { claim_state: "new", operation: dbRow() }, error: null };
    },
  };
  const newService = loadService(() => newClient);
  const created = await newService.claimProvisioningOperation({
    operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid",
    actorId: "20000000-0000-4000-8000-000000000002",
  });
  assert.equal(created.state, "new");
  assert.match(created.leaseToken, /^[0-9a-f-]{36}$/i);
  assert.equal(created.leaseToken, claimArgs.p_lease_token);
  assert.equal("leaseToken" in created.operation, false);
  assert.equal(claimArgs.p_lease_seconds, 120);
  assert.equal("p_lease_expires_at" in claimArgs, false);

  const completedClient = {
    rpc: async () => ({ data: { claim_state: "complete", operation: dbRow({
      status: "completed", current_step: "complete", safe_result: completedSafeResult(),
    }) }, error: null }),
  };
  const completed = await loadService(() => completedClient).claimProvisioningOperation({
    operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null,
  });
  assert.deepEqual({ state: completed.state, hasLease: "leaseToken" in completed }, { state: "complete", hasLease: false });
}));

test("claim rejects malformed completed replay results and accepts only the terminal invariant", withServiceRole(async () => {
  const failed = completedSafeResult();
  failed.access.state = "failed";
  const retrying = completedSafeResult();
  retrying.nextActions = ["retry_access"];
  const coded = { ...completedSafeResult(), errorCode: "ACCESS_GRANT_FAILED" };
  for (const operation of [
    dbRow({ status: "completed", current_step: "validate", safe_result: completedSafeResult() }),
    dbRow({ status: "completed", current_step: "complete", safe_result: {} }),
    dbRow({ status: "completed", current_step: "complete", safe_result: failed }),
    dbRow({ status: "completed", current_step: "complete", safe_result: retrying }),
    dbRow({ status: "completed", current_step: "complete", safe_result: coded }),
  ]) {
    const service = loadService(() => ({ rpc: async () => ({ data: { claim_state: "complete", operation }, error: null }) }));
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_INVALID_ROW",
    );
  }
}));

test("claim atomically resumes expired work and rejects active or lost lease races", withServiceRole(async () => {
  const activeClient = {
    rpc: async () => ({ data: { claim_state: "busy" }, error: null }),
  };
  const activeService = loadService(() => activeClient);
  await assert.rejects(
    activeService.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
    (error) => error instanceof activeService.ProvisioningOperationBusyError && error.code === "PROVISIONING_OPERATION_BUSY",
  );

  let resumeArgs;
  const resumeClient = {
    async rpc(_name, args) {
      resumeArgs = args;
      return { data: { claim_state: "resume", operation: dbRow({ status: "running" }) }, error: null };
    },
  };
  const resumed = await loadService(() => resumeClient).claimProvisioningOperation({
    operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null,
  });
  assert.equal(resumed.state, "resume");
  assert.match(resumed.leaseToken, /^[0-9a-f-]{36}$/i);
  assert.equal(resumed.leaseToken, resumeArgs.p_lease_token);

  const raceClient = {
    rpc: async () => ({ data: { claim_state: "busy" }, error: null }),
  };
  const raceService = loadService(() => raceClient);
  await assert.rejects(
    raceService.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
    (error) => error instanceof raceService.ProvisioningOperationBusyError && error.code === "PROVISIONING_OPERATION_BUSY",
  );
}));

test("claim treats a unique race as resume and rejects fingerprint or mode conflicts with a typed safe error", withServiceRole(async () => {
  for (const conflictKind of ["fingerprint", "mode"]) {
    const client = { rpc: async () => ({ data: { claim_state: "conflict" }, error: null }) };
    const service = loadService(() => client);
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error instanceof service.ProvisioningOperationConflictError
        && error.code === "PROVISIONING_OPERATION_CONFLICT"
        && !error.message.includes(conflictKind),
    );
  }
}));

test("claim fails closed when the admin client is missing or a query fails", async () => {
  const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const service = loadService(() => null);
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_CLIENT_UNAVAILABLE",
    );
  } finally {
    if (previous !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  }

  await withServiceRole(async () => {
    const client = { rpc: async () => ({ data: null, error: { code: "500", message: "raw db detail" } }) };
    const service = loadService(() => client);
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_QUERY_FAILED" && !error.message.includes("raw db detail"),
    );
  })();
});

test("claim refuses an anon fallback when the Supabase URL is missing", async () => {
  const previousRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    const service = loadService(() => ({ from() { throw new Error("anon fallback used"); } }));
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_CLIENT_UNAVAILABLE" && !error.message.includes("anon fallback"),
    );
  } finally {
    if (previousRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousRole;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }
});

test("thrown client and query failures are converted to safe service errors", withServiceRole(async () => {
  for (const createClient of [
    () => { throw new Error("raw client detail"); },
    () => ({ rpc: async () => { throw new Error("raw query detail"); } }),
  ]) {
    const service = loadService(createClient);
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => ["PROVISIONING_CLIENT_UNAVAILABLE", "PROVISIONING_QUERY_FAILED"].includes(error.code)
        && !/raw (client|query) detail/.test(error.message),
    );
  }

  const service = loadService(() => ({
    rpc: async () => { throw new Error("raw save detail"); },
  }));
  await assert.rejects(
    service.saveProvisioningOutcome({ operationId: "operation-123", leaseToken: "30000000-0000-4000-8000-000000000003", status: "failed", currentStep: "grant_access", orderCode: null, safeResult: {} }),
    (error) => error.code === "PROVISIONING_QUERY_FAILED" && !error.message.includes("raw save detail"),
  );
}));

test("save rebuilds safe result from an allowlist and strips sensitive or arbitrary keys recursively", withServiceRole(async () => {
  let storedPayload;
  const saved = dbRow({
    status: "partial", current_step: "send_email", order_code: "ORDER-100",
    safe_result: {
      student: { state: "existing" }, order: { state: "created", orderCode: "ORDER-100" },
      access: { state: "failed", courseSlugs: ["course-a"] }, email: { state: "failed" },
      nextActions: ["retry_access", "retry_email"], errorCode: "EMAIL_SEND_FAILED",
    },
  });
  const client = {
    async rpc(name, args) {
      assert.equal(name, "save_admin_student_provisioning_outcome");
      storedPayload = args;
      return { data: { save_state: "saved", operation: saved }, error: null };
    },
  };
  const { saveProvisioningOutcome } = loadService(() => client);
  const operation = await saveProvisioningOutcome({
    operationId: "operation-123", leaseToken: "30000000-0000-4000-8000-000000000003",
    status: "partial", currentStep: "send_email", orderCode: "ORDER-100",
    safeResult: {
      student: { state: "existing", email: "secret@example.com", password: "hidden" },
      order: { state: "created", orderCode: "ORDER-100", token: "secret" },
      access: { state: "failed", courseSlugs: [" course-a ", "course-a"], reason: "raw failure" },
      email: { state: "failed", phone: "0900" }, nextActions: ["retry_email", "retry_access", "retry_email"],
      errorCode: "EMAIL_SEND_FAILED", reason: "raw error", arbitrary: { password: "nested" },
    },
  });
  assert.deepEqual(storedPayload.p_safe_result, saved.safe_result);
  assert.deepEqual(operation.safeResult, saved.safe_result);
  assert.equal(storedPayload.p_lease_token, "30000000-0000-4000-8000-000000000003");
  assert.equal("p_lease_expires_at" in storedPayload, false);
  assert.doesNotMatch(JSON.stringify(storedPayload), /secret@example|hidden|0900|raw failure|raw error|nested/);
}));

test("save fails on a missing row or query error", withServiceRole(async () => {
  for (const result of [
    { data: { save_state: "lost_lease" }, error: null },
    { data: null, error: { code: "500", message: "raw db detail" } },
  ]) {
    const client = { rpc: async () => result };
    const service = loadService(() => client);
    await assert.rejects(
      service.saveProvisioningOutcome({ operationId: "operation-123", leaseToken: "30000000-0000-4000-8000-000000000003", status: "failed", currentStep: "grant_access", orderCode: null, safeResult: {} }),
      (error) => ["PROVISIONING_OPERATION_LOST_LEASE", "PROVISIONING_QUERY_FAILED"].includes(error.code)
        && !error.message.includes("raw db detail"),
    );
  }
}));

test("save requires the current lease and extends or clears it by status", withServiceRole(async () => {
  const leaseToken = "30000000-0000-4000-8000-000000000003";
  for (const scenario of [
    { status: "running", safeResult: {} },
    { status: "completed", safeResult: completedSafeResult() },
  ]) {
    let rpcArgs;
    const client = { async rpc(_name, args) {
      rpcArgs = args;
      return { data: { save_state: "saved", operation: dbRow({
        status: scenario.status,
        current_step: scenario.status === "completed" ? "complete" : "grant_access",
        safe_result: scenario.safeResult,
      }) }, error: null };
    } };
    await loadService(() => client).saveProvisioningOutcome({
      operationId: "operation-123", leaseToken, status: scenario.status,
      currentStep: scenario.status === "completed" ? "complete" : "grant_access", orderCode: null, safeResult: scenario.safeResult,
    });
    assert.equal(rpcArgs.p_operation_id, "operation-123");
    assert.equal(rpcArgs.p_lease_token, leaseToken);
    assert.equal(rpcArgs.p_lease_seconds, 120);
    assert.equal(rpcArgs.p_status, scenario.status);
    assert.equal("p_lease_expires_at" in rpcArgs, false);
  }

  const service = loadService(() => ({ from() { throw new Error("query must not run"); } }));
  await assert.rejects(
    service.saveProvisioningOutcome({ operationId: "operation-123", status: "failed", currentStep: "complete", orderCode: null, safeResult: {} }),
    (error) => error.code === "PROVISIONING_INVALID_INPUT",
  );
}));

test("save rejects invalid terminal state and malformed status, step, or order code before RPC", withServiceRole(async () => {
  const leaseToken = "30000000-0000-4000-8000-000000000003";
  const valid = {
    operationId: "operation-123", leaseToken, status: "completed", currentStep: "complete",
    orderCode: "ORDER-100", safeResult: completedSafeResult(),
  };
  const failed = completedSafeResult();
  failed.email.state = "failed";
  const retrying = completedSafeResult();
  retrying.nextActions = ["retry_email"];
  const codedFailure = { ...completedSafeResult(), errorCode: "EMAIL_SEND_FAILED" };
  for (const input of [
    { ...valid, currentStep: "validate" },
    { ...valid, safeResult: { student: { state: "existing" }, nextActions: [] } },
    { ...valid, safeResult: failed },
    { ...valid, safeResult: retrying },
    { ...valid, safeResult: codedFailure },
    { ...valid, status: "done" },
    { ...valid, currentStep: "unknown" },
    { ...valid, orderCode: "bad order code!" },
    { ...valid, orderCode: "X".repeat(121) },
  ]) {
    const service = loadService(() => ({ rpc() { throw new Error("RPC must not run"); } }));
    await assert.rejects(
      service.saveProvisioningOutcome(input),
      (error) => error.code === "PROVISIONING_INVALID_INPUT" && !error.message.includes("RPC must not run"),
    );
  }
}));

test("save rejects RPC success when the stored order code or safe result differs", withServiceRole(async () => {
  const leaseToken = "30000000-0000-4000-8000-000000000003";
  const submitted = { student: { state: "existing" } };
  for (const operation of [
    dbRow({ status: "running", current_step: "grant_access", order_code: "ORDER-OTHER", safe_result: submitted }),
    dbRow({ status: "running", current_step: "grant_access", order_code: "ORDER-100", safe_result: { student: { state: "created" } } }),
  ]) {
    const service = loadService(() => ({ rpc: async () => ({ data: { save_state: "saved", operation }, error: null }) }));
    await assert.rejects(
      service.saveProvisioningOutcome({
        operationId: "operation-123", leaseToken, status: "running", currentStep: "grant_access",
        orderCode: "ORDER-100", safeResult: submitted,
      }),
      (error) => error.code === "PROVISIONING_INVALID_ROW",
    );
  }
}));

test("malformed Supabase RPC responses fail safely for claim and save", withServiceRole(async () => {
  for (const malformed of [null, undefined, "bad", []]) {
    const insertService = loadService(() => ({
      rpc: async () => malformed,
    }));
    await assert.rejects(
      insertService.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_QUERY_FAILED" && error instanceof insertService.ProvisioningOperationServiceError,
    );

    const updateService = loadService(() => ({ rpc: async () => malformed }));
    await assert.rejects(
      updateService.saveProvisioningOutcome({
        operationId: "operation-123", leaseToken: "30000000-0000-4000-8000-000000000003",
        status: "failed", currentStep: "complete", orderCode: null, safeResult: {},
      }),
      (error) => error.code === "PROVISIONING_QUERY_FAILED",
    );
  }
}));

test("malformed database rows fail closed instead of being cast", withServiceRole(async () => {
  for (const malformed of [
    dbRow({ mode: "admin" }), dbRow({ status: "done" }), dbRow({ current_step: "unknown" }),
    dbRow({ safe_result: { email: { state: "delivered", token: "secret" } } }),
  ]) {
    const client = { rpc: async () => ({ data: { claim_state: "new", operation: malformed }, error: null }) };
    const service = loadService(() => client);
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_INVALID_ROW",
    );
  }
}));

test("claim rejects an RPC state that contradicts the returned operation", withServiceRole(async () => {
  for (const data of [
    { claim_state: "new", operation: dbRow({ status: "completed", current_step: "complete" }) },
    { claim_state: "resume", operation: dbRow({ status: "partial" }) },
    { claim_state: "complete", operation: dbRow({ status: "running" }) },
  ]) {
    const service = loadService(() => ({ rpc: async () => ({ data, error: null }) }));
    await assert.rejects(
      service.claimProvisioningOperation({ operationId: "operation-123", requestFingerprint: "a".repeat(64), mode: "paid", actorId: null }),
      (error) => error.code === "PROVISIONING_INVALID_ROW",
    );
  }
}));

test("safe result rejects step states that are impossible for a field", withServiceRole(async () => {
  for (const safeResult of [
    { student: { state: "sent" } },
    { order: { state: "sent" } },
    { access: { state: "created" } },
    { email: { state: "created" } },
  ]) {
    const client = { from: () => ({ update: () => { throw new Error("query must not run"); } }) };
    const service = loadService(() => client);
    await assert.rejects(
      service.saveProvisioningOutcome({ operationId: "operation-123", leaseToken: "30000000-0000-4000-8000-000000000003", status: "failed", currentStep: "complete", orderCode: null, safeResult }),
      (error) => error.code === "PROVISIONING_INVALID_INPUT",
    );
  }
}));
