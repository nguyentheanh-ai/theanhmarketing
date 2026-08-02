import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("dashboard and account share the real owned-course snapshot", () => {
  assert.equal(existsSync("services/studentPortalService.ts"), true);
  const service = read("services/studentPortalService.ts");
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(service, /getStudentPortalSnapshot/);
  assert.match(service, /getCourseAccessSlugs/);
  assert.match(service, /getStudentLmsAccess/);
  assert.match(dashboard, /getStudentPortalSnapshot/);
});

test("authenticated navigation exposes courses and account on desktop and mobile", () => {
  const actions = read("components/site/header-auth-actions.tsx");
  const mobile = read("components/site/mobile-menu.tsx");

  assert.match(actions, /Khóa học của tôi/);
  assert.match(actions, /href="\/tai-khoan"/);
  assert.match(actions, /Đăng ký/);
  assert.match(actions, /Đăng nhập/);
  assert.match(mobile, /HeaderMobileActions/);
});

test("account page is protected and supports safe profile changes", () => {
  const page = read("app/tai-khoan/page.tsx");
  const form = read("components/account/account-profile-form.tsx");

  assert.match(page, /requireStudentAuth\("\/tai-khoan"\)/);
  assert.match(page, /ownedCourses/);
  assert.match(form, /updateUser\(\{[\s\S]*full_name[\s\S]*phone/);
  assert.match(form, /updateUser\(\{\s*email/);
  assert.match(form, /kiểm tra email mới/);
  assert.doesNotMatch(form, /[?&](email|phone|name)=/);
});

test("account page presents profile email and password as three clear inline actions", () => {
  const page = read("app/tai-khoan/page.tsx");
  const form = read("components/account/account-profile-form.tsx");

  assert.match(form, /Thông tin cá nhân/);
  assert.match(form, /Email đăng nhập/);
  assert.match(form, /Email hiện tại/);
  assert.match(form, /Email mới/);
  assert.match(form, /name="new_email"/);
  assert.match(form, /Đổi mật khẩu/);
  assert.match(form, /updatePassword/);
  assert.match(form, /updateUser\(\{[\s\S]*password/);
  assert.match(form, /showPassword/);
  assert.match(form, /aria-live="polite"/);
  assert.match(page, /Thiết lập tài khoản/);
  assert.doesNotMatch(page, /href="\/doi-mat-khau\?mode=account/);
});

test("existing password flow permits voluntary account changes", () => {
  const page = read("app/doi-mat-khau/page.tsx");
  const form = read("components/auth/change-password-form.tsx");

  assert.match(page, /mode === "account"/);
  assert.match(form, /\/tai-khoan/);
});
