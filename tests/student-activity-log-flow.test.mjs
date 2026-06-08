import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.resolve(relativePath));
}

test("student activity log has a central service, schema, and protected admin API", () => {
  assert.ok(exists("services/activityLogService.ts"));
  assert.ok(exists("app/api/admin/activity-logs/route.ts"));
  assert.ok(exists("app/api/student/activity/route.ts"));

  const service = read("services/activityLogService.ts");
  const schema = read("docs/SUPABASE_ACTIVITY_LOGS.sql");
  const adminRoute = read("app/api/admin/activity-logs/route.ts");
  const studentRoute = read("app/api/student/activity/route.ts");

  assert.match(schema, /create table if not exists public\.activity_logs/);
  assert.match(schema, /event_type text not null/);
  assert.match(schema, /actor_type text not null/);
  assert.match(schema, /ip_address text/);
  assert.match(schema, /user_agent text/);
  assert.match(schema, /password_reset_completed/);
  assert.match(schema, /student_entered_learning/);

  assert.match(service, /export async function logStudentActivity/);
  assert.match(service, /export async function getStudentActivityLogs/);
  assert.match(service, /sanitizeActivityMetadata/);
  assert.doesNotMatch(service, /password\s*:/);
  assert.doesNotMatch(service, /token\s*:/);

  assert.match(adminRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(adminRoute, /getStudentActivityLogs/);
  assert.match(studentRoute, /getCurrentAuth/);
  assert.match(studentRoute, /student_login_success/);
  assert.match(studentRoute, /password_changed/);
});

test("real student auth and learning flows write activity only after success", () => {
  const loginForm = read("components/auth/login-form.tsx");
  const changePasswordForm = read("components/auth/change-password-form.tsx");
  const lessonPage = read("app/learn/[course]/[lesson]/page.tsx");
  const dashboardPage = read("app/dashboard/page.tsx");

  assert.match(loginForm, /signInWithPassword/);
  assert.match(loginForm, /\/api\/student\/activity/);
  assert.match(loginForm, /student_login_success/);
  assert.match(loginForm, /setMessage\("Email hoáº·c máº­t kháº©u chÆ°a Ä‘Ãºng/);

  assert.match(changePasswordForm, /updateUser/);
  assert.match(changePasswordForm, /\/api\/student\/activity/);
  assert.match(changePasswordForm, /password_changed/);

  assert.match(lessonPage, /logStudentActivity/);
  assert.match(lessonPage, /student_entered_learning/);
  assert.match(dashboardPage, /logStudentActivity/);
  assert.match(dashboardPage, /student_login_success/);
});

test("admin student detail shows real activity timeline instead of fake mail/progress history", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(page, /getStudentActivityLogs/);
  assert.match(actions, /activityLogs/);
  assert.match(actions, /Lá»‹ch sá»­ hoáº¡t Ä‘á»™ng há»c viÃªn/);
  assert.match(actions, /ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng nÃ o Ä‘Æ°á»£c ghi nháº­n/);
  assert.doesNotMatch(actions, /Lá»‹ch sá»­ mail/);
  assert.doesNotMatch(actions, /ChÆ°a cÃ³ log há»c táº­p/);
});
