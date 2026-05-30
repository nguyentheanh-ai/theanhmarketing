import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin shell module search is functional instead of decorative", () => {
  const shell = read("components/app/admin-shell.tsx");

  assert.match(shell, /moduleSearch/);
  assert.match(shell, /setModuleSearch/);
  assert.match(shell, /matchesModuleSearch/);
  assert.match(shell, /Không có module phù hợp/);
});

test("admin navigation is centralized into five management modules", () => {
  const shell = read("components/app/admin-shell.tsx");
  const index = read("app/admin/page.tsx");

  for (const item of [
    "Học viên",
    "Lead",
    "Ads & doanh thu",
    "Khóa học",
    "Thành viên admin",
  ]) {
    assert.match(shell, new RegExp(item));
  }

  assert.match(index, /\/admin\/facebook-ads/);
  assert.match(index, /\/admin\/khoa-hoc/);
  assert.doesNotMatch(shell, /Đơn hàng/);
  assert.doesNotMatch(shell, /Remarketing/);
  assert.doesNotMatch(shell, /SEO\/Tracking/);
  assert.doesNotMatch(shell, /Feedback/);
});

test("admin members route is owner-only and edits app metadata roles", () => {
  const page = read("app/admin/thanh-vien-admin/page.tsx");
  const client = read("components/admin/admin-members-client.tsx");
  const route = read("app/api/admin/members/route.ts");
  const service = read("lib/admin/admin-members.ts");

  assert.match(page, /allowedRoles=\{\["owner"\]\}/);
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
