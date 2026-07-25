import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) { return fs.readFileSync(file, "utf8"); }

test("canonical CRM exposes a paid support booking admin", () => {
  const shell = read("components/crm-v2/crm-components.tsx");
  const page = read("app/admin/crm-v2/support-bookings/page.tsx");
  const client = read("components/crm-v2/support-bookings-client.tsx");

  assert.match(shell, /\/admin\/crm-v2\/support-bookings/);
  assert.match(shell, /Lịch hỗ trợ/);
  assert.match(page, /listConfirmedSupportBookings/);
  assert.match(page, /listSupportBusyDates/);
  assert.match(client, /Nội dung cần hỗ trợ/);
  assert.match(client, /500\.000đ/);
  assert.match(client, /Ngày bận/);
});

test("support booking admin mutations authenticate owner before parsing", () => {
  const route = read("app/api/admin/crm-v2/support-bookings/actions/route.ts");
  const service = read("services/supportBookingService.ts");

  assert.match(route, /getCurrentAuth\(\)/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.ok(route.indexOf("getCurrentAuth()") < route.indexOf("request.json()"));
  assert.match(route, /Cache-Control.*private, no-store/);
  assert.match(route, /setSupportBusyDate/);
  assert.match(service, /listConfirmedSupportBookings/);
  assert.match(service, /\.eq\("status", "confirmed"\)/);
  assert.match(service, /7 ngày gần nhất luôn bận/);
});
