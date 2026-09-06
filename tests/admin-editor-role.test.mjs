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
  for (const route of ["cms", "bai-viet", "tai-lieu", "feedback"]) assert.match(read(`app/admin/${route}/page.tsx`), /allowedRoles=\{\["owner", "editor"\]\}/);
  for (const route of ["courses", "students"]) assert.match(read(`app/admin/crm-v2/${route}/page.tsx`), /requireAdminAuth\([^;]+\["owner", "editor"\]/);
  for (const route of ["reports", "leads", "team", "email", "automation"]) assert.match(read(`app/admin/crm-v2/${route}/page.tsx`), /requireAdminAuth\([^;]+\["owner"\]/);
  assert.match(read("components/app/admin-shell.tsx"), /CrmShell adminRole/);
});

test("editor can upload media and operate student accounts without owner-only deletion", () => {
  const siteSettingsRoute = read("app/api/admin/site-settings/route.ts");
  const mediaRoute = read("app/api/admin/media/upload/route.ts");
  const studentGrantRoute = read("app/api/admin/students/grant/route.ts");
  const studentAccessRoute = read("app/api/admin/students/access/route.ts");
  const studentPasswordRoute = read("app/api/admin/students/password-reset/route.ts");
  const paymentLinksRoute = read("app/api/admin/payment-links/route.ts");
  const studentDeleteRoute = read("app/api/admin/students/delete/route.ts");

  assert.match(siteSettingsRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(siteSettingsRoute, /key === "marketing"/);
  assert.match(siteSettingsRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);

  assert.match(mediaRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);

  assert.match(studentGrantRoute, /adminRole/);
  assert.match(studentGrantRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(studentAccessRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(studentPasswordRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(paymentLinksRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(studentDeleteRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.doesNotMatch(studentDeleteRoute, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
});
