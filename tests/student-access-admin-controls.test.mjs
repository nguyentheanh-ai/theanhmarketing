import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", compiled);
  runner(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

const { getCourseAccessSlugs, isAdminEmail } = loadTsModule("lib/course-access.ts");

test("admin users always receive every course slug", () => {
  const access = getCourseAccessSlugs({
    email: "theanhnguyen.marketing@gmail.com",
    isAdmin: true,
    allCourseSlugs: ["facebook-ads-2026", "ai-master-x10-hieu-suat"],
    orders: [],
    leads: [],
  });

  assert.deepEqual(access, ["facebook-ads-2026", "ai-master-x10-hieu-suat"]);
});

test("admin student access controls can update multiple courses for one student", () => {
  const grantRoute = read("app/api/admin/students/grant/route.ts");
  const accessRoute = read("app/api/admin/students/access/route.ts");
  const intakeForm = read("components/admin/student-intake-form.tsx");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(grantRoute, /courseSlugs/);
  assert.match(grantRoute, /createManualPaidOrder\(\{\s*studentName:[\s\S]*courseSlugs/s);
  assert.match(accessRoute, /courseSlugs/);
  assert.match(accessRoute, /Promise\.all|for \(const course/);
  assert.match(intakeForm, /getAll\("courseSlugs"\)/);
  assert.match(intakeForm, /type="checkbox"/);
  assert.match(actions, /type="checkbox"/);
  assert.match(actions, /checkedCourseSlugs/);
});

test("admin student page follows the compact student-management layout", () => {
  const page = read("app/admin/hoc-vien/page.tsx");

  assert.match(page, /Tổng học viên/);
  assert.match(page, /Đã cấp quyền/);
  assert.match(page, /Đang chờ/);
  assert.match(page, /Thêm học viên/);
  assert.match(page, /Danh sách học viên/);
  assert.match(page, /Tên\/liên hệ/);
  assert.match(page, /Thao tác/);
  assert.doesNotMatch(page, /Total Students|Active Access|Add New Student|Student List|Name\/Contact|>Actions</);
});

test("access overrides can grant and revoke a paid course without mutating orders", () => {
  const access = getCourseAccessSlugs({
    email: "student@example.com",
    orders: [
      {
        email: "student@example.com",
        status: "paid",
        courseSlug: "facebook-ads-2026",
        orderItems: [],
      },
    ],
    leads: [
      {
        email: "student@example.com",
        source: "admin-access-revoke:facebook-ads-2026",
        createdAt: "2026-05-25T09:00:00.000Z",
      },
      {
        email: "student@example.com",
        source: "admin-access-grant:ai-master-x10-hieu-suat",
        createdAt: "2026-05-25T09:01:00.000Z",
      },
    ],
  });

  assert.deepEqual(access, ["ai-master-x10-hieu-suat"]);
});

test("configured admin emails are recognized from ADMIN_EMAILS", () => {
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "owner@example.com, theanhnguyen.marketing@gmail.com";

  try {
    assert.equal(isAdminEmail("THEANHNGUYEN.MARKETING@GMAIL.COM"), true);
    assert.equal(isAdminEmail("student@example.com"), false);
  } finally {
    if (previous === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = previous;
    }
  }
});

test("dashboard and learning room bypass paid-order checks for admin role", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const lesson = read("app/learn/[course]/[lesson]/page.tsx");

  assert.match(dashboard, /adminRole/);
  assert.match(dashboard, /getCourseAccessSlugs/);
  assert.match(dashboard, /allCourseSlugs/);
  assert.match(lesson, /adminRole/);
  assert.match(lesson, /if \(!adminRole/);
});

test("admin student table has per-student grant and revoke controls", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  const route = read("app/api/admin/students/access/route.ts");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(page, /StudentAccessActions/);
  assert.match(route, /admin-access-grant/);
  assert.match(route, /admin-access-revoke/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner"\]\)/);
  assert.match(actions, /Cấp quyền/);
  assert.match(actions, /Thu quyền/);
});
