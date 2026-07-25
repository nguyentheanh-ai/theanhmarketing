import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("support booking service reserves a slot and creates the fixed-price order", () => {
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
});

test("public support booking APIs are bounded, no-store, and return conflict safely", () => {
  const availability = read("app/api/support-bookings/availability/route.ts");
  const create = read("app/api/support-bookings/route.ts");

  assert.match(availability, /getSupportAvailability/);
  assert.match(availability, /Cache-Control.*no-store/);
  assert.match(availability, /checkRateLimit/);
  assert.match(create, /reserveSupportBooking/);
  assert.match(create, /await request\.json\(\)/);
  assert.match(create, /SupportBookingConflictError/);
  assert.match(create, /status: 409/);
  assert.match(create, /Cache-Control.*no-store/);
  assert.doesNotMatch(create, /SUPABASE_SERVICE_ROLE_KEY/);
});
