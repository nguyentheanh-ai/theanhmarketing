import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("payment page follows the agent kit checkout section structure", () => {
  const page = read("app/thanh-toan/[code]/page.tsx");

  assert.match(page, /AGENTKITDEMO/);
  assert.match(page, /Bộ Kit AI Agent Business/);
  assert.match(page, /Thông tin đơn hàng/);
  assert.doesNotMatch(page, /Thanh toán 359K để nhận Bộ AI Agent thoát việc lặp/);
  assert.match(page, /AI Agent Business/);
  assert.match(page, /Thanh toán SePay/);
  assert.match(page, /PaymentOfferCountdown/);
  assert.match(page, /Ưu đãi đang được giữ theo mã đơn/);
  assert.match(page, /Thông tin đơn hàng/);
  assert.match(page, /Thanh toán ngay - 3 bước đơn giản/);
  assert.match(page, /Quét QR hoặc chuyển khoản/);
  assert.match(page, /Sau thanh toán/);
  assert.match(page, /payment-focus-grid/);
  assert.match(page, /grid-template-columns: minmax\(320px, 420px\) minmax\(360px, 1fr\)/);
  assert.match(page, /prominent/);
  assert.match(page, /payment-after-grid/);
  assert.match(page, /payment-step-number grid size-8/);
  assert.doesNotMatch(page, /mt-5 grid gap-3 sm:grid-cols-3/);
  assert.match(page, /SePay tự đối soát/);
  assert.match(page, /qr-payment-section/);
  assert.match(page, /AI Master X10/);
  assert.match(page, /Facebook Ads Master 2026/);
  assert.match(page, /isFacebookAds2026/);
  assert.match(page, /2\.590\.000đ/);
  assert.match(page, /2\.290\.000đ/);
  assert.match(page, /399\.000đ/);
  assert.doesNotMatch(page, /Vì sao nên hoàn tất ngay/);
  assert.doesNotMatch(page, /Sale checkpoint/);
  assert.doesNotMatch(page, /Bạn nhận được/);
  assert.doesNotMatch(page, /Ưu đãi kết thúc hôm nay lúc 23:59/);
  assert.doesNotMatch(page, /Chỉ còn .* suất cuối/);
});

test("payment page keeps the existing SePay and polling integrations", () => {
  const page = read("app/thanh-toan/[code]/page.tsx");

  assert.match(page, /createSepayQrUrl/);
  assert.match(page, /getPaymentOrder/);
  assert.match(page, /PaymentStatusPoller/);
  assert.match(page, /TransferDetails/);
  assert.match(page, /getSepayConfig/);
  assert.match(page, /offerDeadline/);
  assert.doesNotMatch(page, /186129999/);
  assert.doesNotMatch(page, /CONG TY TNHH TOPEXPERT/);
});

test("payment helper components support the light checkout design while keeping copy actions", () => {
  const transferDetails = read("components/payment/transfer-details.tsx");
  const poller = read("components/payment/payment-status-poller.tsx");

  assert.match(transferDetails, /variant\?: "dark" \| "light"/);
  assert.match(transferDetails, /prominent\?: boolean/);
  assert.match(transferDetails, /gridTemplateColumns: "clamp\(54px, 14vw, 84px\) minmax\(0, 1fr\) max-content"/);
  assert.match(transferDetails, /Copy ngân hàng/);
  assert.match(transferDetails, /Copy chủ tài khoản/);
  assert.match(transferDetails, /!prominent/);
  assert.match(transferDetails, /Copy STK/);
  assert.match(transferDetails, /Copy số tiền/);
  assert.match(transferDetails, /Copy nội dung/);
  assert.match(transferDetails, /Copy tất cả/);
  assert.match(poller, /variant\?: "dark" \| "light"/);
  assert.match(poller, /checkoutTrackedRef/);
  assert.match(poller, /InitiateCheckout/);
  assert.match(poller, /Purchase/);
  assert.match(poller, /Spam/);
  assert.match(poller, /Promotions/);
  assert.match(poller, /Đang chờ chuyển khoản/);
});

test("payment offer block renders the locked discount without a hard-coded 359K", () => {
  const countdown = read("components/payment/payment-offer-countdown.tsx");

  assert.match(countdown, /Ưu đãi đã áp dụng/);
  assert.match(countdown, /Giảm từ/);
  assert.match(countdown, /originalPriceLabel/);
  assert.match(countdown, /currentPriceLabel/);
  assert.match(countdown, /Giữ đúng số tiền/);
  assert.doesNotMatch(countdown, /359K/);
  assert.match(countdown, /payment-countdown-grid/);
  assert.match(countdown, /setInterval/);
  assert.match(countdown, /formatTimeParts/);
  assert.match(countdown, /ngày/);
  assert.match(countdown, /giờ/);
  assert.match(countdown, /phút/);
  assert.match(countdown, /giây/);
  assert.match(countdown, /Mã đơn này đã khóa đúng số tiền/);
});

test("checkout result images are allowed by CSP", () => {
  const proxy = read("proxy.ts");

  assert.match(proxy, /https:\/\/thanhtoanai\.topexpert\.vn/);
});
