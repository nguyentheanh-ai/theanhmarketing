import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("paid student support booking page uses authenticated customer details", () => {
  const page = read("app/dat-lich-ho-tro/page.tsx");
  const form = read("components/support-booking/support-booking-form.tsx");

  assert.match(page, /Đặt lịch cùng Thế Anh/);
  assert.match(page, /Hỗ trợ học viên/);
  assert.match(page, /30 phút/);
  assert.match(page, /getSupportAvailability/);
  assert.doesNotMatch(page, /requireStudentAuth/);
  assert.match(page, /getEligibleSupportCustomer/);
  assert.match(page, /customer=\{customer\}/);
  assert.match(form, /Chọn ngày/);
  assert.match(form, /Chọn giờ/);
  assert.match(form, /Vui lòng đặt lịch trước ít nhất/);
  assert.match(form, /SUPPORT_MIN_LEAD_DAYS/);
  assert.match(form, /Nội dung cần hỗ trợ/);
  assert.match(form, /\/api\/support-bookings/);
  assert.match(form, /customer\.customerName/);
  assert.match(form, /name="customerName"/);
  assert.match(form, /name="email"/);
  assert.match(form, /name="phone"/);
  assert.match(form, /window\.location\.href = payload\.checkoutUrl/);
  assert.match(form, /getSupportBookingQuote/);
  assert.match(page, /30 phút · 1\.000\.000đ/);
  assert.match(page, /Thêm 30 phút: 500\.000đ/);
});

test("support booking has a public paid confirmation route", () => {
  const success = read("app/dat-lich-ho-tro/thanh-cong/page.tsx");
  assert.match(success, /Lịch hỗ trợ đã được ghi nhận/);
  assert.doesNotMatch(success, /Telegram|Hệ thống đã khóa/);
  assert.match(success, /thời lượng bạn đã chọn/);
});
