import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin routes share one role-aware shell and explicit sign out", () => {
  const adapter = read("components/app/admin-shell.tsx");
  const shell = read("components/crm-v2/crm-components.tsx");
  assert.match(adapter, /CrmShell adminRole/);
  assert.match(shell, /data-admin-theme="light"/);
  assert.match(shell, /SignOutButton mode="admin"/);
  assert.match(shell, /CrmMobileNav adminRole/);
});
test("course aliases cannot invoke the destructive retired editor", () => {
  const alias = read("app/admin/khoa-hoc/page.tsx");
  assert.match(alias, /redirect/);
  assert.doesNotMatch(alias, /CourseEditor/);
  assert.match(read("app/admin/crm-v2/courses/page.tsx"), /getAdminLmsSnapshot/);
  const studio = read("components/crm-v2/lms-management-client.tsx");
  for (const field of ["price", "originalPrice", "ctaText", "CourseImageInput"]) assert.ok(studio.includes(field));
  assert.match(studio, /update_course/);
  assert.doesNotMatch(studio, /from\("course_modules"\)\.delete/);
});

test("customer workspace owns contact details and order history", () => {
  const page = read("app/admin/don-hang/page.tsx");
  const customerProfile = read("app/admin/crm-v2/leads/[id]/page.tsx");

  assert.match(page, /redirect\(\"\/admin\/crm-v2\/leads\"\)/);
  assert.match(customerProfile, /id: "orders"/);
  assert.match(customerProfile, /profile\.contact\.phone/);
});

test("AI Master X10 course data has real modules for dashboard access", () => {
  const source = read("data/courses.ts");

  assert.match(source, /ai-master-x10-hieu-suat/);
  assert.match(source, /makeAiMasterModules/);
  assert.match(source, /AI Master X10 hiệu suất - Biến tri thức thành tiền/);
  assert.match(source, /Landing page và hệ thống bán hàng/);
});
