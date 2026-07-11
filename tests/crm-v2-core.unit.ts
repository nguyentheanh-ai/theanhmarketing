import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEmail, normalizePhone } from "../lib/crm-v2/normalize";
import { scoreLeadEvent } from "../lib/crm-v2/lead-scoring";
import { evaluateSegmentRules } from "../lib/crm-v2/segments";
import { evaluateWorkflowStep } from "../lib/crm-v2/workflows";
import { buildWorkflowDefinitionRecords, buildWorkflowStepRunRecords } from "../lib/crm-v2/workflow-runner";
import { canSendMarketingEmail } from "../lib/crm-v2/suppression";
import { buildCrmLeadSearchOrFilter, getCrmDateRange, normalizeCrmListQuery } from "../lib/crm-v2/query";
import {
  buildCrmV2CampaignRecipientKey,
  buildCrmV2MarketingEmailContent,
  summarizeCrmV2Audience,
} from "../lib/crm-v2/email-actions";
import { buildCrmV2OperationalEmailTemplates } from "../lib/crm-v2/operational-email-templates";
import { buildAdaptiveRevenueSeries } from "../lib/crm-v2/revenue-series";

test("dashboard revenue uses hourly buckets for today and weekly buckets for 90 days", () => {
  const rows = [
    { status: "paid", amount: 1_000_000, paid_at: "2026-07-11T01:15:00+07:00" },
    { status: "completed", amount: 2_000_000, paid_at: "2026-07-11T01:50:00+07:00" },
  ];
  const hourly = buildAdaptiveRevenueSeries(rows, { range: "today", from: "2026-07-11", to: "2026-07-11" });
  assert.equal(hourly.resolution, "hour");
  assert.equal(hourly.rows.length, 24);
  assert.equal(hourly.rows[1]?.value, 3_000_000);

  const weekly = buildAdaptiveRevenueSeries(rows, { range: "90d", from: "2026-04-13", to: "2026-07-11" });
  assert.equal(weekly.resolution, "week");
  assert.ok(weekly.rows.length >= 12 && weekly.rows.length <= 14);
});

test("normalization dedupes email and Vietnamese phone values", () => {
  assert.equal(normalizeEmail("  USER+Lead@Gmail.COM  "), "user+lead@gmail.com");
  assert.equal(normalizePhone("090 123 4567"), "+84901234567");
  assert.equal(normalizePhone("+84 90 123 4567"), "+84901234567");
});

test("lead scoring applies the first rule set without side effects", () => {
  assert.equal(scoreLeadEvent("form_submit"), 10);
  assert.equal(scoreLeadEvent("email_open"), 3);
  assert.equal(scoreLeadEvent("email_click"), 8);
  assert.equal(scoreLeadEvent("course_page_view"), 5);
  assert.equal(scoreLeadEvent("checkout_click"), 20);
  assert.equal(scoreLeadEvent("consult_call_success"), 20);
  assert.equal(scoreLeadEvent("pending_payment"), 30);
  assert.equal(scoreLeadEvent("inactive_long"), -10);
});

test("segment evaluator supports AND and OR JSON rules", () => {
  const contact = {
    lifecycle_stage: "lead",
    lead_score: 64,
    tags: ["warm", "facebook-ads"],
    source: "facebook",
  };

  assert.equal(
    evaluateSegmentRules(
      { combinator: "and", conditions: [{ field: "lead_score", operator: "gte", value: 50 }, { field: "tags", operator: "contains", value: "warm" }] },
      contact,
    ),
    true,
  );
  assert.equal(
    evaluateSegmentRules(
      { combinator: "or", conditions: [{ field: "source", operator: "eq", value: "zalo" }, { field: "tags", operator: "contains", value: "facebook-ads" }] },
      contact,
    ),
    true,
  );
});

test("workflow evaluator keeps long-running work out of browser", () => {
  assert.deepEqual(evaluateWorkflowStep({ type: "delay", config: { minutes: 30 } }), { status: "waiting", waitMs: 1_800_000 });
  assert.deepEqual(evaluateWorkflowStep({ type: "send_email", config: { templateId: "tpl_1" } }), { status: "pending", action: "enqueue_email" });
});

test("workflow evaluator recognizes all supported CRM v2 node types", () => {
  const supported = [
    ["trigger_form", "success"],
    ["trigger_event", "success"],
    ["trigger_tag", "success"],
    ["condition", "success"],
    ["split", "success"],
    ["send_email", "pending"],
    ["add_tag", "pending"],
    ["remove_tag", "pending"],
    ["update_stage", "pending"],
    ["notify_internal", "pending"],
    ["webhook", "pending"],
    ["delay", "waiting"],
    ["wait_until", "waiting"],
    ["goal", "success"],
  ] as const;

  for (const [nodeType, status] of supported) {
    assert.equal(evaluateWorkflowStep({ type: nodeType, config: { minutes: 1 } }).status, status, `${nodeType} should be supported`);
  }
});

test("workflow persistence builds normalized node and edge rows from canvas state", () => {
  const records = buildWorkflowDefinitionRecords({
    workflowVersionId: "version_1",
    nodes: [
      { id: "trigger_form", type: "trigger_form", position: { x: 10, y: 20 }, data: { label: "Trigger Form", form: "lead" } },
      { id: "send_email", type: "send_email", position: { x: 280, y: 20 }, data: { label: "Send Email", templateId: "tpl_1" } },
    ],
    edges: [{ id: "edge_trigger_email", source: "trigger_form", target: "send_email", label: "yes", data: { branch: "yes" } }],
  });

  assert.deepEqual(records.nodeRows, [
    {
      workflow_version_id: "version_1",
      node_key: "trigger_form",
      node_type: "trigger_form",
      config: { label: "Trigger Form", form: "lead" },
      position: { x: 10, y: 20 },
    },
    {
      workflow_version_id: "version_1",
      node_key: "send_email",
      node_type: "send_email",
      config: { label: "Send Email", templateId: "tpl_1" },
      position: { x: 280, y: 20 },
    },
  ]);
  assert.deepEqual(records.edgeRows, [
    {
      workflow_version_id: "version_1",
      edge_key: "edge_trigger_email",
      source_node_key: "trigger_form",
      target_node_key: "send_email",
      condition: { label: "yes", branch: "yes" },
    },
  ]);
});

test("workflow runner creates idempotent step rows without executing browser work", () => {
  const rows = buildWorkflowStepRunRecords({
    workflowRunId: "run_1",
    attempt: 2,
    now: new Date("2026-06-15T10:00:00.000Z"),
    nodes: [
      { id: "trigger_form", type: "trigger_form", config: {} },
      { id: "delay", type: "delay", config: { minutes: 15 } },
      { id: "send_email", type: "send_email", config: { templateId: "tpl_1" } },
    ],
  });

  assert.deepEqual(rows.map((row) => [row.node_key, row.status, row.idempotency_key]), [
    ["trigger_form", "success", "run_1:trigger_form:2"],
    ["delay", "waiting", "run_1:delay:2"],
    ["send_email", "pending", "run_1:send_email:2"],
  ]);
  assert.equal(rows[1].waiting_until, "2026-06-15T10:15:00.000Z");
  assert.equal(rows[2].metadata.action, "enqueue_email");
});

test("marketing suppression blocks unsafe contacts", () => {
  assert.equal(canSendMarketingEmail({ marketing_consent: true }), true);
  assert.equal(canSendMarketingEmail({ marketing_consent: false }), false);
  assert.equal(canSendMarketingEmail({ unsubscribed_at: "2026-06-01T00:00:00Z", marketing_consent: true }), false);
  assert.equal(canSendMarketingEmail({ bounce_status: "hard_bounce", marketing_consent: true }), false);
  assert.equal(canSendMarketingEmail({ complained_at: "2026-06-01T00:00:00Z", marketing_consent: true }), false);
});

test("email marketing composer renders safe HTML, text fallback, CTA, and unsubscribe footer", () => {
  const content = buildCrmV2MarketingEmailContent({
    subject: "Nhắc hoàn tất đăng ký",
    preheader: "Ưu đãi còn hiệu lực hôm nay",
    body: "Chào anh/chị,\n\nAnh/chị đang còn một bước để vào lớp.",
    ctaText: "Hoàn tất thanh toán",
    ctaUrl: "https://www.theanhmarketing.com/thanh-toan/ORD123",
    footer: "The Anh Marketing chỉ gửi email khi anh/chị đã đăng ký nhận tư vấn.",
    unsubscribeUrl: "https://www.theanhmarketing.com/unsubscribe?token=test",
  });

  assert.equal(content.subject, "Nhắc hoàn tất đăng ký");
  assert.match(content.html, /Ưu đãi còn hiệu lực hôm nay/);
  assert.match(content.html, /Hoàn tất thanh toán/);
  assert.match(content.html, /unsubscribe/);
  assert.match(content.text, /Anh\/chị đang còn một bước/);
  assert.match(content.text, /https:\/\/www\.theanhmarketing\.com\/thanh-toan\/ORD123/);
});

test("CRM v2 operational email templates cover real order/customer flows", () => {
  const templates = buildCrmV2OperationalEmailTemplates();
  const keys = templates.map((template) => template.key);

  assert.deepEqual(keys, ["registration_payment", "payment_success_access", "pending_payment_reminder"]);

  const registration = templates.find((template) => template.key === "registration_payment");
  const success = templates.find((template) => template.key === "payment_success_access");
  const reminder = templates.find((template) => template.key === "pending_payment_reminder");

  assert.ok(registration);
  assert.ok(success);
  assert.ok(reminder);
  assert.equal(registration.audience.paymentStatus, "new_or_pending");
  assert.equal(success.audience.paymentStatus, "paid");
  assert.equal(reminder.audience.paymentStatus, "pending");
  assert.equal(registration.audience.courseScope, "course_specific");
  assert.equal(success.audience.courseScope, "course_specific");
  assert.equal(reminder.audience.courseScope, "course_specific");

  for (const template of templates) {
    assert.match(template.subject, /\{\{(courseTitle|orderCode|studentName)\}\}/, `${template.key} must expose real customer/order variables`);
    assert.match(template.body, /\{\{studentName\}\}/, `${template.key} must include student name variable`);
    assert.match(template.body, /\{\{courseTitle\}\}/, `${template.key} must include course title variable`);
    assert.ok(template.body.length > 500, `${template.key} must be a complete email body, not a stub`);
    assert.doesNotMatch(template.body, /HTML thô|Lorem|TODO|placeholder/i, `${template.key} must not be a placeholder`);
  }

  assert.match(registration.body, /\{\{paymentUrl\}\}/, "registration/payment email must include payment URL");
  assert.match(success.body, /\{\{accountEmail\}\}/, "payment success email must include account email");
  assert.match(success.body, /\{\{courseAccessUrl\}\}/, "payment success email must include course access URL");
  assert.match(reminder.body, /\{\{bankAccountNumber\}\}/, "pending reminder must include transfer details");
  assert.match(reminder.body, /\{\{transferContent\}\}/, "pending reminder must include transfer content");
});

test("email audience preview classifies sendable, suppressed, and missing-email recipients", () => {
  const summary = summarizeCrmV2Audience([
    { id: "contact_1", full_name: "Ngọc Anh", email: "ngoc@example.com", marketing_consent: true },
    { id: "contact_2", full_name: "Minh", email: "minh@example.com", marketing_consent: false },
    { id: "contact_3", full_name: "Không Email", email: "", marketing_consent: true },
    { id: "contact_4", full_name: "Bounce", email: "bounce@example.com", marketing_consent: true, bounce_status: "hard_bounce" },
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.sendable, 1);
  assert.equal(summary.suppressed, 2);
  assert.equal(summary.missingEmail, 1);
  assert.equal(summary.samples[0]?.email, "n***@example.com");
  assert.equal(buildCrmV2CampaignRecipientKey("campaign_1", "contact_1"), "crm-v2:campaign:campaign_1:contact:contact_1");
});

test("CRM lead list query keeps server-side pagination and safe contact search filters", () => {
  assert.deepEqual(normalizeCrmListQuery({ page: "2", pageSize: "50", q: "  Linh, (090)  " }), {
    page: 2,
    pageSize: 50,
    search: "  Linh, (090)  ",
    sortBy: undefined,
    sortDirection: "desc",
    filters: {
      stage: undefined,
      source: undefined,
      owner: undefined,
      course: undefined,
      status: undefined,
      role: undefined,
    },
    range: "30d",
    dateFrom: undefined,
    dateTo: undefined,
  });

  assert.equal(normalizeCrmListQuery({ pageSize: "500" }).pageSize, 20);
  assert.equal(normalizeCrmListQuery({ pageSize: "10" }).pageSize, 10);
  assert.equal(normalizeCrmListQuery({ pageSize: "50" }).pageSize, 50);

  const filter = buildCrmLeadSearchOrFilter("  Linh, (090)  ", ["11111111-1111-4111-8111-111111111111"]);
  assert.match(filter, /source\.ilike\.%Linh 090%/);
  assert.match(filter, /stage\.ilike\.%Linh 090%/);
  assert.match(filter, /contact_id\.in\.\(11111111-1111-4111-8111-111111111111\)/);
  assert.doesNotMatch(filter, /Linh,/);
  assert.doesNotMatch(filter, /\(090\)/);
});

test("CRM query range builds a real server-side date window", () => {
  const query90 = normalizeCrmListQuery({ range: "90d", dateFrom: "2026-01-01", dateTo: "2026-02-02" });
  assert.equal(query90.range, "90d");
  assert.equal(query90.dateFrom, undefined);
  assert.equal(query90.dateTo, undefined);

  const custom = normalizeCrmListQuery({ range: "custom", dateFrom: "2026-06-01", dateTo: "2026-06-16" });
  assert.equal(custom.range, "custom");
  assert.equal(custom.dateFrom, "2026-06-01");
  assert.equal(custom.dateTo, "2026-06-16");

  const window = getCrmDateRange(custom, new Date("2026-06-16T12:00:00.000Z"));
  assert.equal(window.from, "2026-06-01");
  assert.equal(window.to, "2026-06-16");

  const fallback = getCrmDateRange(normalizeCrmListQuery({ range: "bad" }), new Date("2026-06-16T12:00:00.000Z"));
  assert.equal(fallback.days, 30);
  assert.equal(fallback.from, "2026-05-18");
  assert.equal(fallback.to, "2026-06-16");
});
