import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("payment page follows the reference checkout section structure", () => {
  const page = read("app/thanh-toan/[code]/page.tsx");

  assert.match(page, /Ưu đãi kết thúc hôm nay lúc 23:59/);
  assert.match(page, /AI Master X10/);
  assert.match(page, /6 Agent/);
  assert.match(page, /Chi Tiết Đơn Hàng/);
  assert.match(page, /Thanh Toán Ngay/);
  assert.match(page, /3 Bước/);
  assert.match(page, /Ví dụ khách đăng ký/);
  assert.doesNotMatch(page, /Kết Quả Thật Từ Học Viên/);
  assert.match(page, /Sau Khi Thanh Toán/);
  assert.match(page, /Câu Hỏi Thường Gặp/);
  assert.match(page, /Tôi Muốn Bắt Đầu Học Ngay/);
});

test("payment page keeps the existing SePay and polling integrations", () => {
  const page = read("app/thanh-toan/[code]/page.tsx");

  assert.match(page, /createSepayQrUrl/);
  assert.match(page, /getPaymentOrder/);
  assert.match(page, /PaymentStatusPoller/);
  assert.match(page, /TransferDetails/);
  assert.doesNotMatch(page, /186129999/);
  assert.doesNotMatch(page, /CONG TY TNHH TOPEXPERT/);
});

test("checkout result images are allowed by CSP", () => {
  const proxy = read("proxy.ts");

  assert.match(proxy, /https:\/\/thanhtoanai\.topexpert\.vn/);
});
