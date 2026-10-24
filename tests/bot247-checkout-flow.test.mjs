import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// Luồng mua Bot 24/7: trang thanh toán nói đúng sản phẩm phần mềm, thanh toán xong về trang Tải về (không vào khu học viên).
test("checkout page has Bot 24/7 copy instead of course access", () => {
  const page = fs.readFileSync("app/thanh-toan/[code]/page.tsx", "utf8");
  assert.match(page, /hasExactCourseSlug\(order, "bot-24-7"\)\) \{\n    return \{\n      eyebrow: "Bước cuối để nhận Bot 24\/7"/);
  assert.match(page, /productHref: "\/bot-24-7"/);
  assert.match(page, /isBot247Order \? "Chỉ còn một bước: quét QR để thanh toán, email mã kích hoạt/);
});

test("paid Bot order redirects to the download page, not the student dashboard", () => {
  const poller = fs.readFileSync("components/payment/payment-status-poller.tsx", "utf8");
  const redirect = poller.slice(poller.indexOf("function getPaidRedirectPath"), poller.indexOf('return "/dashboard"'));
  assert.match(redirect, /"bot-24-7"\)\) \{\n    return "\/bot-24-7\/tai-ve\?da-mua=1";/);
  assert.match(poller, /Email có mã kích hoạt, link bộ cài và video hướng dẫn/);
  const download = fs.readFileSync("public/academy/bot-24-7-tai-ve.html", "utf8");
  assert.match(download, /id="thanks" hidden/);
  assert.match(download, /has\("da-mua"\)\) document\.getElementById\("thanks"\)\.hidden = false/);
});

test("pending payment email labels Bot 24/7 as a product, not a course", () => {
  assert.match(fs.readFileSync("lib/notifications/pending-payment-email.ts", "utf8"), /order\.courseSlug === "bot-24-7" \? "Sản phẩm" : "Khóa học"/);
});
