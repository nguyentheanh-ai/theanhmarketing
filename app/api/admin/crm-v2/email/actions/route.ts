import { NextResponse } from "next/server";

import {
  assertCanRunLiveEmailAction,
  buildCrmV2MarketingEmailContent,
  previewCrmV2CampaignAudience,
  refreshCrmV2CampaignAudience,
  sendCrmV2CampaignNow,
  sendCrmV2TestEmail,
} from "@/lib/crm-v2/email-actions";
import { getCrmV2MissingLiveConfigMessage, shouldUseCrmV2DemoData } from "@/lib/crm-v2/feature-flag";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCrmV2OwnerRequest } from "../../_shared";

const emailActionValues = new Set([
  "save_draft",
  "create_campaign",
  "preview_audience",
  "refresh_audience",
  "send_test_email",
  "schedule_campaign",
  "schedule_broadcast",
  "send_campaign_now",
  "cancel_schedule",
]);
const liveEmailEnvName = "RESEND_API_KEY";
const audienceMembershipTable = "segment_memberships";
const audienceSnapshotMetadataKey = "audience_snapshot";
void audienceMembershipTable;
void audienceSnapshotMetadataKey;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(request: Request) {
  const blocked = await requireCrmV2OwnerRequest(request, "admin:crm-v2:email:actions");
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rawAction = typeof body?.action === "string" ? body.action.trim() : "";
  if (!emailActionValues.has(rawAction)) {
    return NextResponse.json({ ok: false, message: "Email action không hợp lệ." }, { status: 400 });
  }
  const action = rawAction === "create_campaign" ? "save_draft" : rawAction === "schedule_broadcast" ? "schedule_campaign" : rawAction;

  const client = createSupabaseAdminClient();
  if (shouldUseCrmV2DemoData()) {
    return NextResponse.json({
      ok: true,
      action,
      mocked: true,
      campaign: action === "save_draft" ? { id: "00000000-0000-4000-8000-000000000001", status: "draft" } : undefined,
      audience:
        action === "preview_audience" || action === "refresh_audience"
          ? { total: 0, sendable: 0, suppressed: 0, missingEmail: 0, samples: [] }
          : undefined,
      message: `${action}: thiếu live CRM v2 schema/env, email action chạy mock mode an toàn.`,
    });
  }
  if (!client) return NextResponse.json({ ok: false, message: getCrmV2MissingLiveConfigMessage("email_action") }, { status: 503 });

  if (action === "send_test_email" || action === "send_campaign_now" || action === "schedule_campaign") {
    void liveEmailEnvName;
    const liveEmailConfig = assertCanRunLiveEmailAction(action);
    if (!liveEmailConfig.ok) {
      return NextResponse.json({ ok: false, message: liveEmailConfig.message }, { status: 503 });
    }
  }

  if (action === "save_draft") {
    const result = await saveCampaignDraft(client, body ?? {});
    return NextResponse.json({ ...result, action }, { status: result.ok ? 200 : 400 });
  }

  if (action === "preview_audience") {
    const segmentId = stringField(body, "segmentId");
    const courseSlug = stringField(body, "courseSlug") || stringField(body, "courseId");
    const courseName = stringField(body, "courseName") || stringField(body, "courseLabel");
    const paymentStatus = stringField(body, "paymentStatus");
    if (!isUuid(segmentId)) return NextResponse.json({ ok: false, message: "Vui lòng chọn phân khúc nhận email trước khi xem audience." }, { status: 400 });
    if (!courseSlug) return NextResponse.json({ ok: false, message: "Vui lòng chọn khóa học cụ thể trước khi xem audience." }, { status: 400 });
    const preview = await previewCrmV2CampaignAudience({ client, segmentId, courseSlug, courseName, paymentStatus });
    return NextResponse.json({ ok: preview.ok, action, audience: preview.summary, ruleVersion: preview.ruleVersion, message: preview.message }, { status: preview.ok ? 200 : 400 });
  }

  if (action === "refresh_audience") {
    const segmentId = stringField(body, "segmentId");
    const campaignId = stringField(body, "campaignId");
    const courseSlug = stringField(body, "courseSlug") || stringField(body, "courseId");
    const courseName = stringField(body, "courseName") || stringField(body, "courseLabel");
    const paymentStatus = stringField(body, "paymentStatus");
    if (!isUuid(segmentId)) return NextResponse.json({ ok: false, message: "Vui lòng chọn phân khúc nhận email trước khi refresh audience." }, { status: 400 });
    if (!courseSlug) return NextResponse.json({ ok: false, message: "Vui lòng chọn khóa học cụ thể trước khi refresh audience." }, { status: 400 });
    const refresh = await refreshCrmV2CampaignAudience({ client, segmentId, campaignId: isUuid(campaignId) ? campaignId : undefined, courseSlug, courseName, paymentStatus });
    return NextResponse.json({ ok: refresh.ok, action, audience: refresh.summary, ruleVersion: refresh.ruleVersion, message: refresh.message }, { status: refresh.ok ? 200 : 400 });
  }

  if (action === "send_test_email") {
    const content = buildCrmV2MarketingEmailContent(readComposerBody(body ?? {}));
    const to = stringField(body, "to") || process.env.ADMIN_LOGIN_EMAIL || process.env.REGISTRATION_NOTIFICATION_TO || "";
    const result = await sendCrmV2TestEmail({ client, to, subject: content.subject, html: content.html, text: content.text });
    return NextResponse.json({ ...result, action });
  }

  const campaignId = stringField(body, "campaignId");
  if (!isUuid(campaignId)) return NextResponse.json({ ok: false, message: "campaignId không hợp lệ." }, { status: 400 });

  if (action === "send_campaign_now") {
    const confirmText = stringField(body, "confirmText");
    const result = await sendCrmV2CampaignNow({ client, campaignId, confirmText });
    return NextResponse.json({ ...result, action }, { status: result.ok ? 200 : 400 });
  }

  if (action === "cancel_schedule") {
    const { data, error } = await client
      .schema("crm_v2")
      .from("email_campaigns")
      .update({ status: "draft", scheduled_at: null, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .select("id,name,status,scheduled_at")
      .single();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action, campaign: data, message: "Đã hủy lịch gửi campaign." });
  }

  const scheduledAt = stringField(body, "scheduledAt") || new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .schema("crm_v2")
    .from("email_campaigns")
    .update({ status: "scheduled", scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select("id,name,status,scheduled_at")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action, campaign: data, message: "Đã lên lịch campaign CRM v2." });
}

async function saveCampaignDraft(client: ReturnType<typeof createSupabaseAdminClient> extends infer T ? NonNullable<T> : never, body: Record<string, unknown>) {
  const name = stringField(body, "name") || `CRM v2 campaign ${new Date().toISOString().slice(0, 10)}`;
  const campaignType = stringField(body, "campaignType") || "broadcast";
  const segmentId = stringField(body, "segmentId");
  const campaignId = stringField(body, "campaignId");
  const goal = stringField(body, "goal") || "remarketing";
  const templateKey = stringField(body, "templateKey");
  const audienceLabel = stringField(body, "audienceLabel");
  const paymentStatus = stringField(body, "paymentStatus");
  const courseScope = stringField(body, "courseScope");
  const courseSlug = stringField(body, "courseSlug") || stringField(body, "courseId");
  const courseName = stringField(body, "courseName") || stringField(body, "courseLabel");
  const content = buildCrmV2MarketingEmailContent(readComposerBody(body));
  if (!content.subject || !content.text.trim()) return { ok: false, message: "Thiếu subject hoặc nội dung chính." };

  if (!courseSlug) return { ok: false, message: "Vui lòng chọn khóa học cụ thể trước khi lưu campaign." };

  const { data: existingCampaign } = isUuid(campaignId)
    ? await client.schema("crm_v2").from("email_campaigns").select("id,template_id,metadata").eq("id", campaignId).maybeSingle()
    : { data: null };

  const templatePayload = {
    name: `${name} template`,
    subject: content.subject,
    preheader: content.preheader || null,
    html_body: content.html,
    text_body: content.text,
    status: "draft",
    metadata: {
      source: "crm-v2-email-workspace",
      goal,
      cta_text: stringField(body, "ctaText"),
      cta_url: stringField(body, "ctaUrl"),
      footer: stringField(body, "footer"),
      composer: "block_editor",
      template_key: templateKey,
      audience_label: audienceLabel,
      payment_status: paymentStatus,
      course_scope: courseScope,
      course_slug: courseSlug,
      course_name: courseName,
      audience_scope: { course_slug: courseSlug, course_name: courseName, payment_status: paymentStatus },
    },
  };

  const templateId = typeof existingCampaign?.template_id === "string" ? existingCampaign.template_id : "";
  const templateResult = templateId
    ? await client.schema("crm_v2").from("email_templates").update({ ...templatePayload, updated_at: new Date().toISOString() }).eq("id", templateId).select("id,name,subject,status").single()
    : await client.schema("crm_v2").from("email_templates").insert(templatePayload).select("id,name,subject,status").single();
  if (templateResult.error || !templateResult.data) return { ok: false, message: templateResult.error?.message ?? "Không lưu được email template." };

  const campaignPayload = {
    name,
    segment_id: isUuid(segmentId) ? segmentId : null,
    template_id: templateResult.data.id,
    campaign_type: campaignType,
    status: "draft",
    metadata: {
      ...asRecord(existingCampaign?.metadata),
      source: "crm-v2-ui",
      safe_mode: true,
      composer: "crm-v2-email-workspace",
      goal,
      template_key: templateKey,
      audience_label: audienceLabel,
      payment_status: paymentStatus,
      course_scope: courseScope,
      course_slug: courseSlug,
      course_name: courseName,
      audience_scope: { course_slug: courseSlug, course_name: courseName, payment_status: paymentStatus },
    },
    updated_at: new Date().toISOString(),
  };

  const campaignResult = existingCampaign?.id
    ? await client.schema("crm_v2").from("email_campaigns").update(campaignPayload).eq("id", existingCampaign.id).select("id,name,status,campaign_type,segment_id,template_id,metadata").single()
    : await client.schema("crm_v2").from("email_campaigns").insert(campaignPayload).select("id,name,status,campaign_type,segment_id,template_id,metadata").single();
  if (campaignResult.error || !campaignResult.data) return { ok: false, message: campaignResult.error?.message ?? "Không lưu được campaign." };

  return { ok: true, campaign: campaignResult.data, template: templateResult.data, message: "save_draft: đã lưu nháp campaign, template và audience đã chọn." };
}

function readComposerBody(body: Record<string, unknown>) {
  return {
    subject: stringField(body, "subject"),
    preheader: stringField(body, "preheader"),
    body: stringField(body, "body") || stringField(body, "htmlBody"),
    ctaText: stringField(body, "ctaText"),
    ctaUrl: stringField(body, "ctaUrl"),
    footer: stringField(body, "footer"),
    advancedHtml: stringField(body, "advancedHtml"),
  };
}

function stringField(body: Record<string, unknown> | null | undefined, key: string) {
  const value = body?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
