import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const source = read(relativePath);
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const cjsModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(cjsModule.exports, cjsModule, () => {
    throw new Error("Unexpected runtime import in pure DTO module");
  });
  return cjsModule.exports;
}

test("student page does not eagerly fetch activity for visible students", () => {
  const page = read("app/admin/hoc-vien/page.tsx");

  assert.doesNotMatch(page, /getStudentActivityLogs/);
  assert.doesNotMatch(page, /activityLogEntries/);
  assert.doesNotMatch(page, /activityLogsByStudentId/);
  assert.match(page, /Promise\.all\(\[getAdminCourses\(\), getAdminStudentAccessRecords\(\)\]\)/);
});

test("student detail mounts one lazy timeline without an activityLogs prop", () => {
  const actions = read("components/admin/student-access-actions.tsx");

  assert.doesNotMatch(actions, /activityLogs\??:/);
  assert.match(actions, /import \{ StudentActivityTimeline \}/);
  assert.match(actions, /isPreviewOpen[\s\S]*<StudentActivityTimeline studentEmail=\{student\.email\}/);
});

test("lazy timeline uses the protected POST endpoint with abort and complete states", () => {
  const timeline = read("components/admin/student-activity-timeline.tsx");

  assert.match(timeline, /fetch\("\/api\/admin\/students\/activity"/);
  assert.match(timeline, /method:\s*"POST"/);
  assert.match(timeline, /body:\s*JSON\.stringify\(\{ email: requestEmail \}\)/);
  assert.match(timeline, /new AbortController\(\)/);
  assert.match(timeline, /controller\.abort\(\)/);
  assert.match(timeline, /useEffect\([\s\S]*\[studentEmail, requestVersion\]/);
  assert.match(timeline, /Đang tải hoạt động/);
  assert.match(timeline, /Không tải được lịch sử hoạt động/);
  assert.match(timeline, /Thử lại/);
  assert.match(timeline, /Chưa có hoạt động/);
  assert.match(timeline, /aria-live/);
  assert.doesNotMatch(timeline, /eventDescription|metadata|actorEmail/);
});

test("activity API authenticates before parsing input and enforces a fixed bounded query", () => {
  const route = read("app/api/admin/students/activity/route.ts");
  const authIndex = route.indexOf("getCurrentAuth()");
  const bodyIndex = route.indexOf("request.json()");

  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET|searchParams|new URL\(/);
  assert.ok(authIndex >= 0 && bodyIndex > authIndex, "auth must happen before request body parsing");
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(route, /cleanEmail\(\(body as \{ email\?: unknown \}\)\.email\)/);
  assert.match(route, /isValidEmail\(email\)/);
  assert.match(route, /getStudentActivityTimelineStrict\(\{ studentEmail: email, limit: 20 \}\)/);
  assert.doesNotMatch(route, /getStudentActivityLogs/);
  assert.doesNotMatch(route, /body\.limit/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
});

test("activity API returns 400 for every invalid JSON body shape before data read", () => {
  const route = read("app/api/admin/students/activity/route.ts");
  const authIndex = route.indexOf("getCurrentAuth()");
  const parseIndex = route.indexOf("request.json().catch(() => null)");
  const strictReadIndex = route.lastIndexOf("getStudentActivityTimelineStrict(");

  assert.ok(authIndex >= 0 && parseIndex > authIndex && strictReadIndex > parseIndex);
  assert.match(route, /!body\s*\|\|\s*typeof body !== "object"\s*\|\|\s*Array\.isArray\(body\)/);
  assert.match(route, /return json\([^;]+, 400\)/s);
  assert.match(route, /catch\s*\{[\s\S]*return json\([^;]+, 500\)/);
});

test("strict student timeline read selects only safe required fields and fails closed", () => {
  const service = read("services/activityLogService.ts");
  const strictStart = service.indexOf("export async function getStudentActivityTimelineStrict");
  const strictEnd = service.indexOf("export function getCommandCenterActivityQuery", strictStart);
  const strictFunction = service.slice(strictStart, strictEnd);

  assert.match(strictFunction, /createSupabaseAdminClient\(\)/);
  assert.match(strictFunction, /if \(!supabase\)[\s\S]*throw new Error/);
  assert.match(strictFunction, /\.select\("id,event_type,status,actor_type,created_at"\)/);
  assert.match(strictFunction, /\.eq\("student_email", studentEmail\)/);
  assert.match(strictFunction, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(strictFunction, /\.limit\(limit\)/);
  assert.match(strictFunction, /if \(error \|\| !data\)[\s\S]*throw new Error/);
  assert.doesNotMatch(strictFunction, /event_title|event_description|metadata|student_phone|ip_address|user_agent|actor_name|actor_email|lead_id|user_id|student_id/);
});

test("safe activity DTO is an allowlist and drops adversarial sensitive fields", () => {
  const { mapStudentActivityDto } = loadTsModule("lib/admin/student-activity.ts");
  const dto = mapStudentActivityDto({
    id: "log-1",
    eventType: "password_reset_completed",
    eventTitle: `Đổi mật khẩu ${"x".repeat(500)}`,
    eventDescription: "raw error password=Hidden123 token=secret-token",
    status: "success",
    actorType: "admin",
    actorName: "Điều phối viên",
    actorEmail: "owner@example.com",
    studentEmail: "student@example.com",
    studentPhone: "0909123456",
    ipAddress: "127.0.0.1",
    userAgent: "secret-agent",
    leadId: "lead-secret",
    userId: "user-secret",
    metadata: { password: "Hidden123", token: "secret-token", email: "private@example.com", phone: "0909000000" },
    createdAt: "2026-07-11T01:02:03.000Z",
  });
  const serialized = JSON.stringify(dto);

  assert.deepEqual(Object.keys(dto).sort(), ["actorLabel", "createdAt", "eventTitle", "eventType", "id", "status"].sort());
  assert.equal(dto.actorLabel, "Admin");
  assert.ok(dto.eventTitle.length <= 160);
  for (const secret of ["Hidden123", "secret-token", "owner@example.com", "student@example.com", "0909123456", "127.0.0.1", "lead-secret", "user-secret", "secret-agent"]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
});

test("safe activity DTO controls actor labels instead of exposing identity fields", () => {
  const { mapStudentActivityDto } = loadTsModule("lib/admin/student-activity.ts");
  const base = { id: "log-2", eventType: "student_login_success", eventTitle: "Đăng nhập", status: "success", createdAt: "2026-07-11T01:02:03.000Z" };

  assert.equal(mapStudentActivityDto({ ...base, actorType: "student", actorName: "Student Name" }).actorLabel, "Học viên");
  assert.equal(mapStudentActivityDto({ ...base, actorType: "system", actorName: "root" }).actorLabel, "Hệ thống");
  assert.equal(mapStudentActivityDto({ ...base, actorType: "admin", actorName: "" }).actorLabel, "Admin");
  assert.equal(mapStudentActivityDto({ ...base, actorType: "unknown", actorName: "owner@example.com" }).actorLabel, "Hệ thống");
});

test("safe activity DTO rejects an uncontrolled event type", () => {
  const { mapStudentActivityDto } = loadTsModule("lib/admin/student-activity.ts");
  const dto = mapStudentActivityDto({
    id: "log-3",
    eventType: "token=should-not-leak",
    eventTitle: "Cập nhật",
    status: "info",
    actorType: "system",
    actorName: null,
    createdAt: "2026-07-11T01:02:03.000Z",
  });

  assert.equal(dto.eventType, "activity_updated");
  assert.equal(dto.eventTitle, "Hoạt động hệ thống");
  assert.equal(JSON.stringify(dto).includes("should-not-leak"), false);
});

test("safe activity DTO never copies raw event titles or actor names", () => {
  const { mapStudentActivityDto } = loadTsModule("lib/admin/student-activity.ts");
  const dto = mapStudentActivityDto({
    id: "log-4",
    eventType: "password_reset_completed",
    eventTitle: "student@example.com 0909123456 Authorization Bearer secret api_key=hidden mật khẩu=123456",
    status: "success",
    actorType: "admin",
    actorName: "owner@example.com 0988000000 Authorization Bearer admin-secret api_key=root mật khẩu=admin",
    actorEmail: "owner@example.com",
    createdAt: "2026-07-11T01:02:03.000Z",
  });
  const serialized = JSON.stringify(dto).toLowerCase();

  assert.equal(dto.eventTitle, "Đã đặt lại mật khẩu");
  assert.equal(dto.actorLabel, "Admin");
  for (const fragment of ["student@example.com", "owner@example.com", "0909123456", "0988000000", "authorization", "bearer", "api_key", "mật khẩu=", "secret"]) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
});

test("safe activity DTO treats prototype property names as unknown event types", () => {
  const { mapStudentActivityDto } = loadTsModule("lib/admin/student-activity.ts");
  const expectedKeys = ["actorLabel", "createdAt", "eventTitle", "eventType", "id", "status"].sort();

  for (const eventType of ["constructor", "toString", "__proto__"]) {
    const dto = mapStudentActivityDto({
      id: `log-${eventType}`,
      eventType,
      eventTitle: "Authorization Bearer must-not-leak",
      status: "info",
      actorType: "system",
      actorName: null,
      createdAt: "2026-07-11T01:02:03.000Z",
    });

    assert.deepEqual(Object.keys(dto).sort(), expectedKeys, eventType);
    assert.equal(typeof dto.eventTitle, "string", eventType);
    assert.equal(dto.eventTitle, "Hoạt động hệ thống", eventType);
    assert.equal(dto.eventType, "activity_updated", eventType);
  }
});

test("strict activity timeline limit is bounded between one and twenty", () => {
  const { normalizeStudentActivityTimelineLimit } = loadTsModule("lib/admin/student-activity.ts");

  assert.equal(normalizeStudentActivityTimelineLimit(undefined), 20);
  assert.equal(normalizeStudentActivityTimelineLimit(0), 1);
  assert.equal(normalizeStudentActivityTimelineLimit(7), 7);
  assert.equal(normalizeStudentActivityTimelineLimit(999), 20);
});

test("timeline view never renders email A logs under email B", () => {
  const { getStudentActivityTimelineView } = loadTsModule("lib/admin/student-activity-timeline-state.ts");
  const state = {
    email: "a@example.com",
    generation: 1,
    phase: "ready",
    logs: [{ id: "a-log", eventType: "student_login_success", eventTitle: "Học viên đăng nhập thành công", status: "success", actorLabel: "Học viên", createdAt: "2026-07-11T01:02:03.000Z" }],
  };

  const view = getStudentActivityTimelineView(state, "b@example.com");
  assert.equal(view.email, "b@example.com");
  assert.equal(view.phase, "loading");
  assert.deepEqual(view.logs, []);
});

test("timeline generation guard rejects late or cross-student responses", () => {
  const { isStudentActivityTimelineRequestCurrent } = loadTsModule("lib/admin/student-activity-timeline-state.ts");
  const state = { email: "b@example.com", generation: 2, phase: "loading", logs: [] };

  assert.equal(isStudentActivityTimelineRequestCurrent(state, "b@example.com", 2), true);
  assert.equal(isStudentActivityTimelineRequestCurrent(state, "a@example.com", 2), false);
  assert.equal(isStudentActivityTimelineRequestCurrent(state, "b@example.com", 1), false);
});

test("timeline request lifecycle guards every async state update and aborts inactive work", () => {
  const timeline = read("components/admin/student-activity-timeline.tsx");

  assert.match(timeline, /let active = true/);
  assert.match(timeline, /if \(!active \|\| controller\.signal\.aborted\) return/);
  assert.match(timeline, /active = false;[\s\S]*controller\.abort\(\)/);
  assert.match(timeline, /isStudentActivityTimelineRequestCurrent/);
  assert.match(timeline, /getStudentActivityTimelineView/);
});
