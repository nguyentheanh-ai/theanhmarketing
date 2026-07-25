import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public guide covers the complete customer journey without auth", () => {
  const page = read("app/huong-dan/page.tsx");
  assert.match(page, /thanh toán/i);
  assert.match(page, /Hộp thư đến|Inbox/);
  assert.match(page, /Mật khẩu/);
  assert.match(page, /Đăng nhập/);
  assert.match(page, /ebook/i);
  assert.doesNotMatch(page, /requireAuth|requireAdminAuth/);
});

test("student dashboard points support to the paid booking flow", () => {
  const dashboard = read("components/app/student-dashboard.tsx");
  assert.match(dashboard, /href="\/dat-lich-ho-tro"/);
  assert.match(dashboard, /Đặt lịch hỗ trợ/);
  assert.doesNotMatch(dashboard, /Đặt lịch hỗ trợ[^\n]*500\.000/);
  assert.doesNotMatch(dashboard, /Gửi email hỗ trợ|Liên hệ Zalo/);
});

test("external guide CTA does not reveal support pricing before booking", () => {
  const guide = read("app/huong-dan/page.tsx");
  assert.match(guide, /href="\/dat-lich-ho-tro"/);
  assert.doesNotMatch(guide, /500\.000|500k/i);
});

test("public guide hides the login CTA for an authenticated customer", () => {
  const guide = read("app/huong-dan/page.tsx");
  assert.match(guide, /getCurrentAuth/);
  assert.match(guide, /!user \? <Link href="\/dang-nhap"/);
});
