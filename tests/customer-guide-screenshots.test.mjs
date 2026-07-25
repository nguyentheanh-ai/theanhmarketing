import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("customer guide uses captured journey screenshots", () => {
  const page = read("app/huong-dan/page.tsx");
  for (const image of ["01-thanh-toan.webp", "02-email-tai-khoan.webp", "03-tai-khoan-phong-to.webp", "04-link-vao-hoc-phong-to.webp", "03-dang-nhap.webp", "04-dashboard-khoa-hoc.webp", "05-ebook.webp"]) {
    assert.match(page, new RegExp(`/huong-dan/${image}`));
  }
  assert.match(page, /theanhmarketing\.com\/vao-khoa-hoc/);
  assert.match(page, /theo 7 bước/);
  assert.match(page, /Image/);
});

test("email screenshot preview is local-only and uses the production email builder", () => {
  const page = read("app/demo/huong-dan-email/page.tsx");
  assert.match(page, /NODE_ENV === "production"/);
  assert.match(page, /notFound\(\)/);
  assert.match(page, /buildPaymentSuccessEmailPayload/);
  assert.match(page, /MatKhauDemo2026/);
});

test("local unauthenticated dashboard demo exposes course and ebook for screenshots only", () => {
  const dashboard = read("app/dashboard/page.tsx");
  assert.match(dashboard, /isAuthGuardEnabled\(\)/);
  assert.match(dashboard, /facebook-ads-2026/);
  assert.match(dashboard, /ebook-facebook-ads-2026/);
});
