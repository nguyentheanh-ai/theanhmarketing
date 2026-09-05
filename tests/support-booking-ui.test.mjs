import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("paid student support booking page uses authenticated customer details", () => {
  const page = read("app/dat-lich-ho-tro/page.tsx");
  const form = read("components/support-booking/support-booking-form.tsx");

  assert.match(page, /Đặt lịch hỗ trợ/);
  assert.match(page, /SUPPORT_PRICE_LABEL/);
  assert.match(page, /30 phút/);
  assert.match(page, /getSupportAvailability/);
  assert.match(page, /requireStudentAuth/);
  assert.match(page, /getEligibleSupportCustomer/);
  assert.match(page, /customer=\{customer\}/);
  assert.match(form, /Chọn ngày/);
  assert.match(form, /Chọn giờ/);
  assert.match(form, /Vui lòng đặt lịch trước ít nhất/);
  assert.match(form, /SUPPORT_MIN_LEAD_DAYS/);
  assert.match(form, /Nội dung cần hỗ trợ/);
  assert.match(form, /\/api\/support-bookings/);
  assert.match(form, /customer\.customerName/);
  assert.doesNotMatch(form, /name="customerName"|name="email"|name="phone"/);
  assert.match(form, /window\.location\.href = payload\.checkoutUrl/);
  assert.match(form, /SUPPORT_PRICE_LABEL/);
  assert.doesNotMatch(`${page}\n${form}`, /500\.000đ/);
});

test("support booking has a public paid confirmation route", () => {
  const success = read("app/dat-lich-ho-tro/thanh-cong/page.tsx");
  assert.match(success, /Lịch hỗ trợ đã được ghi nhận/);
  assert.doesNotMatch(success, /Telegram|Hệ thống đã khóa/);
  assert.match(success, /30 phút/);
});
