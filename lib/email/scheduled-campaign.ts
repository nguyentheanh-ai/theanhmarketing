import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureResendMeasurementWebhook } from "@/lib/email/resend-webhook-config";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export type CampaignAudienceOrder = {
  email?: string | null;
  student_name?: string | null;
  status?: string | null;
  course_slug?: string | null;
  created_at?: string | null;
};

type CampaignSendMetricRow = {
  sent_at?: string | null;
  delivered_at?: string | null;
  opened_at?: string | null;
  clicked_at?: string | null;
  bounced_at?: string | null;
};

type CampaignOrderMetricRow = {
  status?: string | null;
  amount?: number | string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  email?: string | null;
};

type ScheduledCampaign = {
  id: string;
  name: string;
  template_id: string;
  scheduled_at: string;
  metadata: Record<string, unknown>;
  email_templates: {
    subject?: string | null;
    html_body?: string | null;
    text_body?: string | null;
  } | Array<{
    subject?: string | null;
    html_body?: string | null;
    text_body?: string | null;
  }> | null;
};

const FACEBOOK_ADS_SLUG = "facebook-ads-2026";
const TEST_EMAIL_DOMAINS = new Set(["example.com", "theanhmarketing.test"]);
const MAX_BATCH_SIZE = 100;

export function normalizeCampaignEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidCampaignEmail(email: string) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false;
  const domain = email.split("@")[1] ?? "";
  return !TEST_EMAIL_DOMAINS.has(domain);
}

function isFacebookAdsOrder(order: CampaignAudienceOrder) {
  return String(order.course_slug ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .some((slug) => slug.includes(FACEBOOK_ADS_SLUG));
}

function isPaidStatus(status: unknown) {
  return ["paid", "success", "completed"].includes(String(status ?? "").trim().toLowerCase());
}

export function selectUnpaidFacebookAdsRecipients(
  orders: CampaignAudienceOrder[],
  suppressedEmails: Set<string>,
) {
  const byEmail = new Map<string, { email: string; name: string; latestAt: number; paid: boolean }>();
  const normalizedSuppressions = new Set(Array.from(suppressedEmails, normalizeCampaignEmail));

  for (const order of orders) {
    if (!isFacebookAdsOrder(order)) continue;
    const email = normalizeCampaignEmail(order.email);
    if (!isValidCampaignEmail(email)) continue;
    const createdAt = Date.parse(String(order.created_at ?? "")) || 0;
    const current = byEmail.get(email) ?? { email, name: "", latestAt: -1, paid: false };
    current.paid ||= isPaidStatus(order.status);
    if (createdAt >= current.latestAt) {
      current.name = String(order.student_name ?? "").trim();
      current.latestAt = createdAt;
    }
    byEmail.set(email, current);
  }

  return Array.from(byEmail.values())
    .filter((recipient) => !recipient.paid && !normalizedSuppressions.has(recipient.email))
    .map(({ email, name }) => ({ email, name }))
    .sort((left, right) => left.email.localeCompare(right.email));
}

export function buildAttributedEmailUrl(baseUrl: string, campaignKey: string, contentKey: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaignKey);
  url.searchParams.set("utm_content", contentKey);
  return url.toString();
}

export function isSafeMarketingEmailPayload(payload: { subject: string; html: string; text: string }) {
  const combined = `${payload.subject}\n${payload.html}\n${payload.text}`;
  if (!payload.subject.trim() || !payload.text.trim()) return false;
  if (!/<meta\s+charset=["']?utf-8["']?\s*\/?\s*>/i.test(payload.html)) return false;
  if (/\{\{[^}]+\}\}/.test(combined)) return false;
  if (/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(combined)) return false;
  if (/Ã|Â|â€|ðŸ|á»|áº/.test(combined)) return false;
  return true;
}

export function createEmailUnsubscribeToken(email: string, secret: string) {
  const normalized = normalizeCampaignEmail(email);
  const encoded = Buffer.from(normalized, "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyEmailUnsubscribeToken(token: string, secret: string) {
  const [encoded, signature, extra] = String(token ?? "").split(".");
  if (!encoded || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  const email = normalizeCampaignEmail(Buffer.from(encoded, "base64url").toString("utf8"));
  return isValidCampaignEmail(email) ? email : null;
}

export function summarizeEmailCampaignMetrics(
  sends: CampaignSendMetricRow[],
  orders: CampaignOrderMetricRow[],
  campaignKey: string,
  contentKey?: string,
) {
  const sent = sends.filter((row) => row.sent_at).length;
  const delivered = sends.filter((row) => row.delivered_at).length;
  const opened = sends.filter((row) => row.opened_at).length;
  const clicked = sends.filter((row) => row.clicked_at).length;
  const bounced = sends.filter((row) => row.bounced_at).length;
  const paidOrders = orders.filter(
    (order) =>
      isPaidStatus(order.status) &&
      String(order.utm_campaign ?? "") === campaignKey &&
      (!contentKey || String(order.utm_content ?? "") === contentKey),
  );
  const conversions = paidOrders.length;
  const revenue = paidOrders.reduce((total, order) => total + Number(order.amount ?? 0), 0);
  const percent = (value: number, denominator: number) =>
    denominator > 0 ? Math.round((value / denominator) * 1000) / 10 : 0;

  return {
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    conversions,
    revenue,
    openRate: percent(opened, delivered),
    clickRate: percent(clicked, delivered),
    conversionRate: percent(conversions, sent),
  };
}

export async function dispatchDueEmailCampaigns({
  now = new Date(),
  limit = 3,
}: {
  now?: Date;
  limit?: number;
} = {}) {
  const client = createSupabaseAdminClient();
  if (!client) return { ok: false, claimed: 0, sent: 0, skipped: 0, failed: 1, error: "Missing Supabase admin client" };
  if (!process.env.RESEND_API_KEY) return { ok: false, claimed: 0, sent: 0, skipped: 0, failed: 1, error: "Missing RESEND_API_KEY" };
  if (!getUnsubscribeSecret()) return { ok: false, claimed: 0, sent: 0, skipped: 0, failed: 1, error: "Missing unsubscribe secret" };
  try {
    await ensureResendMeasurementWebhook(process.env.RESEND_API_KEY);
  } catch (error) {
    return {
      ok: false,
      claimed: 0,
      sent: 0,
      skipped: 0,
      failed: 1,
      error: error instanceof Error ? `Resend webhook is not ready: ${error.message}` : "Resend webhook is not ready",
    };
  }

  const { data, error } = await client
    .schema("crm_v2")
    .from("email_campaigns")
    .select("id,name,template_id,scheduled_at,metadata,email_templates(subject,html_body,text_body)")
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 10)));
  if (error) return { ok: false, claimed: 0, sent: 0, skipped: 0, failed: 1, error: error.message };

  let claimed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const campaigns: Array<{ id: string; status: string; sent: number; skipped: number; failed: number }> = [];

  for (const candidate of (data ?? []) as ScheduledCampaign[]) {
    const claim = await client
      .schema("crm_v2")
      .from("email_campaigns")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (claim.error || !claim.data?.id) continue;
    claimed += 1;

    let result: { status: string; sent: number; skipped: number; failed: number };
    try {
      result = await dispatchClaimedCampaign(client, candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled campaign dispatch failed";
      await markCampaignFailed(client, candidate.id, message);
      result = { status: "failed", sent: 0, skipped: 0, failed: 1 };
    }
    sent += result.sent;
    skipped += result.skipped;
    failed += result.failed;
    campaigns.push({ id: candidate.id, status: result.status, sent: result.sent, skipped: result.skipped, failed: result.failed });
  }

  return { ok: failed === 0, claimed, sent, skipped, failed, campaigns };
}

async function dispatchClaimedCampaign(client: SupabaseAdminClient, campaign: ScheduledCampaign) {
  const template = Array.isArray(campaign.email_templates) ? campaign.email_templates[0] : campaign.email_templates;
  const subject = String(template?.subject ?? "").trim();
  const htmlTemplate = String(template?.html_body ?? "").trim();
  const textTemplate = String(template?.text_body ?? "").trim();
  const audienceSource = String(campaign.metadata?.audience_source ?? "");
  if (!subject || !htmlTemplate || !textTemplate || audienceSource !== "public_orders_unpaid_facebook_ads") {
    await markCampaignFailed(client, campaign.id, "Campaign template or audience source is invalid");
    return { status: "failed", sent: 0, skipped: 0, failed: 1 };
  }

  const [orders, suppressions, existing] = await Promise.all([
    fetchFacebookAdsOrders(client),
    fetchSuppressedEmails(client),
    client.schema("crm_v2").from("email_sends").select("recipient_email").eq("campaign_id", campaign.id).limit(5000),
  ]);
  const alreadyQueued = new Set((existing.data ?? []).map((row) => normalizeCampaignEmail(row.recipient_email)));
  const recipients = selectUnpaidFacebookAdsRecipients(orders, suppressions).filter((recipient) => !alreadyQueued.has(recipient.email));
  const skipped = alreadyQueued.size;
  if (!recipients.length) {
    const status = skipped > 0 ? "sent" : "skipped";
    await client.schema("crm_v2").from("email_campaigns").update({ status, sent_at: status === "sent" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", campaign.id);
    await refreshEmailCampaignMetrics(client, campaign.id);
    return { status, sent: 0, skipped, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < recipients.length; offset += MAX_BATCH_SIZE) {
    const batch = recipients.slice(offset, offset + MAX_BATCH_SIZE);
    const result = await sendRecipientBatch(client, campaign, batch, Math.floor(offset / MAX_BATCH_SIZE));
    sent += result.sent;
    failed += result.failed;
    if (result.failed > 0) break;
  }

  const status = failed > 0 ? "failed" : "sent";
  await client
    .schema("crm_v2")
    .from("email_campaigns")
    .update({
      status,
      sent_at: sent > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      metadata: {
        ...campaign.metadata,
        audience_snapshot: {
          source: audienceSource,
          refreshed_at: new Date().toISOString(),
          total: orders.length,
          sendable: recipients.length,
          suppressed: suppressions.size,
          existing_send_rows: skipped,
        },
      },
    })
    .eq("id", campaign.id);
  await refreshEmailCampaignMetrics(client, campaign.id);
  return { status, sent, skipped, failed };
}

async function sendRecipientBatch(
  client: SupabaseAdminClient,
  campaign: ScheduledCampaign,
  recipients: Array<{ email: string; name: string }>,
  batchIndex: number,
) {
  const template = Array.isArray(campaign.email_templates) ? campaign.email_templates[0] : campaign.email_templates;
  const secret = getUnsubscribeSecret();
  if (!secret) return { sent: 0, failed: recipients.length };
  const now = new Date().toISOString();
  const queuedRows = recipients.map((recipient) => {
    const recipientHash = createHash("sha256").update(recipient.email).digest("hex").slice(0, 24);
    return {
      campaign_id: campaign.id,
      template_id: campaign.template_id,
      contact_id: null,
      provider: "resend",
      recipient_email: recipient.email,
      status: "queued",
      subject: String(template?.subject ?? ""),
      idempotency_key: `crm-v2:campaign:${campaign.id}:email:${recipientHash}`,
      metadata: { source: "scheduled-email-campaign", campaign_id: campaign.id },
      created_at: now,
      updated_at: now,
    };
  });
  const messages = recipients.map((recipient) => {
    const unsubscribeUrl = buildUnsubscribeUrl(recipient.email, secret);
    const oneClickUnsubscribeUrl = unsubscribeUrl.replace("/unsubscribe?", "/api/email/unsubscribe?");
    return {
      from: process.env.RESEND_FROM_EMAIL ?? "The Anh Marketing <no-reply@theanhmarketing.com>",
      to: [recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email],
      subject: String(template?.subject ?? ""),
      html: personalizeTemplate(String(template?.html_body ?? ""), recipient.name, unsubscribeUrl),
      text: personalizeTemplate(String(template?.text_body ?? ""), recipient.name, unsubscribeUrl),
      headers: {
        "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "campaign_id", value: campaign.id },
        { name: "campaign_key", value: safeTagValue(String(campaign.metadata?.attribution_campaign ?? campaign.id)) },
      ],
    };
  });
  if (messages.some((message) => !isSafeMarketingEmailPayload({ subject: message.subject, html: message.html, text: message.text }))) {
    return { sent: 0, failed: recipients.length };
  }
  const inserted = await client.schema("crm_v2").from("email_sends").insert(queuedRows).select("*");
  if (inserted.error || !inserted.data?.length) return { sent: 0, failed: recipients.length };
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `crm-v2-campaign/${campaign.id}/batch/${batchIndex}`,
    },
    body: JSON.stringify(messages),
  });
  const payload = (await response.json().catch(() => ({}))) as { data?: Array<{ id?: string }>; message?: string; error?: { message?: string } };
  if (!response.ok || !Array.isArray(payload.data) || payload.data.length !== inserted.data.length) {
    await client
      .schema("crm_v2")
      .from("email_sends")
      .update({ status: "failed", metadata: { source: "scheduled-email-campaign", provider_error: payload.message ?? payload.error?.message ?? response.statusText }, updated_at: new Date().toISOString() })
      .in("id", inserted.data.map((row) => row.id));
    return { sent: 0, failed: recipients.length };
  }

  const sentAt = new Date().toISOString();
  const sentRows = inserted.data.map((row, index) => ({
    ...row,
    status: "sent",
    provider_message_id: payload.data?.[index]?.id ?? null,
    sent_at: sentAt,
    updated_at: sentAt,
  }));
  const update = await client.schema("crm_v2").from("email_sends").upsert(sentRows, { onConflict: "id" });
  if (update.error) return { sent: 0, failed: recipients.length };
  await client.schema("crm_v2").from("email_events").insert(
    sentRows.map((row) => ({
      email_send_id: row.id,
      contact_id: null,
      provider: "resend",
      provider_event_id: row.provider_message_id,
      event_type: "sent",
      occurred_at: sentAt,
      metadata: { campaign_id: campaign.id, idempotency_key: row.idempotency_key },
    })),
  );
  return { sent: recipients.length, failed: 0 };
}

async function fetchFacebookAdsOrders(client: SupabaseAdminClient) {
  const rows: CampaignAudienceOrder[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("orders")
      .select("email,student_name,status,course_slug,created_at")
      .ilike("course_slug", `%${FACEBOOK_ADS_SLUG}%`)
      .order("created_at", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as CampaignAudienceOrder[]));
    if (!data || data.length < 1000) return rows;
  }
}

async function fetchSuppressedEmails(client: SupabaseAdminClient) {
  const [suppressionRows, contactRows, legacyRows] = await Promise.all([
    client.schema("crm_v2").from("email_suppression_list").select("normalized_email").limit(10000),
    client.schema("crm_v2").from("contacts").select("normalized_email,unsubscribed_at,bounce_status,complained_at").limit(10000),
    client.from("email_logs").select("email,status").in("status", ["bounced", "complained"]).limit(10000),
  ]);
  const suppressionError = suppressionRows.error ?? contactRows.error ?? legacyRows.error;
  if (suppressionError) throw new Error(`Suppression lookup failed: ${suppressionError.message}`);
  const suppressed = new Set<string>();
  for (const row of suppressionRows.data ?? []) suppressed.add(normalizeCampaignEmail(row.normalized_email));
  for (const row of contactRows.data ?? []) {
    if (row.unsubscribed_at || row.complained_at || ["hard_bounce", "bounced"].includes(String(row.bounce_status ?? "").toLowerCase())) {
      suppressed.add(normalizeCampaignEmail(row.normalized_email));
    }
  }
  for (const row of legacyRows.data ?? []) suppressed.add(normalizeCampaignEmail(row.email));
  suppressed.delete("");
  return suppressed;
}

export async function refreshEmailCampaignMetrics(client: SupabaseAdminClient, campaignId: string) {
  const campaignResult = await client
    .schema("crm_v2")
    .from("email_campaigns")
    .select("id,scheduled_at,metadata")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignResult.error || !campaignResult.data) return { ok: false, error: campaignResult.error?.message ?? "Campaign not found" };
  const metadata = asRecord(campaignResult.data.metadata);
  const campaignKey = String(metadata.attribution_campaign ?? "");
  const contentKey = String(metadata.attribution_content ?? "");
  const sendsResult = await client
    .schema("crm_v2")
    .from("email_sends")
    .select("sent_at,delivered_at,opened_at,clicked_at,bounced_at")
    .eq("campaign_id", campaignId)
    .limit(10000);
  if (sendsResult.error) return { ok: false, error: sendsResult.error.message };

  let orderRows: CampaignOrderMetricRow[] = [];
  if (campaignKey) {
    let orderQuery = client.from("orders").select("status,amount,utm_campaign,utm_content,email").eq("utm_campaign", campaignKey).limit(10000);
    if (contentKey) orderQuery = orderQuery.eq("utm_content", contentKey);
    const orderResult = await orderQuery;
    if (!orderResult.error) orderRows = (orderResult.data ?? []) as CampaignOrderMetricRow[];
  }
  const metrics = summarizeEmailCampaignMetrics((sendsResult.data ?? []) as CampaignSendMetricRow[], orderRows, campaignKey, contentKey || undefined);
  const metricPayload = {
    sent: metrics.sent,
    delivered: metrics.delivered,
    opened: metrics.opened,
    clicked: metrics.clicked,
    bounced: metrics.bounced,
    conversions: metrics.conversions,
    revenue: metrics.revenue,
    open_rate: metrics.openRate,
    click_rate: metrics.clickRate,
    conversion: metrics.conversionRate,
  };
  const update = await client.schema("crm_v2").from("email_campaigns").update({ metrics: metricPayload, updated_at: new Date().toISOString() }).eq("id", campaignId);
  if (update.error) return { ok: false, error: update.error.message };
  await client.schema("crm_v2").from("crm_email_metrics").upsert(
    {
      metric_date: vietnamDateKey(String(campaignResult.data.scheduled_at ?? new Date().toISOString())),
      campaign_id: campaignId,
      sent: metrics.sent,
      opened: metrics.opened,
      clicked: metrics.clicked,
      bounced: metrics.bounced,
      complained: 0,
      unsubscribed: 0,
      revenue: metrics.revenue,
      metadata: { delivered: metrics.delivered, conversions: metrics.conversions, attribution_campaign: campaignKey, attribution_content: contentKey },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "metric_date,campaign_id" },
  );
  return { ok: true, metrics };
}

function buildUnsubscribeUrl(email: string, secret: string) {
  const token = createEmailUnsubscribeToken(email, secret);
  return `https://www.theanhmarketing.com/unsubscribe?token=${encodeURIComponent(token)}`;
}

function personalizeTemplate(template: string, name: string, unsubscribeUrl: string) {
  return template
    .replaceAll("{{first_name}}", name || "anh/chị")
    .replaceAll("{{unsubscribe_url}}", unsubscribeUrl);
}

function safeTagValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 256) || "email-campaign";
}

function getUnsubscribeSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || "";
}

function vietnamDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function markCampaignFailed(client: SupabaseAdminClient, campaignId: string, error: string) {
  const { data } = await client.schema("crm_v2").from("email_campaigns").select("metadata").eq("id", campaignId).maybeSingle();
  await client.schema("crm_v2").from("email_campaigns").update({ status: "failed", metadata: { ...asRecord(data?.metadata), dispatch_error: error }, updated_at: new Date().toISOString() }).eq("id", campaignId);
}
