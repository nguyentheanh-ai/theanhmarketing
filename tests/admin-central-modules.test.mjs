import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin shell matches the focused solo command center chrome", () => {
  const shell = read("components/crm-v2/crm-components.tsx");
  for (const route of ["/admin/crm-v2/customers", "/admin/crm-v2/courses", "/admin/crm-v2/support-bookings", "/admin/crm-v2/reports", "/admin/crm-v2/settings", "/admin/viec-can-xu-ly"]) assert.ok(shell.includes(route));
  assert.match(read("components/app/admin-shell.tsx"), /<CrmShell/);
  assert.doesNotMatch(read("components/app/admin-shell.tsx"), /<aside/);
  assert.match(shell, /visibleNav/);

});

test("admin navigation is centralized into focused management modules without unused ads/revenue", () => {
  const shell = read("components/crm-v2/crm-components.tsx");
  for (const route of ["/admin/crm-v2/customers", "/admin/crm-v2/courses", "/admin/crm-v2/support-bookings", "/admin/crm-v2/reports", "/admin/crm-v2/settings", "/admin/viec-can-xu-ly"]) assert.ok(shell.includes(route));
  assert.match(read("components/app/admin-shell.tsx"), /<CrmShell/);
  assert.doesNotMatch(read("components/app/admin-shell.tsx"), /<aside/);
  assert.match(shell, /visibleNav/);
  assert.match(read("app/admin/page.tsx"), /crm-v2\/courses/);
});

test("admin members route is owner-only and edits app metadata roles", () => {
  const page = read("app/admin/thanh-vien-admin/page.tsx");
  const client = read("components/admin/admin-members-client.tsx");
  const route = read("app/api/admin/members/route.ts");
  const service = read("lib/admin/admin-members.ts");

  assert.match(page, /requireAdminAuth\("\/admin\/thanh-vien-admin", \["owner"\]\)/);
  assert.match(read("app/admin/crm-v2/team/page.tsx"), /AdminMembersClient/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(service, /app_metadata/);
  assert.match(service, /admin_role/);
  assert.match(service, /ADMIN_EMAILS/);
  assert.match(client, /Quản lý thành viên admin/);
  assert.match(client, /Gỡ quyền/);
});

test("admin members screen optimizes loading, filtering and row-level actions", () => {
  const client = read("components/admin/admin-members-client.tsx");

  assert.match(client, /AbortController/);
  assert.match(client, /filteredMembers/);
  assert.match(client, /roleFilter/);
  assert.match(client, /optimisticUpdateRole/);
  assert.match(client, /lastLoadedAt/);
  assert.match(client, /Đang lưu/);
  assert.match(client, /Tìm email hoặc tên/);
});

test("admin members API caches list reads and bypasses cache on manual refresh", () => {
  const route = read("app/api/admin/members/route.ts");
  const service = read("lib/admin/admin-members.ts");

  assert.match(route, /force_refresh/);
  assert.match(route, /forceRefresh/);
  assert.match(service, /ADMIN_MEMBERS_CACHE_TTL_MS/);
  assert.match(service, /adminMembersCache/);
  assert.match(service, /clearAdminMembersCache/);
});
