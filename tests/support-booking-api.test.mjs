import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("support booking service reserves a slot and creates the fixed-price order", () => {
  const constants = read("lib/support-booking/constants.ts");
  const service = read("services/supportBookingService.ts");
  const orders = read("services/orderService.ts");

  assert.match(service, /validateSupportBookingInput\(input, now\)/);
  assert.match(service, /\.rpc\("reserve_support_booking"/);
  assert.match(service, /createSupportPaymentOrder/);
  assert.match(service, /status: "cancelled"/);
  assert.match(service, /SUPPORTDEMO/);
  assert.match(orders, /export async function createSupportPaymentOrder/);
  assert.match(orders, /course_slug: SUPPORT_PRODUCT_SLUG/);
  assert.match(orders, /amount: SUPPORT_PRICE_VND/);
  assert.match(orders, /expires_at: input\.expiresAt/);
  assert.match(constants, /SUPPORT_PRICE_VND = 1_000_000/);
  assert.match(constants, /SUPPORT_PRICE_LABEL = "1\.000\.000đ"/);
});

test("support booking price migration preserves old rows and prices new bookings at 1.000.000đ", () => {
  const migration = read("supabase/migrations/20260816152642_support_booking_price_1m.sql");

  assert.match(migration, /alter column amount set default 1000000/i);
  assert.match(migration, /check \(amount in \(500000, 1000000\)\)/i);
});

test("public support booking APIs are bounded, no-store, and return conflict safely", () => {
  const availability = read("app/api/support-bookings/availability/route.ts");
  const create = read("app/api/support-bookings/route.ts");

  assert.match(availability, /getSupportAvailability/);
  assert.match(availability, /Cache-Control.*no-store/);
  assert.match(availability, /checkRateLimit/);
  assert.match(create, /reserveSupportBooking/);
  assert.match(create, /getCurrentAuth/);
  assert.match(create, /getEligibleSupportCustomer/);
  assert.match(create, /status: 401/);
  assert.match(create, /status: 403/);
  assert.match(create, /customerName: customer\.customerName/);
  assert.match(create, /email: customer\.email/);
  assert.match(create, /phone: customer\.phone/);
  assert.match(create, /await request\.json\(\)/);
  assert.match(create, /SupportBookingConflictError/);
  assert.match(create, /status: 409/);
  assert.match(create, /Cache-Control.*no-store/);
  assert.doesNotMatch(create, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("support booking eligibility comes from a paid course order and excludes support orders", () => {
  const service = read("services/supportBookingService.ts");
  assert.match(service, /getEligibleSupportCustomer/);
  assert.match(service, /order\.status === "paid"/);
  assert.match(service, /SUPPORT_PRODUCT_SLUG/);
  assert.match(service, /getPaymentOrders/);
});
