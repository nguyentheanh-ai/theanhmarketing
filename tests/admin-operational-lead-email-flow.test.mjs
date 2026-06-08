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

test("Supabase password reset flow verifies account email before sending reset link", () => {
  assert.ok(exists("app/quen-mat-khau/page.tsx"));
  assert.ok(exists("components/auth/forgot-password-form.tsx"));
  assert.ok(exists("app/api/auth/forgot-password/route.ts"));
  assert.ok(exists("app/api/auth/recovery/confirm/route.ts"));
  assert.ok(exists("lib/auth/password-reset-url.ts"));

  const route = read("app/api/auth/forgot-password/route.ts");
  const confirmRoute = read("app/api/auth/recovery/confirm/route.ts");
  const urlHelper = read("lib/auth/password-reset-url.ts");
  const resetEmail = read("lib/notifications/password-reset-email.ts");
  const form = read("components/auth/forgot-password-form.tsx");
  const loginForm = read("components/auth/login-form.tsx");
  const adminLoginForm = read("components/auth/admin-login-form.tsx");

  assert.match(route, /generateLink/);
  assert.match(route, /getPasswordResetConfirmUrl/);
  assert.match(route, /hashed_token/);
  assert.doesNotMatch(route, /new URL\("\/doi-mat-khau[\s\S]*request\.url/);
  assert.match(route, /sendPasswordResetEmailViaResend/);
  assert.match(route, /recordEmailLog/);
  assert.match(confirmRoute, /verifyOtp/);
  assert.match(confirmRoute, /token_hash/);
  assert.match(confirmRoute, /type !== "recovery"/);
  assert.match(urlHelper, /isLocalhost/);
  assert.match(urlHelper, /defaultSiteUrl = "https:\/\/theanhmarketing\.com"/);
  assert.match(urlHelper, /api\/auth\/recovery\/confirm/);
  assert.match(resetEmail, /https:\/\/api\.resend\.com\/emails/);
  assert.match(resetEmail, /passwordResetEmailSubject/);
  assert.match(resetEmail, /buildEmailLink/);
  assert.match(resetEmail, /resetEmailUrl/);
  assert.match(route, /listUsers/);
  assert.match(route, /not_found/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /checkRateLimit/);
  assert.match(route, /password_reset_requested/);
  assert.match(route, /Email đã tồn tại trong hệ thống\. Hệ thống đã gửi link đặt lại mật khẩu qua email/);
  assert.match(route, /Email này chưa tồn tại trong hệ thống/);
  assert.match(form, /response\.json/);
  assert.match(form, /result\?\.message/);
  assert.match(loginForm, /\/quen-mat-khau/);
  assert.match(adminLoginForm, /\/quen-mat-khau/);
});

test("lead operations have database-backed notes, activities, email logs, and cache invalidation", () => {
  for (const file of [
    "services/leadActivityService.ts",
    "services/leadNoteService.ts",
    "services/emailLogService.ts",
    "app/api/admin/activities/recent/route.ts",
    "app/api/admin/leads/[id]/notes/route.ts",
    "app/api/resend/webhook/route.ts",
    "docs/SUPABASE_ADMIN_OPERATIONS.sql",
  ]) {
    assert.ok(exists(file), `${file} should exist`);
  }

  const migration = read("docs/SUPABASE_ADMIN_OPERATIONS.sql");
  assert.match(migration, /create table if not exists public\.lead_activities/);
  assert.match(migration, /create table if not exists public\.lead_notes/);
  assert.match(migration, /create table if not exists public\.email_logs/);
  assert.match(migration, /idx_lead_activities_created_at/);
  assert.match(migration, /idx_lead_notes_lead_id/);
  assert.match(migration, /idx_email_logs_resend_email_id/);
  assert.match(migration, /admin/);

  const activities = read("services/leadActivityService.ts");
  const notes = read("services/leadNoteService.ts");
  const emailLogs = read("services/emailLogService.ts");

  assert.match(activities, /recordLeadActivity/);
  assert.match(activities, /getRecentLeadActivities/);
  assert.match(activities, /lead_created|sale_status_changed|note_added|email_sent|email_failed/);
  assert.match(notes, /addLeadNote/);
  assert.match(notes, /getLeadNotes/);
  assert.match(emailLogs, /recordEmailLog/);
  assert.match(emailLogs, /updateEmailLogFromResendEvent/);
  assert.match(emailLogs, /resendEmailId/);
});

test("admin UI surfaces real activities, lead notes, email history, and refresh controls", () => {
  const dashboardPage = read("app/admin/dashboard/page.tsx");
  const dashboard = read("components/admin/admin-overview-dashboard.tsx");
  const leadManager = read("components/admin/lead-manager.tsx");
  const adminData = read("services/adminDataService.ts");
  const resendRoute = read("app/api/admin/leads/[id]/resend-email/route.ts");
  const saleRoute = read("app/api/admin/leads/[id]/sale-status/route.ts");
  const createLeadRoute = read("app/api/admin/leads/route.ts");

  assert.match(adminData, /activities:\s*"admin:activities"/);
  assert.match(adminData, /getAdminLeadActivities/);
  assert.match(adminData, /invalidateAdminModules\(.*activities/s);
  assert.match(dashboardPage, /getAdminLeadActivities\(\)/);
  assert.match(dashboard, /activities/);
  assert.match(dashboard, /\/api\/admin\/activities\/recent\?refresh=1/);
  assert.match(dashboard, /Hoạt động Lead gần đây/);
  assert.match(dashboard, /Refresh/);

  assert.match(leadManager, /Ghi chú khách hàng/);
  assert.match(leadManager, /Ghi chú sale/);
  assert.match(leadManager, /onQuickNote/);
  assert.match(leadManager, /\/api\/admin\/leads\/\$\{encodeURIComponent\(leadId\)\}\/notes/);
  assert.match(leadManager, /Lịch sử email/);
  assert.match(leadManager, /Chưa có email nào được gửi cho khách này\./);
  assert.match(leadManager, /Đã cập nhật dữ liệu lúc/);

  assert.match(resendRoute, /recordEmailLog/);
  assert.match(resendRoute, /recordLeadActivity/);
  assert.match(saleRoute, /recordLeadActivity/);
  assert.match(createLeadRoute, /recordLeadActivity/);
});

test("lead sale statuses support repeated contact attempts and explicit activity copy", () => {
  const leadService = read("services/leadService.ts");
  const leadManager = read("components/admin/lead-manager.tsx");
  const saleRoute = read("app/api/admin/leads/[id]/sale-status/route.ts");
  const dashboard = read("components/admin/admin-overview-dashboard.tsx");

  assert.match(leadService, /Đã liên hệ lần 2/);
  assert.match(leadService, /Đã liên hệ lần 3/);
  assert.match(leadManager, /Đã liên hệ lần 2/);
  assert.match(leadManager, /Đã liên hệ lần 3/);
  assert.match(saleRoute, /leadName/);
  assert.match(saleRoute, /cập nhật trạng thái khách/);
  assert.match(saleRoute, /oldValue/);
  assert.match(dashboard, /activity\.description/);
});
