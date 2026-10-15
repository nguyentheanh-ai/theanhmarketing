-- Candidate QA only; requires native-order-settlement and course-access schema.
-- Separate receipt: access application is not completion of account/mail/B sync.
CREATE TABLE IF NOT EXISTS d1_native_order_access_applied (
 order_code TEXT PRIMARY KEY REFERENCES d1_native_order_fulfillment(order_code),
 receipt_key TEXT NOT NULL UNIQUE REFERENCES d1_native_sepay_receipts(event_key),
 order_revision INTEGER NOT NULL CHECK(order_revision>0),
 order_snapshot TEXT NOT NULL CHECK(json_valid(order_snapshot)),
 CHECK(json_extract(order_snapshot,'$.order_code') IS order_code),
 CHECK(json_extract(order_snapshot,'$.status') IS 'paid')
);
