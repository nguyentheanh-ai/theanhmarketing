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
  const runner = new Function("exports", "module", "require", compiled);
  const requireShim = (specifier) => {
    if (specifier === "@/lib/admin/admin-emails") {
      return loadTsModule("lib/admin/admin-emails.ts");
    }

    if (specifier === "@/lib/notifications/email-link-bridge") {
      return loadTsModule("lib/notifications/email-link-bridge.ts");
    }

    throw new Error(`Unsupported test import: ${specifier}`);
  };

  runner(cjsModule.exports, cjsModule, requireShim);
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
  const paymentForm = read("components/admin/payment-link-form.tsx");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(grantRoute, /courseSlugs/);
  assert.match(grantRoute, /createManualPaidOrder\(\{\s*studentName:[\s\S]*courseSlugs/s);
  assert.match(grantRoute, /ensureStudentAccountForPaidOrder/);
  assert.match(grantRoute, /sendPaymentSuccessEmail/);
  assert.match(grantRoute, /markPaymentEmailSent/);
  assert.match(accessRoute, /courseSlugs/);
  assert.match(accessRoute, /Promise\.all|for \(const course/);
  assert.match(intakeForm, /getAll\("courseSlugs"\)/);
  assert.match(intakeForm, /type="checkbox"/);
  assert.match(intakeForm, /lg:grid-cols-4/);
  assert.match(intakeForm, /xl:grid-cols-3/);
  assert.match(paymentForm, /\/api\/admin\/payment-links/);
  assert.match(paymentForm, /Gửi form thanh toán/);
  assert.match(paymentForm, /name="paymentPlan"/);
  assert.match(actions, /type="checkbox"/);
  assert.match(actions, /checkedCourseSlugs/);
  assert.match(actions, /nativeEvent as SubmitEvent/);
  assert.match(actions, /const action = submitter\?\.value \|\| String\(formData\.get\("action"\)/);
  assert.match(actions, /action,\s*[\r\n]\s*courseSlugs: checkedCourseSlugs/);
  assert.match(actions, /const canManageAccess = Boolean\(student\.email\)/);
  assert.match(actions, /const canDeleteStudent = Boolean\(student\.email \|\| student\.phone\)/);
});

test("admin student page follows the compact student-management layout", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  const createDialog = read("components/admin/student-create-dialog.tsx");

  assert.match(page, /Tổng học viên/);
  assert.match(page, /Đã cấp quyền/);
  assert.match(page, /Đang chờ/);
  assert.match(page, /StudentCreateDialog/);
  assert.doesNotMatch(page, /StudentIntakeForm/);
  assert.doesNotMatch(page, /PaymentLinkForm/);
  assert.match(createDialog, /Thêm học viên/);
  assert.match(createDialog, /Preview trước khi lưu/);
  assert.match(createDialog, /StudentIntakeForm/);
  assert.match(createDialog, /PaymentLinkForm/);
  assert.match(createDialog, /database thật/);
  assert.match(createDialog, /email thật/);
  assert.match(page, /Danh sách học viên/);
  assert.match(page, /Tên\/liên hệ/);
  assert.match(page, /Thao tác/);
  assert.match(page, /name="q"/);
  assert.match(page, /getSearchText/);
  assert.match(page, /visibleStudents/);
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
    assert.equal(isAdminEmail("NGUYENHOAINHU2006THD@GMAIL.COM"), true);
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
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(route, /ensureStudentAccountForAccessGrant/);
  assert.match(route, /sendStudentAccessEmail/);
  assert.match(actions, /Cấp quyền/);
  assert.match(actions, /Thu quyền/);
});

test("admin payment link form creates a pending order and sends UTF-8 payment email", () => {
  const page = read("app/admin/hoc-vien/page.tsx");
  const route = read("app/api/admin/payment-links/route.ts");
  const form = read("components/admin/payment-link-form.tsx");
  const createDialog = read("components/admin/student-create-dialog.tsx");

  assert.match(page, /StudentCreateDialog/);
  assert.match(createDialog, /PaymentLinkForm/);
  assert.match(form, /\/api\/admin\/payment-links/);
  assert.match(form, /Gửi form thanh toán/);
  assert.match(route, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(route, /createPaymentOrder/);
  assert.match(route, /sendPendingPaymentEmail/);
  assert.match(route, /admin-payment-link/);
  assert.match(route, /\/thanh-toan\/\$\{encodeURIComponent\(order\.orderCode\)\}/);
});

test("student access emails include account details for grant notifications", () => {
  const emailModule = loadTsModule("lib/notifications/student-access-email.ts");
  const payload = emailModule.buildStudentAccessEmailPayload(
    {
      action: "grant",
      studentName: "Nguyen Nhu",
      email: "student@example.com",
      courseTitles: ["Quang cao Facebook Master 2026"],
    },
    {
      account: {
        email: "student@example.com",
        temporaryPassword: "Hidden123",
        created: true,
        mustChangePassword: true,
      },
    },
  );

  assert.equal(payload.to, "student@example.com");
  assert.match(payload.subject, /Đã cấp quyền học/);
  assert.match(payload.html, /Mật khẩu tạm/);
  assert.match(payload.text, /Truy cập khu vực học viên/);
  assert.match(payload.text, /https:\/\/theanhmarketing\.com\/vao-khoa-hoc/);
});

test("admin operator can issue a fresh student password email without recovery links", () => {
  const route = read("app/api/admin/students/password-reset/route.ts");
  const actions = read("components/admin/student-access-actions.tsx");

  assert.match(route, /canAccessAdminRole\(adminRole, \["owner", "editor"\]\)/);
  assert.match(route, /ensureStudentAccountForAccessGrant/);
  assert.match(route, /forcePasswordUpdate:\s*true/);
  assert.match(route, /temporaryPassword/);
  assert.match(route, /verifyStudentPasswordLogin/);
  assert.match(route, /signInWithPassword/);
  assert.match(route, /sendStudentAccessEmail/);
  assert.match(route, /getLatestPaidOrder/);
  assert.doesNotMatch(route, /generateLink/);
  assert.doesNotMatch(route, /action_link/);
  assert.doesNotMatch(route, /updateUserById[\s\S]*password/);
  assert.match(actions, /\/api\/admin\/students\/password-reset/);
  assert.match(actions, /resetStudentPassword/);
  assert.match(actions, /courseSlugs: checkedCourseSlugs/);
  assert.match(actions, /name: student\.name/);
  assert.match(actions, /phone: student\.phone/);
  assert.match(actions, /Cấp lại mật khẩu/);
});
