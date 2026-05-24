import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin auth supports owner and editor roles from safe metadata", () => {
  const source = read("lib/auth/session.ts");

  assert.match(source, /export type AdminRole = "owner" \| "editor"/);
  assert.match(source, /app_metadata/);
  assert.match(source, /admin_role/);
  assert.doesNotMatch(source, /user_metadata\?\.[\s\S]*admin_role/);
  assert.match(source, /getAdminRole/);
  assert.match(source, /canAccessAdminRole/);
});

test("editor admin can open content pages but not sensitive operations pages", () => {
  const protectedShell = read("components/app/protected-admin-shell.tsx");
  const adminShell = read("components/app/admin-shell.tsx");

  for (const route of ["cms", "khoa-hoc", "bai-viet", "tai-lieu", "feedback"]) {
    const page = read(`app/admin/${route}/page.tsx`);
    assert.match(page, /allowedRoles=\{\["owner", "editor"\]\}/, `${route} should allow editor`);
  }

  for (const route of ["dashboard", "leads", "don-hang", "remarketing", "hoc-vien", "seo", "database"]) {
    const page = read(`app/admin/${route}/page.tsx`);
    assert.doesNotMatch(page, /allowedRoles=\{\["owner", "editor"\]\}/, `${route} should stay owner-only`);
  }

  assert.match(protectedShell, /allowedRoles/);
  assert.match(protectedShell, /adminRole/);
  assert.match(adminShell, /adminRole/);
  assert.match(adminShell, /allowedRoles/);
  assert.match(adminShell, /filter/);
});

test("editor can upload media and content settings but cannot grant student access", () => {
  const siteSettingsRoute = read("app/api/admin/site-settings/route.ts");
  const mediaRoute = read("app/api/admin/media/upload/route.ts");
  const studentGrantRoute = read("app/api/admin/students/grant/route.ts");

  assert.match(siteSettingsRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(siteSettingsRoute, /key === "marketing"/);
  assert.match(siteSettingsRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);

  assert.match(mediaRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);

  assert.match(studentGrantRoute, /adminRole/);
  assert.match(studentGrantRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.doesNotMatch(studentGrantRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
});
