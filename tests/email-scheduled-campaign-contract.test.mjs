import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("scheduled email campaigns have a protected production worker and daily cron", () => {
  const route = read("app/api/email/campaigns/send-due/route.ts");
  const service = read("lib/email/scheduled-campaign.ts");
  const vercel = read("vercel.json");

  assert.match(route, /CRON_SECRET/);
  assert.match(route, /dispatchDueEmailCampaigns/);
  assert.match(service, /public\.orders|from\("orders"\)/);
  assert.match(service, /status.*scheduled/);
  assert.match(service, /email_sends/);
  assert.match(service, /Idempotency-Key/);
  assert.match(vercel, /\/api\/email\/campaigns\/send-due/);
  assert.match(vercel, /"0 2 \* \* \*"/);
});

test("marketing email has a working unsubscribe endpoint", () => {
  const page = read("app/unsubscribe/page.tsx");
  const route = read("app/api/email/unsubscribe/route.ts");

  assert.match(page, /unsubscribe/);
  assert.match(route, /email_suppression_list/);
  assert.match(route, /verifyEmailUnsubscribeToken/);
});

test("scheduled worker fails closed unless the signed Resend measurement webhook is ready", () => {
  const worker = read("lib/email/scheduled-campaign.ts");
  const config = read("lib/email/resend-webhook-config.ts");
  const webhook = read("lib/email/resend-webhook.ts");

  assert.match(worker, /ensureResendMeasurementWebhook/);
  assert.match(config, /email\.delivered/);
  assert.match(config, /email\.opened/);
  assert.match(config, /email\.clicked/);
  assert.match(config, /email\.bounced/);
  assert.match(config, /signing_secret/);
  assert.match(webhook, /resolveResendWebhookSecret/);
  assert.match(webhook, /verifyResendWebhookRequest/);
});
