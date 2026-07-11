import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const servicePath = "services/studentProvisioningOperationService.ts";
const migrationPath = "supabase/migrations/20260711110000_admin_student_provisioning_operations.sql";
const orchestratorPath = "services/studentProvisioningService.ts";
const idempotencyMigrationPath = "supabase/migrations/20260711120000_student_provisioning_idempotency.sql";
const controlServicePath = "services/studentProvisioningControlService.ts";

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

function loadOrchestrator(runtimeDependencies) {
  const compiled = ts.transpileModule(read(orchestratorPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "@/services/studentProvisioningOperationService") return runtimeDependencies.operationModule;
    if (specifier === "@/services/orderService") return runtimeDependencies.orderModule ?? {};
    if (specifier === "@/services/studentAccountService") return runtimeDependencies.accountModule ?? {};
    if (specifier === "@/services/lmsService") return runtimeDependencies.lmsModule ?? {};
    if (specifier === "@/services/courseService") return runtimeDependencies.courseModule ?? {};
    if (specifier === "@/services/leadService") return runtimeDependencies.leadModule ?? {};
    if (specifier === "@/lib/notifications/payment-success-email") return runtimeDependencies.paymentEmailModule ?? {};
    if (specifier === "@/lib/notifications/student-access-email") return runtimeDependencies.accessEmailModule ?? {};
    if (specifier === "@/lib/course-access") return runtimeDependencies.courseAccessModule ?? {};
    if (specifier === "@/services/studentProvisioningControlService") return runtimeDependencies.controlModule ?? {};
    if (specifier === "@/services/activityLogService") return runtimeDependencies.activityModule ?? {};
    throw new Error(`Unexpected orchestrator import: ${specifier}`);
  });
  return cjsModule.exports;
}

function loadControlService(createSupabaseAdminClient, getCurrentAuth = async () => ({
  user: { id: "20000000-0000-4000-8000-000000000002" }, isAdmin: true, adminRole: "owner",
})) {
  const compiled = ts.transpileModule(read(controlServicePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const cjsModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "@/lib/supabase/admin") return { createSupabaseAdminClient };
    if (specifier === "@/lib/auth/session") {
      return { getCurrentAuth, canAccessAdminRole: (role, allowed) => Boolean(role && allowed.includes(role)) };
    }
    if (specifier === "@/services/studentProvisioningOperationService") {
      return { ProvisioningOperationLostLeaseError: class extends Error { constructor() { super("lost"); this.code = "PROVISIONING_OPERATION_LOST_LEASE"; } } };
    }
    throw new Error(`Unexpected control import: ${specifier}`);
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
    mode: " PAID ", name: "  Nguyễn   Văn A ", email: " Student@Example.COM ", phone: "+84 901-234-567",
    courseSlugs: [" Course-B ", "course-a", "COURSE-A"], sendEmail: true,
    trialExpiresAt: "2026-07-20T07:00:00+07:00",
  });
  const equivalent = createProvisioningRequestFingerprint({
    mode: "paid", name: "nguyễn văn a", email: "student@example.com", phone: "84901234567",
    courseSlugs: ["course-a", "course-b"], sendEmail: true,
    trialExpiresAt: "2026-07-20T00:00:00.000Z",
  });
  const changed = createProvisioningRequestFingerprint({
    mode: "paid", name: "Nguyễn Văn A", email: "student@example.com", phone: "84901234567",
    courseSlugs: ["course-a", "course-b"], sendEmail: false,
    trialExpiresAt: "2026-07-20T00:00:00.000Z",
  });
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, equivalent);
  assert.notEqual(first, changed);
  assert.notEqual(first, createProvisioningRequestFingerprint({
    mode: "paid", name: "Nguyễn Văn B", email: "student@example.com", phone: "84901234567",
    courseSlugs: ["course-a", "course-b"], sendEmail: true, trialExpiresAt: "2026-07-20T00:00:00.000Z",
  }));
  assert.doesNotMatch(read(servicePath), /temporaryPassword/);
});

test("fingerprint rejects malformed runtime input instead of coercing it", () => {
  const service = loadService(() => null);
  const valid = {
    mode: "paid", name: "Student A", email: "student@example.com", phone: "", courseSlugs: ["course-a"],
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
  const reviewing = completedSafeResult();
  reviewing.nextActions = ["review_email"];
  const codedFailure = { ...completedSafeResult(), errorCode: "EMAIL_SEND_FAILED" };
  for (const input of [
    { ...valid, currentStep: "validate" },
    { ...valid, safeResult: { student: { state: "existing" }, nextActions: [] } },
    { ...valid, safeResult: failed },
    { ...valid, safeResult: retrying },
    { ...valid, safeResult: reviewing },
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

test("terminal finalizer sends only safe fields and accepts the matching atomic result", withServiceRole(async () => {
  const safeResult = completedSafeResult();
  let rpcArgs;
  const operation = dbRow({
    status: "completed", current_step: "complete", order_code: "ORDER-100", safe_result: safeResult,
  });
  const service = loadService(() => ({ rpc: async (name, args) => {
    assert.equal(name, "finalize_admin_student_provisioning_operation");
    rpcArgs = args;
    return { data: { finalize_state: "finalized", operation }, error: null };
  } }));
  const result = await service.finalizeProvisioningOutcome({
    operationId: "operation-123",
    leaseToken: "30000000-0000-4000-8000-000000000003",
    status: "completed",
    currentStep: "complete",
    orderCode: "ORDER-100",
    safeResult,
    courseSlugs: [" course-a ", "course-a"],
  });
  assert.equal(result.status, "completed");
  assert.deepEqual(rpcArgs.p_course_slugs, ["course-a"]);
  assert.deepEqual(rpcArgs.p_safe_result, safeResult);
  assert.doesNotMatch(JSON.stringify(rpcArgs), /student@example|090123|Temp-Secret/);
}));

test("terminal finalizer fails closed on lost lease, malformed payload, or running status", withServiceRole(async () => {
  const input = {
    operationId: "operation-123",
    leaseToken: "30000000-0000-4000-8000-000000000003",
    status: "failed",
    currentStep: "send_email",
    orderCode: null,
    safeResult: { email: { state: "failed" }, nextActions: ["review_email"], errorCode: "EMAIL_SEND_FAILED" },
    courseSlugs: ["course-a"],
  };
  const lost = loadService(() => ({ rpc: async () => ({ data: { finalize_state: "lost_lease" }, error: null }) }));
  await assert.rejects(lost.finalizeProvisioningOutcome(input),
    (error) => error.code === "PROVISIONING_OPERATION_LOST_LEASE");

  const malformed = loadService(() => ({ rpc: async () => ({ data: { finalize_state: "finalized" }, error: null }) }));
  await assert.rejects(malformed.finalizeProvisioningOutcome(input),
    (error) => error.code === "PROVISIONING_QUERY_FAILED");

  let rpcCalls = 0;
  const invalid = loadService(() => ({ rpc: async () => { rpcCalls += 1; } }));
  await assert.rejects(invalid.finalizeProvisioningOutcome({ ...input, status: "running" }),
    (error) => error.code === "PROVISIONING_INVALID_INPUT");
  await assert.rejects(invalid.finalizeProvisioningOutcome({ ...input, courseSlugs: [] }),
    (error) => error.code === "PROVISIONING_INVALID_INPUT");
  assert.equal(rpcCalls, 0);
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

function provisioningInput(overrides = {}) {
  return {
    operationId: "operation-task7-123",
    actorId: "20000000-0000-4000-8000-000000000002",
    mode: "paid",
    name: "Hoc Vien",
    email: "student@example.com",
    phone: "0901234567",
    courseSlugs: ["course-a"],
    source: "Admin",
    note: "",
    sendEmail: true,
    ...overrides,
  };
}

function operationRow(overrides = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    operationId: "operation-task7-123",
    requestFingerprint: "a".repeat(64),
    mode: "paid",
    status: "running",
    currentStep: "validate",
    orderCode: null,
    safeResult: {},
    actorId: "20000000-0000-4000-8000-000000000002",
    createdAt: "2026-07-11T01:00:00.000Z",
    updatedAt: "2026-07-11T01:00:00.000Z",
    ...overrides,
  };
}

function makeHarness({ claim, overrides = {} } = {}) {
  const calls = [];
  const order = {
    id: "order-id", orderCode: "ORDER-100", status: "paid", studentName: "Hoc Vien",
    email: "student@example.com", phone: "0901234567", courseSlug: "course-a",
    courseTitle: "Course A", orderItems: [{ slug: "course-a", title: "Course A", price: 100 }],
    paymentEmailSentAt: null,
  };
  const dependencies = {
    createFingerprint: () => "a".repeat(64),
    claimOperation: async () => claim ?? ({ state: "new", operation: operationRow(), leaseToken: "30000000-0000-4000-8000-000000000003" }),
    saveOutcome: async (input) => { calls.push(["save", input]); return operationRow({ currentStep: input.currentStep, status: input.status, safeResult: input.safeResult, orderCode: input.orderCode ?? null }); },
    findOrderByOperationId: async () => null,
    createPaidOrder: async (input) => { calls.push(["create-order", input]); return order; },
    ensurePaidAccount: async (_order, options) => { calls.push(["paid-account", options]); return { ok: true, skipped: false, created: true, email: "student@example.com", temporaryPassword: "Temp-Secret", userId: "user-1", loginVerified: true }; },
    ensureAccessAccount: async (_input, options) => { calls.push(["access-account", options]); return { ok: true, skipped: false, created: true, email: "student@example.com", temporaryPassword: "Temp-Secret", userId: "user-1", loginVerified: true }; },
    getCourses: async () => [{ slug: "course-a", title: "Course A" }],
    provisionEnrollment: async (input) => { calls.push(["atomic-enrollment", input]); return { id: "enrollment-1", outcome: "granted", accessKind: input.mode, expiresAt: input.expiresAt }; },
    verifyPaidAccess: (_order, slugs) => { calls.push(["verify-paid-access", slugs]); return true; },
    findLeadByOperationId: async () => null,
    createLead: async (input) => { calls.push(["create-lead", input]); return { ok: true, lead: { id: "lead-1" } }; },
    sendPaidEmail: async (_order, options) => { calls.push(["paid-email", options]); return { ok: true, skipped: false, reason: null, resendEmailId: "resend-1" }; },
    sendAccessEmail: async (_input, options) => { calls.push(["access-email", options]); return { ok: true, skipped: false, reason: null, resendEmailId: "resend-1" }; },
    markPaidEmailSent: async () => { calls.push(["mark-paid-email"]); return { ok: true }; },
    beginEmailDispatch: async (input) => { calls.push(["begin-email-dispatch", input]); return { state: "send", idempotencyKey: "student-provisioning/operation-task7-123/email/1", attempt: 1 }; },
    finishEmailDispatch: async (input) => { calls.push(["finish-email-dispatch", input]); return { state: input.state }; },
    finalizeOutcome: async (input) => {
      calls.push(["finalize", input]);
      return operationRow({ currentStep: input.currentStep, status: input.status, safeResult: input.safeResult, orderCode: input.orderCode ?? null });
    },
    ...overrides,
  };
  const service = loadOrchestrator({ operationModule: {}, orderModule: {}, accountModule: {}, lmsModule: {}, courseModule: {}, leadModule: {}, paymentEmailModule: {}, accessEmailModule: {}, courseAccessModule: {}, controlModule: {} });
  return { service, dependencies, calls, order };
}

test("Task 7 idempotency migration gives paid orders and free leads durable operation identities", () => {
  const sql = read(idempotencyMigrationPath);
  assert.match(sql, /alter table public\.orders[\s\S]*provisioning_operation_id text/i);
  assert.match(sql, /create unique index[\s\S]*orders[\s\S]*provisioning_operation_id/i);
  assert.match(sql, /alter table public\.leads[\s\S]*provisioning_operation_id text/i);
  assert.match(sql, /create unique index[\s\S]*leads[\s\S]*provisioning_operation_id/i);
  assert.match(sql, /create or replace function public\.provision_admin_student_enrollment/i);
  assert.match(sql, /security definer[\s\S]*set search_path = public, crm_v2, pg_temp/i);
  assert.match(sql, /revoke all on function public\.provision_admin_student_enrollment[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.provision_admin_student_enrollment[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /password|access_token|api_key/i);
});

test("Task 7 migration atomically provisions marked enrollments and fail-closed email dispatches", () => {
  const sql = read(idempotencyMigrationPath);
  assert.match(sql, /create or replace function public\.provision_admin_student_enrollment/i);
  const enrollmentRpc = sql.match(/create or replace function public\.provision_admin_student_enrollment[\s\S]*?(?=revoke all on function public\.provision_admin_student_enrollment)/i)?.[0] ?? "";
  assert.match(enrollmentRpc, /pg_advisory_xact_lock/i);
  assert.match(enrollmentRpc, /for update/i);
  assert.match(enrollmentRpc, /p_lease_token uuid/i);
  assert.match(enrollmentRpc, /lease_token is distinct from p_lease_token/i);
  assert.ok(enrollmentRpc.indexOf("for update") < enrollmentRpc.indexOf("v_now := clock_timestamp()"));
  assert.match(enrollmentRpc, /provisioning_operation_id/i);
  assert.match(enrollmentRpc, /access_kind/i);
  assert.match(enrollmentRpc, /already_unlimited/i);
  assert.match(enrollmentRpc, /p_mode = 'free'[\s\S]*expires_at = null/i);
  assert.match(enrollmentRpc, /p_mode = 'trial'[\s\S]*expires_at is null[\s\S]*already_unlimited/i);
  assert.match(sql, /alter table public\.admin_student_provisioning_operations[\s\S]*email_dispatch_state text/i);
  assert.match(sql, /create or replace function public\.begin_admin_student_provisioning_email_dispatch/i);
  assert.match(sql, /create or replace function public\.finish_admin_student_provisioning_email_dispatch/i);
  assert.match(sql, /create or replace function public\.resolve_admin_student_provisioning_email_review/i);
  assert.doesNotMatch(sql, /create table if not exists public\.admin_student_provisioning_(email_dispatches|audits)/i);
});

test("orchestrator validates courses before claiming and uses real paid entitlement verification", () => {
  const source = read(orchestratorPath);
  assert.ok(source.indexOf("dependencies.getCourses") < source.indexOf("dependencies.claimOperation"));
  assert.match(source, /verifyPaidAccess/);
  assert.match(source, /getCourseAccessSlugs/);
  assert.doesNotMatch(source, /findEnrollment|addEnrollment/);
  assert.doesNotMatch(source, /account\.reason|emailResult\.reason/);
});

test("changed canonical name conflicts on replay before account recovery", async () => {
  const fingerprint = loadService(() => null).createProvisioningRequestFingerprint;
  let claimedFingerprint = null;
  let accountCalls = 0;
  const harness = makeHarness({ overrides: {
    createFingerprint: fingerprint,
    claimOperation: async (input) => {
      if (claimedFingerprint && claimedFingerprint !== input.requestFingerprint) {
        throw Object.assign(new Error("PROVISIONING_OPERATION_CONFLICT"), { code: "PROVISIONING_OPERATION_CONFLICT" });
      }
      claimedFingerprint = input.requestFingerprint;
      return { state: "new", operation: operationRow({ requestFingerprint: input.requestFingerprint }), leaseToken: "30000000-0000-4000-8000-000000000003" };
    },
    ensurePaidAccount: async () => { accountCalls += 1; return { ok: true, skipped: false, created: true, email: "student@example.com", temporaryPassword: "Temp-Secret", userId: "user-1" }; },
  } });
  await harness.service.provisionStudent(provisioningInput({ name: "Nguyễn Văn A" }), harness.dependencies);
  await assert.rejects(harness.service.provisionStudent(provisioningInput({ name: "Nguyễn Văn B" }), harness.dependencies),
    (error) => error.code === "PROVISIONING_OPERATION_CONFLICT");
  assert.equal(accountCalls, 1);
});

test("owner email review resolution is explicit and authorizes one numbered retry attempt", () => {
  const sql = read(idempotencyMigrationPath);
  const resolveRpc = sql.match(/create or replace function public\.resolve_admin_student_provisioning_email_review[\s\S]*?(?=revoke all on function public\.begin_admin_student_provisioning_email_dispatch)/i)?.[0] ?? "";
  assert.doesNotMatch(resolveRpc, /auth\.users|raw_user_meta_data|raw_app_meta_data/i);
  assert.match(resolveRpc, /p_owner_id is null/i);
  assert.match(resolveRpc, /confirm_delivered[\s\S]*confirm_not_delivered/i);
  assert.match(resolveRpc, /retry_authorized/i);
  const beginRpc = sql.match(/create or replace function public\.begin_admin_student_provisioning_email_dispatch[\s\S]*?(?=create or replace function public\.finish_admin_student_provisioning_email_dispatch)/i)?.[0] ?? "";
  assert.match(beginRpc, /email_dispatch_state = 'manual_review'[\s\S]*manual_review/i);
  assert.match(beginRpc, /email_dispatch_state <> 'retry_authorized'/i);
  assert.match(beginRpc, /v_attempt := v_operation\.email_dispatch_attempt \+ 1/i);
  assert.match(beginRpc, /'\/email\/' \|\| v_attempt::text/i);
  const control = read("services/studentProvisioningControlService.ts");
  assert.match(control, /export async function resolveProvisioningEmailReview/);
  assert.match(control, /"confirm_delivered" \| "confirm_not_delivered"/);
  assert.match(control, /getCurrentAuth/);
  assert.doesNotMatch(control, /export async function resolveProvisioningEmailReview\(input:\s*\{[\s\S]*ownerId:/);
  assert.doesNotMatch(sql, /raw_user_meta_data|raw_app_meta_data|from auth\.users/i);
});

test("control service validates numbered dispatch and explicit owner resolution RPC outcomes", withServiceRole(async () => {
  const calls = [];
  const service = loadControlService(() => ({ rpc: async (name, args) => {
    calls.push([name, args]);
    if (name === "begin_admin_student_provisioning_email_dispatch") return { data: {
      dispatch_state: "send", idempotency_key: "student-provisioning/operation-task7-123/email/2", attempt: 2,
    }, error: null };
    if (name === "finish_admin_student_provisioning_email_dispatch") return { data: { dispatch_state: "retryable" }, error: null };
    return { data: { resolution_state: "retry_authorized" }, error: null };
  } }));
  const begin = await service.beginProvisioningEmailDispatch({ operationId: "operation-task7-123", leaseToken: "30000000-0000-4000-8000-000000000003" });
  assert.equal(begin.attempt, 2);
  assert.match(begin.idempotencyKey, /\/email\/2$/);
  assert.equal((await service.finishProvisioningEmailDispatch({ operationId: "operation-task7-123", leaseToken: "30000000-0000-4000-8000-000000000003", state: "retryable" })).state, "retryable");
  assert.equal((await service.resolveProvisioningEmailReview({ operationId: "operation-task7-123", resolution: "confirm_not_delivered" })).state, "retry_authorized");
  assert.deepEqual(calls.map(([name]) => name), [
    "begin_admin_student_provisioning_email_dispatch",
    "finish_admin_student_provisioning_email_dispatch",
    "resolve_admin_student_provisioning_email_review",
  ]);
}));

test("owner email review uses the canonical resolved role and rejects user metadata alone", withServiceRole(async () => {
  let rpcCalls = 0;
  const createClient = () => ({ rpc: async () => {
    rpcCalls += 1;
    return { data: { resolution_state: "retry_authorized" }, error: null };
  } });
  const envOwner = loadControlService(createClient, async () => ({
    user: { id: "20000000-0000-4000-8000-000000000002", user_metadata: {} }, isAdmin: true, adminRole: "owner",
  }));
  assert.equal((await envOwner.resolveProvisioningEmailReview({
    operationId: "operation-task7-123", resolution: "confirm_not_delivered",
  })).state, "retry_authorized");

  const metadataOnly = loadControlService(createClient, async () => ({
    user: { id: "20000000-0000-4000-8000-000000000003", user_metadata: { admin_role: "owner" } },
    isAdmin: false,
    adminRole: null,
  }));
  await assert.rejects(metadataOnly.resolveProvisioningEmailReview({
    operationId: "operation-task7-123", resolution: "confirm_not_delivered",
  }), (error) => error.code === "PROVISIONING_OWNER_REQUIRED");
  assert.equal(rpcCalls, 1);
}));

test("paid enrollment provenance is preserved for both free and trial requests", () => {
  const sql = read(idempotencyMigrationPath);
  const rpc = sql.match(/create or replace function public\.provision_admin_student_enrollment[\s\S]*?(?=revoke all on function public\.provision_admin_student_enrollment)/i)?.[0] ?? "";
  assert.match(rpc, /v_operation\.mode <> p_mode/i);
  assert.match(rpc, /v_enrollment\.order_id is not null or v_enrollment\.metadata->>'access_kind' = 'paid'/i);
  assert.match(rpc, /'access_kind', 'paid'[\s\S]*'requested_access_kind', p_mode/i);
  assert.match(rpc, /v_outcome := 'already_paid'/i);
  const paidBranch = rpc.match(/elsif v_enrollment\.order_id is not null[\s\S]*?v_outcome := 'already_paid'/i)?.[0] ?? "";
  assert.doesNotMatch(paidBranch, /order_id\s*=|expires_at\s*=|status\s*=/i);
});

test("paid provisioning uses durable order identity, preserves an existing account, and sends once with a stable key", async () => {
  const { service, dependencies, calls } = makeHarness();
  const result = await service.provisionStudent(provisioningInput(), dependencies);
  assert.equal(result.ok, true);
  assert.equal(calls.filter(([name]) => name === "create-order").length, 1);
  assert.equal(calls.filter(([name]) => name === "paid-account").length, 1);
  assert.equal(calls.filter(([name]) => name === "paid-email").length, 1);
  assert.equal(calls.filter(([name]) => name === "verify-paid-access").length, 1);
  assert.equal(calls.find(([name]) => name === "create-order")[1].provisioningOperationId, "operation-task7-123");
  assert.equal(calls.find(([name]) => name === "paid-account")[1].forcePasswordUpdate, false);
  assert.equal(calls.find(([name]) => name === "paid-account")[1].preserveExistingAuth, true);
  assert.equal(calls.find(([name]) => name === "paid-account")[1].provisioningOperationId, "operation-task7-123");
  assert.equal(calls.find(([name]) => name === "paid-email")[1].idempotencyKey, "student-provisioning/operation-task7-123/email/1");
  assert.equal(result.order.orderCode, "ORDER-100");
  assert.equal(result.access.state, "granted");
  assert.ok(result.temporaryCredential?.temporaryPassword);
  const persisted = calls.filter(([name]) => name === "save").map(([, value]) => value.safeResult);
  assert.doesNotMatch(JSON.stringify(persisted), /Temp-Secret|student@example\.com|0901234567/);
});

test("completed replay returns the safe result and performs no business side effect", async () => {
  const safeResult = completedSafeResult();
  const { service, dependencies, calls } = makeHarness({
    claim: { state: "complete", operation: operationRow({ status: "completed", currentStep: "complete", safeResult, orderCode: "ORDER-100" }) },
  });
  const result = await service.provisionStudent(provisioningInput(), dependencies);
  assert.equal(result.ok, true);
  assert.deepEqual(result.nextActions, []);
  assert.equal(calls.length, 0);
});

test("retry after paid-order side effect reconciles by operation id instead of creating a duplicate", async () => {
  const harness = makeHarness();
  harness.dependencies.findOrderByOperationId = async () => harness.order;
  await harness.service.provisionStudent(provisioningInput(), harness.dependencies);
  assert.equal(harness.calls.filter(([name]) => name === "create-order").length, 0);
});

test("paid provisioning uses the real entitlement verifier and fails closed before email", async () => {
  const harness = makeHarness({ overrides: { verifyPaidAccess: () => false } });
  const result = await harness.service.provisionStudent(provisioningInput(), harness.dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.access.reason, "PAID_ORDER_ACCESS_NOT_VERIFIED");
  assert.deepEqual(result.nextActions, ["retry_access"]);
  assert.equal(harness.calls.some(([name]) => name === "paid-email"), false);
});

test("a lost lease after order creation fails closed and the next worker reconciles the created order", async () => {
  const first = makeHarness();
  let saves = 0;
  first.dependencies.saveOutcome = async (input) => {
    saves += 1;
    if (input.currentStep === "ensure_account") {
      const error = new Error("PROVISIONING_OPERATION_LOST_LEASE");
      error.code = "PROVISIONING_OPERATION_LOST_LEASE";
      throw error;
    }
    return operationRow({ currentStep: input.currentStep, safeResult: input.safeResult });
  };
  await assert.rejects(first.service.provisionStudent(provisioningInput(), first.dependencies),
    (error) => error.code === "PROVISIONING_OPERATION_LOST_LEASE");
  assert.equal(first.calls.filter(([name]) => name === "create-order").length, 1);
  assert.ok(saves >= 2);

  const retry = makeHarness();
  retry.dependencies.findOrderByOperationId = async () => retry.order;
  const result = await retry.service.provisionStudent(provisioningInput(), retry.dependencies);
  assert.equal(result.ok, true);
  assert.equal(retry.calls.filter(([name]) => name === "create-order").length, 0);
});

test("atomic enrollment lease loss is fenced and never converted into an ordinary access failure", async () => {
  const error = Object.assign(new Error("PROVISIONING_OPERATION_LOST_LEASE"), { code: "PROVISIONING_OPERATION_LOST_LEASE" });
  const harness = makeHarness({ overrides: { provisionEnrollment: async () => { throw error; } } });
  await assert.rejects(harness.service.provisionStudent(provisioningInput({ mode: "free" }), harness.dependencies),
    (caught) => caught === error);
  assert.equal(harness.calls.some(([name, value]) => name === "save" && value.status === "partial"), false);
});

test("free and trial never create revenue orders, upsert access, and trial requires future expiry", async () => {
  for (const mode of ["free", "trial"]) {
    const { service, dependencies, calls } = makeHarness();
    const result = await service.provisionStudent(provisioningInput({
      mode,
      trialExpiresAt: mode === "trial" ? "2027-01-01T00:00:00.000Z" : undefined,
    }), dependencies);
    assert.equal(result.ok, true);
    assert.equal(calls.some(([name]) => name === "create-order"), false);
    assert.equal(calls.some(([name]) => name === "create-lead"), true);
    const enrollment = calls.find(([name]) => name === "atomic-enrollment")[1];
    assert.equal(enrollment.expiresAt, mode === "trial" ? "2027-01-01T00:00:00.000Z" : null);
    assert.equal(enrollment.mode, mode);
  }
  const { service, dependencies } = makeHarness();
  await assert.rejects(
    service.provisionStudent(provisioningInput({ mode: "trial", trialExpiresAt: "2020-01-01T00:00:00.000Z" }), dependencies),
    (error) => error.code === "PROVISIONING_VALIDATION_FAILED",
  );
});

test("attempted provider failure is persisted truthfully as partial and requires review", async () => {
  const { service, dependencies, calls } = makeHarness({ overrides: {
    sendPaidEmail: async () => ({ ok: false, skipped: false, reason: "provider unavailable" }),
  } });
  const result = await service.provisionStudent(provisioningInput(), dependencies);
  assert.equal(result.ok, false);
  assert.equal(result.email.state, "failed");
  assert.deepEqual(result.nextActions, ["review_email"]);
  const finalization = calls.filter(([name]) => name === "finalize").at(-1)[1];
  assert.equal(finalization.status, "partial");
  assert.equal(finalization.safeResult.errorCode, "EMAIL_SEND_FAILED");
});

test("thrown access and email provider failures become stable partial outcomes", async () => {
  const access = makeHarness({ overrides: { provisionEnrollment: async () => { throw new Error("raw database detail"); } } });
  const accessResult = await access.service.provisionStudent(provisioningInput({ mode: "free" }), access.dependencies);
  assert.equal(accessResult.access.state, "failed");
  assert.deepEqual(accessResult.nextActions, ["retry_access"]);
  assert.doesNotMatch(JSON.stringify(accessResult), /raw database detail/);

  const email = makeHarness({ overrides: { sendPaidEmail: async () => { throw new Error("raw provider detail"); } } });
  const emailResult = await email.service.provisionStudent(provisioningInput(), email.dependencies);
  assert.equal(emailResult.email.state, "failed");
  assert.deepEqual(emailResult.nextActions, ["review_email"]);
  assert.doesNotMatch(JSON.stringify(emailResult), /raw provider detail/);
});

test("email provider success with a failed local marker remains truthful and retryable", async () => {
  for (const markPaidEmailSent of [
    async () => { throw new Error("database unavailable"); },
    async () => ({ ok: false, error: "database unavailable" }),
  ]) {
    const harness = makeHarness({ overrides: { markPaidEmailSent } });
    const result = await harness.service.provisionStudent(provisioningInput(), harness.dependencies);
    assert.equal(result.ok, false);
    assert.equal(result.email.state, "sent");
    assert.equal(result.email.reason, "EMAIL_CONFIRMATION_PENDING");
    assert.deepEqual(result.nextActions, ["retry_email"]);
    assert.doesNotMatch(JSON.stringify(result), /database unavailable/);
  }
});

test("definitive provider skip is retryable while ambiguous dispatch replay requires owner review", async () => {
  const skipped = makeHarness({ overrides: { sendPaidEmail: async () => ({ ok: true, skipped: true, reason: "missing provider" }) } });
  const skippedResult = await skipped.service.provisionStudent(provisioningInput(), skipped.dependencies);
  assert.equal(skippedResult.ok, false);
  assert.equal(skippedResult.email.reason, "EMAIL_RETRY_AVAILABLE");
  assert.equal(skipped.calls.filter(([name]) => name === "finish-email-dispatch").at(-1)[1].state, "retryable");

  const replay = makeHarness({ overrides: { beginEmailDispatch: async () => ({ state: "manual_review" }) } });
  const replayResult = await replay.service.provisionStudent(provisioningInput(), replay.dependencies);
  assert.equal(replayResult.email.reason, "EMAIL_MANUAL_REVIEW_REQUIRED");
  assert.deepEqual(replayResult.nextActions, ["review_email"]);
  assert.equal(replay.calls.some(([name]) => name === "paid-email"), false);
});

test("every attempted provider HTTP or network failure requires owner review", async () => {
  for (const failure of [
    { ok: false, skipped: false, reason: "HTTP 400" },
    { ok: false, skipped: false, reason: "HTTP 409" },
    { ok: false, skipped: false, reason: "HTTP 500" },
  ]) {
    const harness = makeHarness({ overrides: { sendPaidEmail: async () => failure } });
    const result = await harness.service.provisionStudent(provisioningInput(), harness.dependencies);
    assert.deepEqual(result.nextActions, ["review_email"]);
    assert.equal(result.email.reason, "EMAIL_MANUAL_REVIEW_REQUIRED");
    assert.equal(harness.calls.filter(([name]) => name === "finish-email-dispatch").at(-1)[1].state, "manual_review");
  }
  const network = makeHarness({ overrides: { sendPaidEmail: async () => { throw new Error("network timeout"); } } });
  const result = await network.service.provisionStudent(provisioningInput(), network.dependencies);
  assert.deepEqual(result.nextActions, ["review_email"]);
});

test("terminal audit and journal save are one lease-fenced database transaction", () => {
  const sql = read(idempotencyMigrationPath);
  const finalizer = sql.match(/create or replace function public\.finalize_admin_student_provisioning_operation[\s\S]*?(?=revoke all on function public\.finalize_admin_student_provisioning_operation)/i)?.[0] ?? "";
  assert.match(finalizer, /for update/i);
  assert.ok(finalizer.indexOf("for update") < finalizer.indexOf("clock_timestamp()"));
  assert.match(finalizer, /lease_token is distinct from p_lease_token/i);
  assert.match(finalizer, /lease_token is distinct from p_lease_token[\s\S]*'finalize_state', 'lost_lease'[\s\S]*insert into public\.activity_logs/i);
  assert.match(finalizer, /insert into public\.activity_logs/i);
  assert.match(finalizer, /not exists[\s\S]*operationId[\s\S]*outcomeStatus/i);
  assert.match(finalizer, /update public\.admin_student_provisioning_operations/i);
  assert.match(finalizer, /p_status = 'completed'[\s\S]*p_current_step <> 'complete'/i);
  assert.match(sql, /revoke all on function public\.finalize_admin_student_provisioning_operation[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.finalize_admin_student_provisioning_operation[\s\S]*to service_role/i);
  assert.doesNotMatch(read(orchestratorPath), /recordAudit|logProvisioningOutcomeAudit/);
  assert.match(read(orchestratorPath), /finalizeOutcome/);
});

test("journal dispatch constraint requires a non-null state attempt key tuple", () => {
  const sql = read(idempotencyMigrationPath);
  assert.match(sql, /email_dispatch_state is not null[\s\S]*email_dispatch_attempt >= 1[\s\S]*email_dispatch_idempotency_key is not null[\s\S]*email_dispatch_idempotency_key ~/i);
});

test("invalid courses and custom passwords fail before operation claim", async () => {
  for (const scenario of [
    { input: provisioningInput({ courseSlugs: ["missing-course"] }), courses: [{ slug: "course-a", title: "Course A" }] },
    { input: provisioningInput({ temporaryPassword: "UserChosenSecret" }), courses: [{ slug: "course-a", title: "Course A" }] },
  ]) {
    let claims = 0;
    const harness = makeHarness({ overrides: {
      getCourses: async () => scenario.courses,
      claimOperation: async () => { claims += 1; throw new Error("must not claim"); },
    } });
    await assert.rejects(harness.service.provisionStudent(scenario.input, harness.dependencies),
      (error) => error.code === "PROVISIONING_VALIDATION_FAILED");
    assert.equal(claims, 0);
  }
});

test("terminal outcomes use one no-PII atomic finalization", async () => {
  const harness = makeHarness();
  await harness.service.provisionStudent(provisioningInput(), harness.dependencies);
  const terminalCalls = harness.calls.filter(([name]) => name === "finalize");
  assert.equal(terminalCalls.length, 1);
  assert.equal(terminalCalls[0][1].status, "completed");
  assert.deepEqual(terminalCalls[0][1].courseSlugs, ["course-a"]);
  assert.doesNotMatch(JSON.stringify(terminalCalls[0][1]), /student@example|090123|Temp-Secret/);
  assert.equal(harness.calls.some(([name, value]) => name === "save" && value.status === "completed"), false);
});

test("an atomic finalization failure prevents a false completed result", async () => {
  const harness = makeHarness({ overrides: { finalizeOutcome: async () => { throw new Error("finalizer unavailable"); } } });
  await assert.rejects(harness.service.provisionStudent(provisioningInput(), harness.dependencies),
    (error) => error.code === "PROVISIONING_STEP_FAILED" && !error.message.includes("finalizer unavailable"));
  assert.equal(harness.calls.some(([name, value]) => name === "save" && value.status === "completed"), false);
});

test("atomic SQL preserves unlimited access, promotes expired trial to free, and marks in the same transaction", () => {
  const sql = read(idempotencyMigrationPath);
  const rpc = sql.match(/create or replace function public\.provision_admin_student_enrollment[\s\S]*?(?=revoke all on function public\.provision_admin_student_enrollment)/i)?.[0] ?? "";
  assert.match(rpc, /p_mode = 'trial'[\s\S]*v_enrollment\.expires_at is null[\s\S]*v_outcome := 'already_unlimited'/i);
  assert.match(rpc, /elsif p_mode = 'free'[\s\S]*status = 'active'[\s\S]*expires_at = null[\s\S]*'access_kind', 'free'/i);
  assert.match(rpc, /insert into crm_v2\.enrollments[\s\S]*'provisioning_operation_id', p_operation_id/i);
  const finalizer = sql.match(/create or replace function public\.finalize_admin_student_provisioning_operation[\s\S]*?(?=revoke all on function public\.finalize_admin_student_provisioning_operation)/i)?.[0] ?? "";
  assert.match(finalizer, /'operationId',[\s\S]*'outcomeStatus',[\s\S]*'mode',[\s\S]*'courseSlugs'/i);
  assert.doesNotMatch(finalizer, /student_email|student_phone|actor_email|temporary_password/i);
  assert.doesNotMatch(read("services/studentProvisioningService.ts"), /crm_v2_lms_upsert_enrollment|mark_admin_student_provisioning_enrollment/);
});

test("atomic enrollment repairs its marker on retry and preserves unlimited access", async () => {
  const { service, dependencies, calls } = makeHarness({ overrides: {
    provisionEnrollment: async (input) => {
      calls.push(["atomic-enrollment", input]);
      return { id: "existing", outcome: "already_unlimited", accessKind: "free", expiresAt: null };
    },
  } });
  const result = await service.provisionStudent(provisioningInput({ mode: "trial", trialExpiresAt: "2027-01-01T00:00:00.000Z" }), dependencies);
  assert.equal(result.access.state, "existing");
  assert.equal(calls.filter(([name]) => name === "atomic-enrollment").length, 1);
});

test("orchestrator source fences every journal save and renews before external calls", () => {
  const source = read(orchestratorPath);
  assert.match(source, /leaseToken/);
  assert.match(source, /saveOutcome[\s\S]*leaseToken/);
  assert.match(source, /renewLease/);
  assert.doesNotMatch(source, /console\.(log|info|debug)/);
});

test("LMS entitlement denies expired trials and allows future trials", () => {
  const compiled = ts.transpileModule(read("services/lmsService.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const cjsModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "@/lib/crm-v2/normalize") return { normalizeEmail: (value) => String(value ?? "").trim().toLowerCase() };
    return {};
  });
  const { isEnrollmentCurrentlyActive } = cjsModule.exports;
  const now = Date.parse("2026-07-11T00:00:00.000Z");
  assert.equal(isEnrollmentCurrentlyActive({ status: "active", expiresAt: "2026-07-10T23:59:59.000Z" }, now), false);
  assert.equal(isEnrollmentCurrentlyActive({ status: "active", expiresAt: "2026-07-12T00:00:00.000Z" }, now), true);
  assert.equal(isEnrollmentCurrentlyActive({ status: "revoked", expiresAt: "2026-07-12T00:00:00.000Z" }, now), false);
});

test("student provisioning email adapters pass Resend idempotency keys", () => {
  assert.match(read("lib/notifications/payment-success-email.ts"), /"Idempotency-Key": options\.idempotencyKey/);
  assert.match(read("lib/notifications/student-access-email.ts"), /"Idempotency-Key": idempotencyKey/);
});
