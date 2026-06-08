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

test("lead creation and payment confirmation both sync explicit Google Sheet payloads", () => {
  const sheets = read("lib/notifications/google-sheets.ts");
  const ordersRoute = read("app/api/orders/route.ts");
  const sepayRoute = read("app/api/sepay/webhook/route.ts");
  const registerForm = read("components/auth/register-form.tsx");

  assert.match(sheets, /buildGoogleSheetLeadPayload/);
  assert.match(sheets, /syncLeadToGoogleSheet/);
  assert.match(sheets, /dedupeKey/);
  assert.match(sheets, /entityType:\s*"lead"/);
  assert.match(sheets, /console\.warn/);
  assert.match(ordersRoute, /leadId/);
  assert.match(ordersRoute, /updateLeadAdmin/);
  assert.match(sepayRoute, /syncOrderToGoogleSheet/);
  assert.match(sepayRoute, /Google Sheets paid order sync failed/);
  assert.doesNotMatch(registerForm, /from\("leads"\)\.insert/);
  assert.match(registerForm, /\/api\/leads/);
});

test("admin lead APIs cover refresh, sale status, resend email, email logs and sheet resync", () => {
  assert.ok(exists("app/api/admin/leads/route.ts"));
  assert.ok(exists("app/api/admin/leads/[id]/sale-status/route.ts"));
  assert.ok(exists("app/api/admin/leads/[id]/resend-email/route.ts"));
  assert.ok(exists("app/api/admin/leads/[id]/email-logs/route.ts"));
  assert.ok(exists("app/api/admin/leads/[id]/delete/route.ts"));
  assert.ok(exists("app/api/admin/leads/resync-google-sheet/route.ts"));

  const listRoute = read("app/api/admin/leads/route.ts");
  const saleRoute = read("app/api/admin/leads/[id]/sale-status/route.ts");
  const resendRoute = read("app/api/admin/leads/[id]/resend-email/route.ts");
  const deleteRoute = read("app/api/admin/leads/[id]/delete/route.ts");
  const resyncRoute = read("app/api/admin/leads/resync-google-sheet/route.ts");

  for (const source of [listRoute, saleRoute, resendRoute, deleteRoute, resyncRoute]) {
    assert.match(source, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
    assert.match(source, /invalidateAdminModules/);
  }

  assert.match(listRoute, /export async function GET/);
  assert.match(saleRoute, /saleStatus/);
  assert.match(saleRoute, /"lead" in result \? result\.lead : undefined/);
  assert.match(resendRoute, /recordLeadEmailLog/);
  assert.match(resendRoute, /sendLeadResendEmail/);
  assert.match(deleteRoute, /softDeleteLead/);
  assert.match(resyncRoute, /resyncUnsyncedLeadsToGoogleSheet/);
});

test("order-only admin lead rows can persist sale status by creating a real lead", () => {
  const leadService = read("services/leadService.ts");
  const leadManager = read("components/admin/lead-manager.tsx");

  assert.match(leadService, /orderOnlyLeadIdPrefix/);
  assert.match(leadService, /getOrderOnlyLeadId\(order\.orderCode\)/);
  assert.match(leadService, /isOrderOnlyLeadId\(leadId\)/);
  assert.match(leadService, /createLeadFromOrderSaleStatus/);
  assert.match(leadService, /sale_status:\s*saleStatus/);
  assert.match(leadManager, /isOrderOnlyLead/);
  assert.match(leadManager, /lead\?:\s*LeadItem/);
  assert.match(leadManager, /result\.lead/);
});

test("admin lead UI exposes payment, sale, resend count, refresh and sheet resync controls", () => {
  const leadManager = read("components/admin/lead-manager.tsx");

  for (const label of ["Bank", "Sale", "Resend mail", "Thao tác", "Refresh data", "Resync Google Sheet", "Đã gửi"]) {
    assert.match(leadManager, new RegExp(label));
  }

  for (const status of ["Chưa liên hệ", "Đã liên hệ", "K nhu cầu"]) {
    assert.match(leadManager, new RegExp(status));
  }

  assert.match(leadManager, /handleRefresh/);
  assert.match(leadManager, /handleSaleStatusChange/);
  assert.match(leadManager, /handleResendEmail/);
  assert.match(leadManager, /handleDeleteLead/);
  assert.match(leadManager, /paymentStatus/);
  assert.match(leadManager, /resendEmailCount/);
});

test("schema migration documents lead status, sheet sync metadata and resend logs", () => {
  const schema = read("docs/SUPABASE_ADMIN_LEADS_FLOW.sql");

  for (const token of [
    "sale_status",
    "google_sheet_synced_at",
    "google_sheet_row_id",
    "google_sheet_sync_error",
    "lead_email_logs",
    "status in ('success', 'failed')",
  ]) {
    assert.match(schema, new RegExp(token.replace(/[()]/g, "\\$&")));
  }
});

test("admin chrome removes unused Ads/revenue surfaces and fixes the black student search button", () => {
  const shell = read("components/app/admin-shell.tsx");
  const index = read("app/admin/page.tsx");
  const studentPage = read("app/admin/hoc-vien/page.tsx");

  assert.doesNotMatch(shell, /Ads & doanh thu/);
  assert.doesNotMatch(shell, /Báo cáo ads/);
  assert.doesNotMatch(shell, /\/admin\/facebook-ads/);
  assert.doesNotMatch(shell, /doanh thu/);
  assert.doesNotMatch(index, /\/admin\/facebook-ads/);
  assert.doesNotMatch(studentPage, /bg-slate-950/);
  assert.match(studentPage, /bg-blue-600/);
});
