import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  buildAttributedEmailUrl,
  isSafeMarketingEmailPayload,
  createEmailUnsubscribeToken,
  selectRetryableCampaignRecipients,
  summarizeEmailCampaignMetrics,
  selectUnpaidFacebookAdsRecipients,
  verifyEmailUnsubscribeToken,
} from "../lib/email/scheduled-campaign";
import { verifyResendWebhookRequest } from "../lib/email/resend-webhook";
import { ensureResendMeasurementWebhook } from "../lib/email/resend-webhook-config";

test("unpaid Facebook Ads audience excludes paid customers, tests, duplicates, and suppressions", () => {
  const recipients = selectUnpaidFacebookAdsRecipients(
    [
      { email: " Buyer@Example.vn ", student_name: "Cũ", status: "expired", course_slug: "facebook-ads-2026", created_at: "2026-08-20T00:00:00Z" },
      { email: "buyer@example.vn", student_name: "Mới", status: "pending", course_slug: "ebook-facebook-ads-2026", created_at: "2026-08-25T00:00:00Z" },
      { email: "paid@example.vn", student_name: "Đã mua", status: "pending", course_slug: "facebook-ads-2026", created_at: "2026-08-20T00:00:00Z" },
      { email: "paid@example.vn", student_name: "Đã mua", status: "paid", course_slug: "facebook-ads-2026", created_at: "2026-08-21T00:00:00Z" },
      { email: "blocked@example.vn", student_name: "Chặn", status: "pending", course_slug: "facebook-ads-2026", created_at: "2026-08-22T00:00:00Z" },
      { email: "qa@example.com", student_name: "QA", status: "pending", course_slug: "facebook-ads-2026", created_at: "2026-08-22T00:00:00Z" },
      { email: "other@example.vn", student_name: "Khác", status: "pending", course_slug: "ai-master-x10-hieu-suat", created_at: "2026-08-22T00:00:00Z" },
    ],
    new Set(["blocked@example.vn"]),
  );

  assert.deepEqual(recipients, [{ email: "buyer@example.vn", name: "Mới" }]);
});

test("partial campaign retry sends only failed recipients and preserves their send rows", () => {
  const result = selectRetryableCampaignRecipients(
    [
      { email: "sent@example.vn", name: "Đã gửi" },
      { email: "failed@example.vn", name: "Gửi lại" },
      { email: "new@example.vn", name: "Mới" },
    ],
    [
      { id: "send_sent", recipient_email: "sent@example.vn", status: "delivered" },
      { id: "send_failed", recipient_email: "failed@example.vn", status: "failed" },
    ],
  );

  assert.equal(result.skipped, 1);
  assert.deepEqual(result.recipients, [
    { email: "failed@example.vn", name: "Gửi lại", retrySendId: "send_failed" },
    { email: "new@example.vn", name: "Mới" },
  ]);
});

test("campaign metrics separate provider delivery from opens, clicks, and paid orders", () => {
  const metrics = summarizeEmailCampaignMetrics(
    [
      { sent_at: "2026-08-27T02:00:00Z", delivered_at: "2026-08-27T02:01:00Z", opened_at: "2026-08-27T02:02:00Z", clicked_at: "2026-08-27T02:03:00Z", bounced_at: null },
      { sent_at: "2026-08-27T02:00:00Z", delivered_at: "2026-08-27T02:01:00Z", opened_at: null, clicked_at: null, bounced_at: null },
      { sent_at: "2026-08-27T02:00:00Z", delivered_at: null, opened_at: null, clicked_at: null, bounced_at: "2026-08-27T02:01:00Z" },
    ],
    [
      { status: "paid", amount: 878_400, utm_campaign: "vietnam-thai-lan-combo-202608", email: "buyer@example.vn" },
      { status: "pending", amount: 878_400, utm_campaign: "vietnam-thai-lan-combo-202608", email: "pending@example.vn" },
      { status: "paid", amount: 799_000, utm_campaign: "other", email: "other@example.vn" },
    ],
    "vietnam-thai-lan-combo-202608",
  );

  assert.deepEqual(metrics, {
    sent: 3,
    delivered: 2,
    opened: 1,
    clicked: 1,
    bounced: 1,
    conversions: 1,
    revenue: 878_400,
    openRate: 50,
    clickRate: 50,
    conversionRate: 33.3,
  });
});

test("email CTA carries campaign and message attribution into the order flow", () => {
  const url = new URL(
    buildAttributedEmailUrl(
      "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
      "vietnam-thai-lan-combo-202608",
      "email-29-08",
    ),
  );

  assert.equal(url.searchParams.get("utm_source"), "email");
  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_campaign"), "vietnam-thai-lan-combo-202608");
  assert.equal(url.searchParams.get("utm_content"), "email-29-08");
});

test("unsubscribe token is bound to the normalized recipient email", () => {
  const token = createEmailUnsubscribeToken(" Buyer@Example.vn ", "test-secret");

  assert.equal(verifyEmailUnsubscribeToken(token, "test-secret"), "buyer@example.vn");
  assert.equal(verifyEmailUnsubscribeToken(`${token}tampered`, "test-secret"), null);
  assert.equal(verifyEmailUnsubscribeToken(token, "wrong-secret"), null);
});

test("Resend webhook verification uses the raw payload and Svix headers", () => {
  const payload = JSON.stringify({ type: "email.clicked", data: { email_id: "email_123" } });
  const id = "msg_123";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawSecret = Buffer.from("webhook-test-secret").toString("base64");
  const secret = `whsec_${rawSecret}`;
  const signature = createHmac("sha256", Buffer.from(rawSecret, "base64"))
    .update(`${id}.${timestamp}.${payload}`)
    .digest("base64");

  assert.equal(
    verifyResendWebhookRequest(payload, { id, timestamp, signature: `v1,${signature}` }, secret),
    true,
  );
  assert.equal(
    verifyResendWebhookRequest(`${payload} `, { id, timestamp, signature: `v1,${signature}` }, secret),
    false,
  );
});

test("marketing payload blocks placeholders, mojibake, localhost, and missing UTF-8", () => {
  assert.equal(isSafeMarketingEmailPayload({ subject: "Ưu đãi", html: '<meta charset="UTF-8"><a href="https://www.theanhmarketing.com">CTA</a>', text: "Ưu đãi" }), true);
  assert.equal(isSafeMarketingEmailPayload({ subject: "ƯU ĐÃI", html: '<meta charset="UTF-8"><p>NHẬN ƯU ĐÃI NGAY</p>', text: "NHẬN ƯU ĐÃI NGAY" }), true);
  assert.equal(isSafeMarketingEmailPayload({ subject: "Ưu đãi", html: '<meta charset="UTF-8">{{name}}', text: "Ưu đãi" }), false);
  assert.equal(isSafeMarketingEmailPayload({ subject: "Ưu đãi", html: '<meta charset="UTF-8"><a href="http://localhost:3000">CTA</a>', text: "Ưu đãi" }), false);
  assert.equal(isSafeMarketingEmailPayload({ subject: "Ưu đãi", html: "<p>Ưu đãi</p>", text: "Ưu đãi" }), false);
  assert.equal(isSafeMarketingEmailPayload({ subject: "Viá»‡t Nam", html: '<meta charset="UTF-8">', text: "Viá»‡t Nam" }), false);
});

test("existing Resend webhook is retrieved before requiring its signing secret", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.endsWith("/webhooks?limit=100")) {
      return Response.json({
        data: [{
          id: "webhook_123",
          endpoint: "https://www.theanhmarketing.com/api/resend/webhook",
          status: "enabled",
          events: ["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "email.failed", "email.suppressed"],
        }],
      });
    }
    if (url.endsWith("/webhooks/webhook_123")) {
      return Response.json({
        id: "webhook_123",
        endpoint: "https://www.theanhmarketing.com/api/resend/webhook",
        status: "enabled",
        signing_secret: "whsec_test",
      });
    }
    return Response.json({ message: "Unexpected request" }, { status: 500 });
  };

  try {
    const result = await ensureResendMeasurementWebhook("re_test");
    assert.equal(result.verified, true);
    assert.ok(requestedUrls.some((url) => url.endsWith("/webhooks/webhook_123")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
