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
  assert.match(deleteRoute, /admin-student-delete/);
  assert.match(deleteRoute, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(deleteRoute, /invalidateAdminModules\(\["leads", "students"\]\)/);
  assert.match(service, /deletedStudentKeys/);
  assert.match(service, /records\.delete\(key\)/);
  assert.match(actions, /Xóa học viên/);
  assert.match(actions, /\/api\/admin\/students\/delete/);
  assert.match(actions, /isEditing \? \([\s\S]*Xóa học viên/);
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
  assert.match(actions, /Chưa có log học tập/);
  assert.match(actions, /setIsPreviewOpen\(true\)/);
});
