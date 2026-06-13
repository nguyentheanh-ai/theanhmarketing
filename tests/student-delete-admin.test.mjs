import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin student table can delete a student without deleting paid orders", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  const deleteRoute = read("app/api/admin/students/delete/route.ts");
  const service = read("services/studentAccessService.ts");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(page, /StudentAccessActions/);
  assert.match(deleteRoute, /softDeleteStudent/);
  assert.match(deleteRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(deleteRoute, /invalidateAdminModules\(\["leads", "students"\]\)/);
  assert.match(deleteRoute, /30 ngày/);
  assert.match(service, /getActiveDeletedStudentKeys/);
  assert.match(service, /deletedStudentKeys/);
  assert.match(service, /records\.delete\(key\)/);
  assert.match(actions, /Xóa học viên/);
  assert.match(actions, /\/api\/admin\/students\/delete/);
  assert.match(actions, /isEditing \? \([\s\S]*Xóa học viên/);
});

test("admin deletion flow stores tombstones and purges after retention window", () => {
  const service = read("services/adminDeletionService.ts");
  const cron = read("app/api/admin/purge-deleted/route.ts");
  const vercel = read("vercel.json");
  const schema = read("docs/SUPABASE_ADMIN_SOFT_DELETE.sql");

  assert.match(service, /retentionDays = 30/);
  assert.match(service, /admin_deleted_students/);
  assert.match(service, /softDeleteLead/);
  assert.match(service, /purgeExpiredAdminDeletes/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /purgeExpiredAdminDeletes/);
  assert.match(vercel, /\/api\/admin\/purge-deleted/);
  assert.match(schema, /deleted_at/);
  assert.match(schema, /delete_after/);
  assert.match(schema, /admin_deleted_students/);
});

test("admin student view opens a detail preview modal", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  const service = read("services/studentAccessService.ts");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(page, /StudentAccessActions/);
  assert.match(service, /registeredAt/);
  assert.match(service, /progressPercent/);
  assert.match(service, /progressNote/);
  assert.match(actions, /isPreviewOpen/);
  assert.match(actions, /Chi tiết học viên/);
  assert.match(actions, /Thời gian đăng ký/);
  assert.match(actions, /Khóa đăng ký/);
  assert.match(actions, /Tiến độ học/);
  assert.match(actions, /Chưa có hoạt động học tập/);
  assert.match(actions, /setIsPreviewOpen\(true\)/);
});
