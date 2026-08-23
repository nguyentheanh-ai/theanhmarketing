import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("catalog and checkout use the current Đội ngũ nhân sự AI buyer-facing identity", () => {
  const courses = read("data/courses.ts");
  const checkoutPage = read("app/thanh-toan/[code]/page.tsx");
  assert.match(courses, /title: "Đội ngũ nhân sự AI"/);
  assert.match(courses, /price: "799\.000đ"/);
  assert.match(courses, /Bộ 8 Nhân viên AI dành cho doanh nghiệp/);
  assert.match(checkoutPage, /Đội ngũ nhân sự AI/);
  assert.doesNotMatch(checkoutPage, /Bộ Agent Kit X10 hiệu suất công việc/);
  assert.doesNotMatch(checkoutPage, /990\.000đ/);
});

test("academy landing has product metadata, policy routes and linked consent", () => {
  const page = read("app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx");
  const bundle = read("app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-bundle.tsx");
  const footer = read("components/site/footer.tsx");
  const paymentPoller = read("components/payment/payment-status-poller.tsx");
  assert.match(page, /openGraph/);
  assert.match(page, /Đội ngũ nhân sự AI dành cho doanh nghiệp/);
  assert.match(page, /bo-kit-agent-doanh-nghiep/);
  assert.match(paymentPoller, /payment_page_view/);
  assert.match(bundle, /index-[A-Za-z0-9_-]+\.js/);
  for (const route of ["/chinh-sach-bao-mat", "/dieu-khoan-mua-hang", "/chinh-sach-giao-nhan-san-pham-so"]) {
    assert.match(footer, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const route of ["app/chinh-sach-bao-mat/page.tsx", "app/dieu-khoan-mua-hang/page.tsx", "app/chinh-sach-giao-nhan-san-pham-so/page.tsx"]) {
    assert.equal(existsSync(route), true, `${route} must exist`);
  }
});

test("main source contains the current landing build and no stale buyer-facing bundle", () => {
  const bundleLoader = read("app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-bundle.tsx");
  const currentBundlePath = bundleLoader.match(/bundleSource = "([^"]+)"/)?.[1];
  assert.ok(currentBundlePath);
  const bundle = read(`public${currentBundlePath}`);
  assert.match(bundle, /Đội ngũ nhân sự AI/);
  assert.match(bundle, /Đặt cọc 399\.000đ/);
  assert.doesNotMatch(bundle, /Nhận bộ 8 Nhân viên AI/);
  assert.doesNotMatch(bundle, /Bo Agent Kit X10 Hieu Suat Cong Viec/);
});
