import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin shell matches the focused lead-management chrome", () => {
  const shell = read("components/app/admin-shell.tsx");

  for (const item of ["Tổng quan", "Quản lý Lead", "Khóa học", "Học viên", "Thành viên admin", "Cài đặt"]) {
    assert.match(shell, new RegExp(item));
  }

  assert.match(shell, /Admin Panel/);
  assert.match(shell, /lg:ml-\[244px\]/);
  assert.doesNotMatch(shell, /moduleSearch/);
});

test("admin navigation is centralized into focused management modules without unused ads/revenue", () => {
  const shell = read("components/app/admin-shell.tsx");
  const index = read("app/admin/page.tsx");

  for (const item of [
    "Học viên",
    "Lead",
    "Khóa học",
    "Thành viên admin",
  ]) {
    assert.match(shell, new RegExp(item));
  }

  assert.match(index, /\/admin\/dashboard/);
  assert.match(index, /\/admin\/khoa-hoc/);
  assert.doesNotMatch(shell, /Ads & doanh thu/);
  assert.doesNotMatch(shell, /Báo cáo ads/);
  assert.doesNotMatch(shell, /doanh thu/);
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
