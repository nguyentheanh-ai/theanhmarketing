import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("production security check requires transactional email environment", () => {
  const source = read("scripts/verify-security-env.mjs");

  for (const key of [
    "RESEND_API_KEY",
    "NEW_LEAD_NOTIFICATION_TO",
    "REGISTRATION_NOTIFICATION_EMAIL",
    "REGISTRATION_NOTIFICATION_FROM",
    "PENDING_PAYMENT_EMAIL_FROM",
    "PAYMENT_SUCCESS_EMAIL_FROM",
  ]) {
    assert.match(source, new RegExp(`"${key}"`), `${key} should be checked`);
  }

  assert.match(source, /onboarding@resend\.dev/);
  assert.match(source, /resend\.dev/);
});

test("email defaults target the real admin address and verified-domain sender", () => {
  const registration = read("lib/notifications/registration-email.ts");
  const pending = read("lib/notifications/pending-payment-email.ts");
  const paid = read("lib/notifications/payment-success-email.ts");
  const envExample = read(".env.example");

  for (const source of [registration, pending, envExample]) {
    assert.match(source, /theanhnguyen\.marketing@gmail\.com/);
  }

  for (const source of [registration, pending, paid, envExample]) {
    assert.match(source, /noreply@theanhmarketing\.com/);
  }

  assert.doesNotMatch(envExample, /onboarding@resend\.dev/);
});

test("email senders strip invisible BOM characters from the Resend API key", () => {
  const notificationSources = [
    read("lib/notifications/registration-email.ts"),
    read("lib/notifications/pending-payment-email.ts"),
    read("lib/notifications/payment-success-email.ts"),
  ];

  for (const source of notificationSources) {
    assert.match(source, /RESEND_API_KEY\?\./);
    assert.match(source, /replace\(\s*\/\^\\uFEFF\//);
  }
});
