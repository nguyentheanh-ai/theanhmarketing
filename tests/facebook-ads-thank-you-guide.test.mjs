import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("Facebook Ads paid thank-you guide explains the full email-password-login journey", () => {
  const page = read("app/cam-on-thanh-toan/facebook-ads-2026/page.tsx");

  assert.match(page, /Thanh toán thành công/);
  assert.match(page, /Check mail/);
  assert.match(page, /Mở email xác nhận thanh toán/);
  assert.match(page, /Lấy mật khẩu tạm/);
  assert.match(page, /Đăng nhập/);
  assert.match(page, /Vào học/);
  assert.match(page, /Email đã mua khóa/);
  assert.match(page, /Mật khẩu tạm/);
  assert.match(page, /Spam/);
  assert.match(page, /Promotions/);
  assert.match(page, /Không tự tạo tài khoản mới/);
  assert.match(page, /\/dang-nhap\?next=%2Fdashboard/);
  assert.match(page, /\/vao-khoa-hoc/);
  assert.doesNotMatch(page, /thu-vien\/facebook-ads/i);
  assert.doesNotMatch(page, /Ebook Facebook Ads 2026/i);
});

test("Facebook Ads paid redirect still points to the dedicated thank-you guide", () => {
  const poller = read("components/payment/payment-status-poller.tsx");

  assert.match(poller, /facebookAdsThankYouPath = "\/cam-on-thanh-toan\/facebook-ads-2026"/);
  assert.match(poller, /router\.push\(getPaidRedirectPath\(order\)\)/);
  assert.doesNotMatch(poller, /router\.push\("\/dashboard"\)/);
});
