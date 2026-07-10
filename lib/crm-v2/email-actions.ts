import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { canSendMarketingEmail, getSuppressionReason } from "./suppression";
import { getEmailProvider, type EmailPayload } from "./email-provider";
import { evaluateSegmentRules } from "./segments";
import type { SegmentRules } from "./types";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export type CrmV2EmailSendResult = {
  ok: boolean;
  sent: number;
  skipped: number;
  failed: number;
  message: string;
  campaignId?: string;
  emailSendId?: string;
  providerMessageId?: string;
  details?: Array<{ contactId?: string; email?: string; status: "sent" | "skipped" | "failed"; reason?: string }>;
};

export type CrmV2AudienceContact = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  marketing_consent?: boolean | null;
  unsubscribed_at?: string | null;
  bounce_status?: string | null;
  complained_at?: string | null;
};

type CrmV2AudienceScope = {
  courseSlug?: string;
  courseName?: string;
  paymentStatus?: string;
};

export type CrmV2AudienceSummary = {
  total: number;
  sendable: number;
  suppressed: number;
  missingEmail: number;
  samples: Array<{
    contactId: string;
    email: string;
    name: string;
    status: "sendable" | "suppressed" | "missing_email";
    reason?: string;
  }>;
};

export type CrmV2MarketingEmailContentInput = {
  subject: string;
  preheader?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
  unsubscribeUrl?: string;
  advancedHtml?: string;
};

type CampaignAudienceResult = {
  ok: boolean;
  message: string;
  segmentId: string;
  ruleVersion: number;
  contactIds: string[];
  summary: CrmV2AudienceSummary;
};

type CampaignRecord = Record<string, unknown> & {
  id: string;
  segment_id?: string | null;
  template_id?: string | null;
  subject?: string | null;
  html_body?: string | null;
  text_body?: string | null;
};

const DEFAULT_UNSUBSCRIBE_URL = "https://www.theanhmarketing.com/unsubscribe";

export function assertCanRunLiveEmailAction(action: string) {
  if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
    return {
      ok: false,
      message: `${action}: thiếu RESEND_API_KEY nên không gửi email thật để tránh mock âm thầm trên production.`,
    };
  }
  return { ok: true, message: "ready" };
}

export function buildCrmV2CampaignRecipientKey(campaignId: string, contactId: string) {
  return `crm-v2:campaign:${campaignId}:contact:${contactId}`;
}

export function summarizeCrmV2Audience(contacts: CrmV2AudienceContact[]): CrmV2AudienceSummary {
  let sendable = 0;
  let suppressed = 0;
  let missingEmail = 0;
  const samples: CrmV2AudienceSummary["samples"] = [];

  for (const contact of contacts) {
    const email = String(contact.email ?? "").trim().toLowerCase();
    let status: CrmV2AudienceSummary["samples"][number]["status"] = "sendable";
    let reason: string | undefined;
    if (!email || !email.includes("@")) {
      missingEmail += 1;
      status = "missing_email";
      reason = "missing_email";
    } else {
      reason = getSuppressionReason(contact) ?? undefined;
      if (reason || !canSendMarketingEmail(contact)) {
        suppressed += 1;
        status = "suppressed";
        reason = reason ?? "suppressed";
      } else {
        sendable += 1;
      }
    }

    if (samples.length < 8) {
      samples.push({
        contactId: contact.id,
        email: email ? maskEmail(email) : "thiếu email",
        name: String(contact.full_name ?? "Chưa có tên"),
        status,
        reason,
      });
    }
  }

  return { total: contacts.length, sendable, suppressed, missingEmail, samples };
}

export function buildCrmV2MarketingEmailContent(input: CrmV2MarketingEmailContentInput) {
  const subject = input.subject.trim();
  const preheader = String(input.preheader ?? "").trim();
  const body = String(input.body ?? "").trim();
  const ctaText = String(input.ctaText ?? "").trim();
  const ctaUrl = String(input.ctaUrl ?? "").trim();
  const footer = String(input.footer ?? "Anh/chị nhận email này vì đã đăng ký nhận tư vấn từ The Anh Marketing.").trim();
  const unsubscribeUrl = String(input.unsubscribeUrl ?? DEFAULT_UNSUBSCRIBE_URL).trim();
  const advancedHtml = String(input.advancedHtml ?? "").trim();

  const paragraphHtml = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px;color:#0f172a;line-height:1.65">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
  const ctaHtml =
    ctaText && ctaUrl
      ? `<p style="margin:24px 0"><a href="${escapeAttribute(ctaUrl)}" style="display:inline-block;border-radius:8px;background:#2563eb;color:#ffffff;font-weight:700;padding:12px 18px;text-decoration:none">${escapeHtml(ctaText)}</a></p>`
      : "";
  const footerHtml = `<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0 16px" /><p style="margin:0;color:#64748b;font-size:13px;line-height:1.55">${escapeHtml(footer)} <a href="${escapeAttribute(unsubscribeUrl)}" style="color:#2563eb">Hủy nhận email</a>.</p>`;
  const html = advancedHtml
    ? `${advancedHtml}${footerHtml}`
    : `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff">${preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>` : ""}${paragraphHtml}${ctaHtml}${footerHtml}</div>`;

  const text = [
    preheader,
    body,
    ctaText && ctaUrl ? `${ctaText}: ${ctaUrl}` : "",
    footer,
    `Hủy nhận email: ${unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { subject, preheader, html, text };
}

export async function previewCrmV2CampaignAudience({
  client,
  segmentId,
  courseSlug,
  courseName,
  paymentStatus,
  limit = 5000,
}: {
  client: SupabaseAdminClient;
  segmentId: string;
  courseSlug?: string;
  courseName?: string;
  paymentStatus?: string;
  limit?: number;
}): Promise<CampaignAudienceResult> {
  const segmentRules = await getLatestSegmentRules(client, segmentId);
  if (!segmentRules.ok) {
    return { ok: false, message: segmentRules.message, segmentId, ruleVersion: 0, contactIds: [], summary: summarizeCrmV2Audience([]) };
  }

  const matchedContacts = await getSegmentMatchedContacts(client, segmentRules.rules, limit);
  const contacts = await filterAudienceContactsByOrderScope(client, matchedContacts, { courseSlug, courseName, paymentStatus });
  const summary = summarizeCrmV2Audience(contacts);
  return {
    ok: true,
    message: `Audience có ${summary.sendable} người gửi được, ${summary.suppressed} bị suppression, ${summary.missingEmail} thiếu email.`,
    segmentId,
    ruleVersion: segmentRules.version,
    contactIds: contacts.map((contact) => contact.id),
    summary,
  };
}

export async function refreshCrmV2CampaignAudience({
  client,
  segmentId,
  campaignId,
  courseSlug,
  courseName,
  paymentStatus,
  limit = 5000,
}: {
  client: SupabaseAdminClient;
  segmentId: string;
  campaignId?: string;
  courseSlug?: string;
  courseName?: string;
  paymentStatus?: string;
  limit?: number;
}): Promise<CampaignAudienceResult> {
  const preview = await previewCrmV2CampaignAudience({ client, segmentId, courseSlug, courseName, paymentStatus, limit });
  if (!preview.ok) return preview;

  const now = new Date().toISOString();
  const membershipRows = preview.contactIds.map((contactId) => ({
    segment_id: segmentId,
    contact_id: contactId,
    matched_at: now,
    metadata: { source: "crm-v2-email-refresh", rule_version: preview.ruleVersion },
  }));
  if (membershipRows.length) {
    const { error } = await client.schema("crm_v2").from("segment_memberships").upsert(membershipRows, { onConflict: "segment_id,contact_id" });
    if (error) return { ...preview, ok: false, message: error.message };
  }

  if (campaignId) {
    const { data: campaign } = await client.schema("crm_v2").from("email_campaigns").select("metadata").eq("id", campaignId).maybeSingle();
    const metadata = asRecord(campaign?.metadata);
    await client
      .schema("crm_v2")
      .from("email_campaigns")
      .update({
        metadata: {
          ...metadata,
          audience_snapshot: {
            refreshed_at: now,
            segment_id: segmentId,
            rule_version: preview.ruleVersion,
            course_slug: courseSlug ?? null,
            course_name: courseName ?? null,
            payment_status: paymentStatus ?? null,
            total: preview.summary.total,
            sendable: preview.summary.sendable,
            suppressed: preview.summary.suppressed,
            missing_email: preview.summary.missingEmail,
          },
        },
        updated_at: now,
      })
      .eq("id", campaignId);
  }

  return { ...preview, message: `Đã refresh audience: ${preview.summary.sendable} người gửi được.` };
}

export function buildCrmV2PaymentReminderEmailPayload(order: {
  order_code?: string | null;
  product_name?: string | null;
  amount?: number | string | null;
  net_amount?: number | string | null;
  currency?: string | null;
  contact?: { full_name?: string | null; email?: string | null } | null;
}): EmailPayload {
  const orderCode = String(order.order_code ?? "").trim();
  const product = String(order.product_name ?? "khóa học The Anh Marketing").trim();
  const amount = Number(order.net_amount ?? order.amount ?? 0);
  const money = new Intl.NumberFormat("vi-VN").format(Number.isFinite(amount) ? amount : 0);
  const paymentUrl = orderCode ? `https://www.theanhmarketing.com/thanh-toan/${encodeURIComponent(orderCode)}` : "https://www.theanhmarketing.com/admin";
  const name = String(order.contact?.full_name ?? "").trim();
  const subject = orderCode ? `Nhắc thanh toán đơn ${orderCode}` : "Nhắc thanh toán đơn hàng The Anh Marketing";
  const text = [
    name ? `Chào ${name},` : "Chào anh/chị,",
    `Đơn ${orderCode || "của anh/chị"} cho ${product} đang chờ thanh toán.`,
    `Số tiền: ${money}đ.`,
    `Link thanh toán: ${paymentUrl}`,
  ].join("\n");

  return {
    to: [{ email: String(order.contact?.email ?? ""), name }],
    subject,
    html: `<p>${name ? `Chào ${escapeHtml(name)},` : "Chào anh/chị,"}</p><p>Đơn <strong>${escapeHtml(orderCode || "của anh/chị")}</strong> cho <strong>${escapeHtml(product)}</strong> đang chờ thanh toán.</p><p>Số tiền: <strong>${money}đ</strong></p><p><a href="${paymentUrl}">Mở trang thanh toán</a></p>`,
    text,
    metadata: { source: "crm-v2-payment-reminder", order_code: orderCode, product_name: product },
  };
}

export async function sendCrmV2TestEmail({
  client,
  to,
  subject = "CRM v2 test email",
  html,
  text,
}: {
  client: SupabaseAdminClient;
  to: string;
  subject?: string;
  html?: string;
  text?: string;
}): Promise<CrmV2EmailSendResult> {
  const email = to.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, sent: 0, skipped: 0, failed: 1, message: "Email test không hợp lệ." };

  const idempotencyKey = `crm-v2:test:${email}:${subject}`;
  return sendAndRecordEmail({
    client,
    contactId: null,
    leadId: null,
    campaignId: null,
    templateId: null,
    providerKind: "transactional",
    idempotencyKey,
    payload: {
      to: [{ email }],
      subject,
      html: html || "<p>CRM v2 test email.</p>",
      text: text || "CRM v2 test email.",
      idempotencyKey,
      metadata: { source: "crm-v2-test-email" },
    },
  });
}

export async function sendCrmV2PaymentReminder({
  client,
  orderId,
}: {
  client: SupabaseAdminClient;
  orderId: string;
}): Promise<CrmV2EmailSendResult> {
  const order = await findOrderWithContact(client, orderId);
  if (!order) return { ok: false, sent: 0, skipped: 0, failed: 1, message: "Không tìm thấy đơn hàng CRM v2." };
  if (!order.contact?.email) return { ok: false, sent: 0, skipped: 1, failed: 0, message: "Đơn hàng thiếu email khách hàng." };

  const suppressionReason = getSuppressionReason(order.contact);
  if (suppressionReason) {
    return { ok: false, sent: 0, skipped: 1, failed: 0, message: `Email bị chặn bởi suppression: ${suppressionReason}` };
  }

  const payload = buildCrmV2PaymentReminderEmailPayload(order);
  const idempotencyKey = `crm-v2:payment-reminder:${order.id}:${order.contact.email}`;
  payload.idempotencyKey = idempotencyKey;
  return sendAndRecordEmail({
    client,
    contactId: order.contact_id ?? null,
    leadId: order.lead_id ?? null,
    campaignId: null,
    templateId: null,
    providerKind: "transactional",
    idempotencyKey,
    payload,
  });
}

export async function sendCrmV2CampaignNow({
  client,
  campaignId,
  confirmText,
  limit = 200,
}: {
  client: SupabaseAdminClient;
  campaignId: string;
  confirmText: string;
  limit?: number;
}): Promise<CrmV2EmailSendResult> {
  if (confirmText !== "GUI THAT") {
    return { ok: false, sent: 0, skipped: 0, failed: 1, message: "Gửi thật cần nhập đúng xác nhận GUI THAT." };
  }

  const campaign = await findCampaign(client, campaignId);
  if (!campaign) return { ok: false, sent: 0, skipped: 0, failed: 1, message: "Không tìm thấy campaign." };
  if (typeof campaign.segment_id !== "string" || !campaign.segment_id) {
    return { ok: false, sent: 0, skipped: 0, failed: 1, campaignId: campaign.id, message: "Campaign thiếu segment nhận. CRM v2 không gửi rộng tới toàn bộ contact." };
  }

  const audienceGuard = await ensureCampaignAudienceReady(client, campaign);
  if (!audienceGuard.ok) {
    return { ok: false, sent: 0, skipped: 0, failed: 1, campaignId: campaign.id, message: audienceGuard.message };
  }

  const contacts = await findCampaignContacts(client, campaign, limit);
  const details: NonNullable<CrmV2EmailSendResult["details"]> = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const contact of contacts) {
    if (!contact.email) {
      skipped += 1;
      details.push({ contactId: contact.id, status: "skipped", reason: "missing_email" });
      continue;
    }
    if (!canSendMarketingEmail(contact)) {
      skipped += 1;
      details.push({ contactId: contact.id, email: contact.email, status: "skipped", reason: getSuppressionReason(contact) ?? "suppressed" });
      continue;
    }

    const idempotencyKey = buildCrmV2CampaignRecipientKey(campaign.id, contact.id);
    const result = await sendAndRecordEmail({
      client,
      contactId: contact.id,
      leadId: null,
      campaignId: campaign.id,
      templateId: typeof campaign.template_id === "string" ? campaign.template_id : null,
      providerKind: "marketing",
      idempotencyKey,
      payload: {
        to: [{ email: contact.email, name: contact.full_name ?? "" }],
        subject: String(campaign.subject ?? campaign.name ?? "The Anh Marketing"),
        html: String(campaign.html_body ?? `<p>${escapeHtml(String(campaign.name ?? "CRM v2 campaign"))}</p>`),
        text: String(campaign.text_body ?? campaign.name ?? "CRM v2 campaign"),
        idempotencyKey,
        metadata: { source: "crm-v2-campaign", campaign_id: campaign.id, contact_id: contact.id },
      },
    });

    if (result.ok) sent += result.sent;
    else failed += 1;
    details.push({ contactId: contact.id, email: contact.email, status: result.ok ? "sent" : "failed", reason: result.ok ? undefined : result.message });
  }

  await client
    .schema("crm_v2")
    .from("email_campaigns")
    .update({
      status: sent > 0 ? "sent" : "draft",
      sent_at: sent > 0 ? new Date().toISOString() : null,
      metrics: { sent, skipped, failed },
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return { ok: failed === 0, sent, skipped, failed, campaignId: campaign.id, details, message: `Đã gửi ${sent}, bỏ qua ${skipped}, lỗi ${failed}.` };
}

async function sendAndRecordEmail({
  client,
  contactId,
  leadId,
  campaignId,
  templateId,
  providerKind,
  idempotencyKey,
  payload,
}: {
  client: SupabaseAdminClient;
  contactId: string | null;
  leadId: string | null;
  campaignId: string | null;
  templateId: string | null;
  providerKind: "marketing" | "transactional";
  idempotencyKey: string;
  payload: EmailPayload;
}): Promise<CrmV2EmailSendResult> {
  const existing = await client.schema("crm_v2").from("email_sends").select("id,provider_message_id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing.error) return { ok: false, sent: 0, skipped: 0, failed: 1, message: existing.error.message };
  if (existing.data?.id) {
    return {
      ok: true,
      sent: 0,
      skipped: 1,
      failed: 0,
      emailSendId: String(existing.data.id),
      providerMessageId: typeof existing.data.provider_message_id === "string" ? existing.data.provider_message_id : undefined,
      message: "Email đã có idempotency_key, không gửi trùng.",
    };
  }

  const recipient = payload.to[0]?.email ?? "";
  const providerName = process.env.RESEND_API_KEY ? "resend" : "mock";
  const now = new Date().toISOString();
  const inserted = await client
    .schema("crm_v2")
    .from("email_sends")
    .insert({
      campaign_id: campaignId,
      template_id: templateId,
      contact_id: contactId,
      provider: providerName,
      recipient_email: recipient,
      status: "queued",
      subject: payload.subject,
      idempotency_key: idempotencyKey,
      metadata: payload.metadata ?? {},
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (inserted.error || !inserted.data?.id) {
    return { ok: false, sent: 0, skipped: 0, failed: 1, message: inserted.error?.message ?? "Không tạo được email_sends." };
  }

  const provider = getEmailProvider();
  const providerResult = providerKind === "marketing" ? await provider.sendMarketingEmail(payload) : await provider.sendTransactionalEmail(payload);
  const status = providerResult.ok ? "sent" : "failed";
  const sentAt = providerResult.ok ? new Date().toISOString() : null;

  await client
    .schema("crm_v2")
    .from("email_sends")
    .update({
      status,
      provider_message_id: providerResult.id ?? null,
      sent_at: sentAt,
      metadata: { ...(payload.metadata ?? {}), provider_result: providerResult },
      updated_at: new Date().toISOString(),
    })
    .eq("id", inserted.data.id);

  await client.schema("crm_v2").from("email_events").insert({
    email_send_id: inserted.data.id,
    contact_id: contactId,
    provider: providerResult.provider,
    provider_event_id: providerResult.id ?? idempotencyKey,
    event_type: status,
    occurred_at: new Date().toISOString(),
    metadata: { idempotency_key: idempotencyKey, provider_result: providerResult },
  });

  if (contactId) {
    await client.schema("crm_v2").from("crm_events").insert({
      contact_id: contactId,
      lead_id: leadId,
      event_type: providerKind === "marketing" ? "email_marketing_sent" : "email_transactional_sent",
      event_source: "crm_v2_email",
      occurred_at: new Date().toISOString(),
      idempotency_key: `${idempotencyKey}:crm_event`,
      metadata: { email_send_id: inserted.data.id, campaign_id: campaignId, provider_message_id: providerResult.id ?? null, status },
    });
  }

  return {
    ok: providerResult.ok,
    sent: providerResult.ok ? 1 : 0,
    skipped: 0,
    failed: providerResult.ok ? 0 : 1,
    emailSendId: String(inserted.data.id),
    providerMessageId: providerResult.id,
    message: providerResult.ok ? "Email đã gửi qua provider." : providerResult.error ?? "Provider gửi email lỗi.",
  };
}

async function getLatestSegmentRules(client: SupabaseAdminClient, segmentId: string): Promise<{ ok: true; rules: SegmentRules; version: number } | { ok: false; message: string }> {
  const { data, error } = await client
    .schema("crm_v2")
    .from("segment_rules")
    .select("rules,version")
    .eq("segment_id", segmentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: "Segment chưa có rule JSON để tính audience." };
  return { ok: true, rules: normalizeSegmentRules(data.rules), version: Number(data.version ?? 1) };
}

async function getSegmentMatchedContacts(client: SupabaseAdminClient, rules: SegmentRules, limit: number): Promise<CrmV2AudienceContact[]> {
  const safeLimit = Math.max(1, Math.min(limit, 5000));
  const { data, error } = await client
    .schema("crm_v2")
    .from("leads")
    .select("contact_id,stage,status,source,lead_score,email_status,potential_value,created_at,contacts(id,full_name,email,lifecycle_stage,source,marketing_consent,bounce_status,unsubscribed_at,complained_at)")
    .not("contact_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error || !data) return [];

  const matchedByContact = new Map<string, CrmV2AudienceContact>();
  for (const row of data as Array<Record<string, unknown>>) {
    const contact = asRecord(asArray(row.contacts)[0] ?? row.contacts);
    const contactId = String(row.contact_id ?? contact.id ?? "");
    if (!contactId || matchedByContact.has(contactId)) continue;
    const subject = {
      stage: row.stage,
      status: row.status,
      source: row.source ?? contact.source,
      lead_score: Number(row.lead_score ?? 0),
      email_status: row.email_status,
      potential_value: Number(row.potential_value ?? 0),
      lifecycle_stage: contact.lifecycle_stage,
      marketing_consent: contact.marketing_consent,
      bounce_status: contact.bounce_status,
      unsubscribed_at: contact.unsubscribed_at,
      complained_at: contact.complained_at,
      tags: [],
      created_at: row.created_at,
    };
    if (!evaluateSegmentRules(rules, subject)) continue;
    matchedByContact.set(contactId, {
      id: contactId,
      full_name: typeof contact.full_name === "string" ? contact.full_name : null,
      email: typeof contact.email === "string" ? contact.email : null,
      marketing_consent: typeof contact.marketing_consent === "boolean" ? contact.marketing_consent : null,
      unsubscribed_at: typeof contact.unsubscribed_at === "string" ? contact.unsubscribed_at : null,
      bounce_status: typeof contact.bounce_status === "string" ? contact.bounce_status : null,
      complained_at: typeof contact.complained_at === "string" ? contact.complained_at : null,
    });
  }
  return Array.from(matchedByContact.values());
}

async function filterAudienceContactsByOrderScope(
  client: SupabaseAdminClient,
  contacts: CrmV2AudienceContact[],
  scope: CrmV2AudienceScope,
): Promise<CrmV2AudienceContact[]> {
  const courseSlug = String(scope.courseSlug ?? "").trim();
  const paymentStatus = String(scope.paymentStatus ?? "").trim().toLowerCase();
  if (!contacts.length || (!courseSlug && !paymentStatus)) return contacts;

  const contactIds = contacts.map((contact) => contact.id).filter(Boolean);
  if (!contactIds.length) return [];

  let query = client
    .schema("crm_v2")
    .from("orders")
    .select("contact_id,status,course_slug,metadata")
    .in("contact_id", contactIds)
    .limit(10000);
  if (courseSlug) query = query.eq("course_slug", courseSlug);

  const { data, error } = await query;
  if (error || !data) return [];

  const matchingContactIds = new Set<string>();
  for (const row of data as Array<Record<string, unknown>>) {
    const contactId = String(row.contact_id ?? "");
    if (!contactId) continue;
    const status = String(row.status ?? "").toLowerCase();
    const isPaid = isPaidOrderStatus(status);
    const matchesPayment =
      !paymentStatus ||
      (paymentStatus === "paid" && isPaid) ||
      ((paymentStatus === "pending" || paymentStatus === "new_or_pending") && !isPaid);
    if (matchesPayment) matchingContactIds.add(contactId);
  }

  return contacts.filter((contact) => matchingContactIds.has(contact.id));
}

function isPaidOrderStatus(status: string) {
  return ["paid", "success", "completed"].includes(status.toLowerCase());
}

async function ensureCampaignAudienceReady(client: SupabaseAdminClient, campaign: CampaignRecord) {
  const metadata = asRecord(campaign.metadata);
  const snapshot = asRecord(metadata.audience_snapshot);
  if (!snapshot.refreshed_at || Number(snapshot.sendable ?? 0) <= 0) {
    return { ok: false, message: "Vui lòng refresh audience trước khi gửi thật; campaign chưa có audience snapshot gửi được." };
  }
  const segmentId = typeof campaign.segment_id === "string" ? campaign.segment_id : "";
  const latest = await getLatestSegmentRules(client, segmentId);
  if (!latest.ok) return latest;
  if (Number(snapshot.rule_version ?? 0) !== latest.version) {
    return { ok: false, message: "Rule segment đã thay đổi sau lần refresh audience. Hãy refresh lại trước khi gửi." };
  }
  const scope = getCampaignAudienceScope(campaign);
  if (scope.courseSlug && snapshot.course_slug && String(snapshot.course_slug) !== scope.courseSlug) {
    return { ok: false, message: "Khóa học của audience snapshot khác cấu hình campaign. Hãy refresh lại trước khi gửi." };
  }
  if (scope.paymentStatus && snapshot.payment_status && String(snapshot.payment_status) !== scope.paymentStatus) {
    return { ok: false, message: "Trạng thái thanh toán của audience snapshot khác cấu hình campaign. Hãy refresh lại trước khi gửi." };
  }
  return { ok: true, message: "ready" };
}

async function findOrderWithContact(client: SupabaseAdminClient, orderId: string) {
  const orderResult = await client
    .schema("crm_v2")
    .from("orders")
    .select("id,contact_id,lead_id,order_code,product_name,amount,net_amount,currency,status,metadata")
    .eq("id", orderId)
    .maybeSingle();
  if (orderResult.error || !orderResult.data) return null;

  const contactId = typeof orderResult.data.contact_id === "string" ? orderResult.data.contact_id : "";
  const contactResult = contactId
    ? await client
        .schema("crm_v2")
        .from("contacts")
        .select("id,full_name,email,marketing_consent,unsubscribed_at,bounce_status,complained_at")
        .eq("id", contactId)
        .maybeSingle()
    : { data: null, error: null };

  return {
    ...orderResult.data,
    contact: contactResult.data as CrmV2AudienceContact | null,
  } as Record<string, unknown> & {
    id: string;
    contact_id?: string | null;
    lead_id?: string | null;
    order_code?: string | null;
    product_name?: string | null;
    amount?: number | string | null;
    net_amount?: number | string | null;
    currency?: string | null;
    contact: CrmV2AudienceContact | null;
  };
}

async function findCampaign(client: SupabaseAdminClient, campaignId: string): Promise<CampaignRecord | null> {
  const result = await client
    .schema("crm_v2")
    .from("email_campaigns")
    .select("id,name,segment_id,template_id,status,metadata,email_templates(subject,html_body,text_body)")
    .eq("id", campaignId)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const template = asRecord(asArray(result.data.email_templates)[0] ?? result.data.email_templates);
  return {
    ...(result.data as Record<string, unknown>),
    id: String(result.data.id),
    subject: typeof template.subject === "string" ? template.subject : null,
    html_body: typeof template.html_body === "string" ? template.html_body : null,
    text_body: typeof template.text_body === "string" ? template.text_body : null,
  };
}

async function findCampaignContacts(client: SupabaseAdminClient, campaign: Record<string, unknown>, limit: number) {
  const segmentId = typeof campaign.segment_id === "string" ? campaign.segment_id : "";
  let contactIds: string[] = [];
  if (segmentId) {
    const memberships = await client
      .schema("crm_v2")
      .from("segment_memberships")
      .select("contact_id")
      .eq("segment_id", segmentId)
      .limit(limit);
    contactIds = (memberships.data ?? []).map((row) => String(row.contact_id ?? "")).filter(Boolean);
  }

  if (!contactIds.length) return [];

  const contacts = await client
    .schema("crm_v2")
    .from("contacts")
    .select("id,full_name,email,marketing_consent,unsubscribed_at,bounce_status,complained_at")
    .in("id", contactIds)
    .limit(limit);
  const scopedContacts = ((contacts.data ?? []) as CrmV2AudienceContact[]).filter((contact) => contact.id);
  return filterAudienceContactsByOrderScope(client, scopedContacts, getCampaignAudienceScope(campaign));
}

function getCampaignAudienceScope(campaign: Record<string, unknown>): CrmV2AudienceScope {
  const metadata = asRecord(campaign.metadata);
  const nested = asRecord(metadata.audience_scope);
  const snapshot = asRecord(metadata.audience_snapshot);
  return {
    courseSlug: String(nested.course_slug ?? metadata.course_slug ?? snapshot.course_slug ?? "").trim() || undefined,
    courseName: String(nested.course_name ?? metadata.course_name ?? snapshot.course_name ?? "").trim() || undefined,
    paymentStatus: String(nested.payment_status ?? metadata.payment_status ?? snapshot.payment_status ?? "").trim() || undefined,
  };
}

function normalizeSegmentRules(value: unknown): SegmentRules {
  const record = asRecord(value);
  const combinator = record.combinator === "or" ? "or" : "and";
  const conditions = Array.isArray(record.conditions) ? record.conditions : [];
  return {
    combinator,
    conditions: conditions
      .filter((condition) => condition && typeof condition === "object")
      .map((condition) => {
        const item = condition as Record<string, unknown>;
        return {
          field: String(item.field ?? ""),
          operator: String(item.operator ?? "exists") as SegmentRules["conditions"][number]["operator"],
          value: item.value,
        };
      })
      .filter((condition) => condition.field),
  };
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 1) || "*"}***@${domain}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
