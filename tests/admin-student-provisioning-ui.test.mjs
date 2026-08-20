import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const idempotencyMigration = () => [
  "supabase/migrations/20260711120000_student_provisioning_idempotency.sql",
  "supabase/migrations/20260711120100_student_provisioning_enrollment.sql",
  "supabase/migrations/20260711120200_student_provisioning_email_dispatch.sql",
  "supabase/migrations/20260711120300_student_provisioning_email_review.sql",
  "supabase/migrations/20260711120400_student_provisioning_finalization.sql",
  "supabase/migrations/20260711120500_student_provisioning_function_grants.sql",
  "supabase/migrations/20260711120600_student_provisioning_operation_read.sql",
].map(read).join("\n");

function loadRequestParser() {
  const source = read("lib/admin/student-provisioning-request.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const cjs = { exports: {} };
  new Function("exports", "module", compiled)(cjs.exports, cjs);
  return cjs.exports;
}

function loadPureTs(file) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const cjs = { exports: {} };
  new Function("exports", "module", compiled)(cjs.exports, cjs);
  return cjs.exports;
}

test("strict provisioning request parser normalizes all three modes and rejects custom credentials", () => {
  const { parseStudentProvisioningRequest } = loadRequestParser();
  const base = {
    operationId: "0d5814b8-e729-4d43-8b6a-f4ccf95b751a",
    name: "  Nguyễn Văn A  ", phone: " 0901 234 567 ", email: " STUDENT@EXAMPLE.COM ",
    courseSlugs: ["course-b", "course-a", "course-a"], source: " Admin ", note: " Ghi chú ", sendEmail: true,
  };
  for (const mode of ["paid", "free"]) {
    const result = parseStudentProvisioningRequest({ ...base, mode });
    assert.equal(result.mode, mode);
    assert.equal(result.email, "student@example.com");
    assert.equal(result.phone, "0901234567");
    assert.deepEqual(result.courseSlugs, ["course-a", "course-b"]);
  }
  assert.equal(parseStudentProvisioningRequest({ ...base, mode: "trial", trialExpiresAt: "2099-01-01T00:00:00.000Z" }).mode, "trial");
  assert.throws(() => parseStudentProvisioningRequest({ ...base, mode: "paid", temporaryPassword: "secret" }));
  assert.throws(() => parseStudentProvisioningRequest({ ...base, mode: "paid", unexpected: true }));
  assert.throws(() => parseStudentProvisioningRequest({ ...base, mode: "trial", trialExpiresAt: "2020-01-01T00:00:00.000Z" }));
});

test("trial local date-time is always interpreted in Vietnam rather than browser timezone", () => {
  const { formatVietnamLocalDateTime, vietnamLocalDateTimeToIso } = loadPureTs("lib/admin/vietnam-datetime.ts");
  assert.equal(vietnamLocalDateTimeToIso("2026-07-18T09:30"), "2026-07-18T02:30:00.000Z");
  assert.match(formatVietnamLocalDateTime("2026-07-18T09:30"), /09:30/);
  assert.equal(vietnamLocalDateTimeToIso("2026-02-30T09:30"), null);
  assert.equal(vietnamLocalDateTimeToIso("not-a-date"), null);
});

test("grant API is a bounded authenticated adapter with safe status mapping", () => {
  const route = read("app/api/admin/students/grant/route.ts");
  assert.match(route, /getCurrentAuth\(\)/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(route, /application\/json/);
  assert.match(route, /MAX_REQUEST_BYTES/);
  assert.doesNotMatch(route, /export const MAX_REQUEST_BYTES/);
  assert.match(route, /parseStudentProvisioningRequest/);
  assert.match(route, /provisionStudent\([\s\S]*actorId: user\.id/);
  assert.match(route, /PROVISIONING_OPERATION_CONFLICT[\s\S]*409/);
  assert.match(route, /result\.ok \? 200 : 207/);
  assert.doesNotMatch(route, /createManualPaidOrder|ensureStudentAccountForPaidOrder|temporaryPassword/);
  assert.doesNotMatch(route, /error instanceof Error \? error\.message/);
});

test("wizard exposes one idempotent three-step paid free trial workflow", () => {
  const wizard = read("components/admin/student-provisioning-wizard.tsx");
  for (const label of ["Loại học viên", "Thông tin & khóa học", "Kiểm tra & thực hiện", "Có phí", "Miễn phí", "Học thử"]) {
    assert.match(wizard, new RegExp(label));
  }
  assert.match(wizard, /crypto\.randomUUID\(\)/);
  assert.match(wizard, /type="datetime-local"/);
  assert.match(wizard, /Gửi email hướng dẫn/);
  assert.match(wizard, /isSubmitting/);
  assert.match(wizard, /AbortController/);
  assert.match(wizard, /isProvisioningResult/);
  assert.match(wizard, /Tài khoản/);
  assert.match(wizard, /Đơn hàng/);
  assert.match(wizard, /Quyền học/);
  assert.match(wizard, /Email/);
  assert.match(wizard, /retry_access/);
  assert.match(wizard, /retry_email/);
  assert.match(wizard, /review_email/);
  assert.match(wizard, /confirm_delivered/);
  assert.match(wizard, /confirm_not_delivered/);
  assert.doesNotMatch(wizard, /temporaryPassword|Mật khẩu tạm/);
  assert.doesNotMatch(wizard, /[?&](email|phone|name)=/);
});

test("manual email review is an owner-only explicit decision endpoint", () => {
  const route = read("app/api/admin/students/provisioning-review/route.ts");
  const migration = idempotencyMigration();
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(route, /resolveProvisioningEmailReview/);
  assert.match(route, /content-length/);
  assert.match(route, /readProvisioningOperation/);
  assert.match(route, /toPublicProvisioningResult/);
  assert.match(route, /confirm_delivered/);
  assert.match(route, /confirm_not_delivered/);
  assert.doesNotMatch(route, /retry|yes|temporaryPassword/);
  const resolver = migration.match(/create or replace function public\.resolve_admin_student_provisioning_email_review[\s\S]*?end; \$\$;/i)?.[0] ?? "";
  assert.match(resolver, /safe_result = v_safe_result/);
  assert.match(resolver, /status <> 'partial'/);
  assert.match(resolver, /current_step <> 'send_email'/);
  assert.match(resolver, /lease_token is not null/);
  assert.match(resolver, /lease_expires_at is not null/);
  assert.match(resolver, /#>> '\{email,state\}' <> 'failed'/);
  assert.match(resolver, /nextActions'[\s\S]*\? 'review_email'/);
  assert.match(resolver, /status = v_status/);
  assert.match(resolver, /current_step = v_current_step/);
  assert.match(resolver, /insert into public\.activity_logs/);
  assert.match(resolver, /actor_id[\s\S]*p_owner_id/);
  assert.match(resolver, /student_provisioning_["']? \|\| v_status/);
});

test("recovery status is authenticated and returns only the safe journal result", () => {
  const route = read("app/api/admin/students/provisioning-status/route.ts");
  const service = read("services/studentProvisioningOperationService.ts");
  const responseMapper = read("lib/admin/student-provisioning-response.ts");
  assert.match(route, /getCurrentAuth\(\)/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(route, /readProvisioningOperation/);
  assert.match(route, /private, no-store/);
  assert.match(responseMapper, /student[\s\S]*order[\s\S]*access[\s\S]*email[\s\S]*nextActions/);
  assert.doesNotMatch(route, /requestFingerprint|actorId|temporaryCredential|email_dispatch|providerMessageId/);
  assert.match(service, /readProvisioningOperation[\s\S]*get_admin_student_provisioning_operation/);
  assert.doesNotMatch(service, /\.from\(["']admin_student_provisioning_operations["']\)/);
});

test("student dialog preserves payment-link mode and dashboard uses the canonical wizard entry", () => {
  const dialog = read("components/admin/student-create-dialog.tsx");
  assert.match(dialog, /StudentProvisioningWizard/);
  assert.match(dialog, /onBusyChange/);
  assert.match(dialog, /disabled=\{isBusy\}/);
  assert.match(dialog, /canReviewEmail/);
  assert.match(dialog, /dialogRef/);
  assert.match(dialog, /PaymentLinkForm/);
  assert.match(dialog, /Gửi form thanh toán/);
  assert.match(read("components/admin/solo-command-center/command-center-dashboard.tsx"), /\/admin\/hoc-vien\?add_student=1/);
  assert.match(read("app/admin/hoc-vien/page.tsx"), /add_student/);
});

test("partial provisioning outcomes enter the safe recovery queue by operation id", () => {
  const activities = read("services/activityLogService.ts");
  const adapter = read("services/adminCommandCenterService.ts");
  const model = read("lib/admin/solo-command-center.ts");
  const page = read("app/admin/hoc-vien/page.tsx");
  const dialog = read("components/admin/student-create-dialog.tsx");
  assert.match(activities, /student_provisioning_partial/);
  assert.match(activities, /student_provisioning_failed/);
  assert.match(activities, /student_provisioning_completed/);
  assert.match(adapter, /operationId/);
  assert.match(adapter, /outcomeStatus/);
  assert.match(model, /operation_id/);
  assert.match(model, /add_student=1&operation_id=/);
  assert.match(page, /operation_id/);
  assert.match(page, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(dialog, /resumeOperationId/);
  assert.match(read("components/admin/student-provisioning-wizard.tsx"), /provisioning-status\?operationId=/);
  assert.match(read("components/admin/student-provisioning-wizard.tsx"), /Nhập lại thông tin để tiếp tục/);
  assert.match(read("components/admin/student-provisioning-wizard.tsx"), /Tiếp tục cùng mã thao tác/);
  assert.match(idempotencyMigration(), /'errorCode', p_safe_result->>'errorCode'/);
});
