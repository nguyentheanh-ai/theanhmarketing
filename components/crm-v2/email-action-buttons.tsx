"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarClock, Eye, Mail, RefreshCw, Save, Send, XCircle } from "lucide-react";

import {
  buildCrmV2OperationalEmailTemplates,
  type CrmV2OperationalEmailTemplate,
} from "@/lib/crm-v2/operational-email-templates";
import type { CrmCourseOption, CrmEmailCampaignRow } from "@/lib/crm-v2/types";
import { IconButton, StatusBadge } from "./crm-components";

type SegmentOption = { label: string; value: string };
type CourseOption = CrmCourseOption;
type LegacyEmailConfig = {
  key: string;
  name: string;
  trigger: string;
  subject: string;
  source: string;
  sentCount: number;
  lastSentAt: string;
};
type AudienceSummary = {
  total: number;
  sendable: number;
  suppressed: number;
  missingEmail: number;
  samples?: Array<{ contactId: string; email: string; name: string; status: string; reason?: string }>;
};
type SendResult = {
  sent?: number;
  skipped?: number;
  failed?: number;
  message?: string;
  details?: Array<{ email?: string; status: string; reason?: string }>;
};
type ComposerState = {
  name: string;
  goal: string;
  campaignType: string;
  segmentId: string;
  subject: string;
  preheader: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  footer: string;
  advancedHtml: string;
  scheduledAt: string;
  templateKey: string;
  audienceLabel: string;
  paymentStatus: string;
  courseScope: string;
  courseId: string;
  courseLabel: string;
};

type EmailActionButtonsProps = {
  defaultName?: string;
  campaign?: CrmEmailCampaignRow;
  campaignId?: string;
  segmentOptions?: SegmentOption[];
  courseOptions?: CourseOption[];
  legacyEmailConfigs?: LegacyEmailConfig[];
  hasResend?: boolean;
};

const operationalTemplates = buildCrmV2OperationalEmailTemplates();

export function EmailActionButtons(props: EmailActionButtonsProps) {
  return <EmailMarketingWorkspace {...props} />;
}

export function EmailMarketingWorkspace({
  defaultName,
  campaign,
  campaignId,
  segmentOptions = [],
  courseOptions = [],
  legacyEmailConfigs = [],
  hasResend = false,
}: EmailActionButtonsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState(campaign?.id ?? campaignId ?? "");
  const [audience, setAudience] = useState<AudienceSummary | null>(
    campaign?.sendable !== undefined
      ? {
          total: Number(campaign.audienceTotal ?? 0),
          sendable: Number(campaign.sendable ?? 0),
          suppressed: Number(campaign.suppressed ?? 0),
          missingEmail: Number(campaign.missingEmail ?? 0),
        }
      : null,
  );
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [composer, setComposer] = useState<ComposerState>(() => ({
    name: defaultName || campaign?.name || `CRM v2 email ${new Date().toISOString().slice(0, 10)}`,
    goal: "payment_recovery",
    campaignType: "transactional_order",
    segmentId: campaign?.segmentId || "",
    subject: campaign?.subject || "",
    preheader: campaign?.preheader || "",
    body: "",
    ctaText: "",
    ctaUrl: "",
    footer: "The Anh Marketing chỉ gửi email khi anh/chị đã đăng ký khóa học hoặc có đơn hàng tại The Anh Marketing.",
    advancedHtml: "",
    scheduledAt: "",
    templateKey: "",
    audienceLabel: "",
    paymentStatus: "",
    courseScope: "",
    courseId: "",
    courseLabel: "",
  }));

  const selectedTemplate = operationalTemplates.find((template) => template.key === selectedTemplateKey) ?? null;
  const canEditCampaign = Boolean(selectedTemplateKey);
  const canSendNow = Boolean(activeCampaignId && audience?.sendable && audience.sendable > 0 && confirmText === "GUI THAT");
  const canSave = Boolean(selectedTemplateKey && composer.segmentId && composer.courseId && composer.subject.trim() && composer.body.trim());
  const previewText = useMemo(() => composer.body.split(/\n{2,}/).filter(Boolean), [composer.body]);

  async function runEmailAction(body: Record<string, unknown>) {
    const action = typeof body.action === "string" ? body.action : "email_action";
    setIsPending(true);
    setStatus(`${action}: đang xử lý...`);
    try {
      const response = await fetch("/api/admin/crm-v2/email/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      const message = typeof payload?.message === "string" ? payload.message : response.ok ? "ok" : "failed";
      const campaignRecord = payload?.campaign;
      if (response.ok && campaignRecord && typeof campaignRecord === "object" && typeof (campaignRecord as Record<string, unknown>).id === "string") {
        setActiveCampaignId(String((campaignRecord as Record<string, unknown>).id));
      }
      if (payload?.audience && typeof payload.audience === "object") setAudience(payload.audience as AudienceSummary);
      if (action === "send_campaign_now") setSendResult(payload as SendResult);
      setStatus(`${action}: ${message}`);
      if (response.ok && payload?.ok) router.refresh();
    } catch (error) {
      setStatus(`${action}: ${error instanceof Error ? error.message : "không gọi được API"}`);
    } finally {
      setIsPending(false);
    }
  }

  const composerPayload = {
    campaignId: activeCampaignId,
    name: composer.name,
    goal: composer.goal,
    campaignType: composer.campaignType,
    segmentId: composer.segmentId,
    subject: composer.subject,
    preheader: composer.preheader,
    body: composer.body,
    ctaText: composer.ctaText,
    ctaUrl: composer.ctaUrl,
    footer: composer.footer,
    advancedHtml: composer.advancedHtml,
    templateKey: composer.templateKey,
    audienceLabel: composer.audienceLabel,
    paymentStatus: composer.paymentStatus,
    courseScope: composer.courseScope,
    courseId: composer.courseId,
    courseLabel: composer.courseLabel,
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-950">Email MKT theo đơn hàng</div>
          <div className="text-xs font-bold text-slate-500">
            Chọn card mẫu. CRM sẽ tự điền nội dung mail, tệp nhận, trạng thái thanh toán và khóa học liên quan.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={hasResend ? "green" : "orange"}>{hasResend ? "Resend sẵn sàng" : "Thiếu RESEND_API_KEY"}</StatusBadge>
          <StatusBadge tone={audience?.sendable ? "green" : "slate"}>{audience?.sendable ?? 0} gửi được</StatusBadge>
        </div>
      </div>

      <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4 p-3">
          <EmailTemplatePicker
            configs={legacyEmailConfigs}
            onPick={applyOperationalTemplate}
            selectedKey={selectedTemplateKey}
            templates={operationalTemplates}
          />

          {canEditCampaign ? (
            <>
              <EmailComposer
                composer={composer}
                courseOptions={courseOptions}
                isPending={isPending}
                segmentOptions={segmentOptions}
                setComposer={setComposer}
              />

              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  disabled={isPending || !canSave}
                  label="Lưu nháp"
                  onClick={() => void runEmailAction({ action: "save_draft", ...composerPayload })}
                >
                  <Save className="h-4 w-4" />
                </IconButton>
                <IconButton
                  disabled={isPending || !composer.segmentId || !composer.courseId}
                  label="Xem audience"
                  onClick={() =>
                    void runEmailAction({
                      action: "preview_audience",
                      segmentId: composer.segmentId,
                      courseSlug: composer.courseId,
                      courseName: composer.courseLabel,
                      paymentStatus: composer.paymentStatus,
                    })}
                >
                  <Eye className="h-4 w-4" />
                </IconButton>
                <IconButton
                  disabled={isPending || !composer.segmentId || !composer.courseId}
                  label="Refresh audience"
                  onClick={() =>
                    void runEmailAction({
                      action: "refresh_audience",
                      segmentId: composer.segmentId,
                      campaignId: activeCampaignId,
                      courseSlug: composer.courseId,
                      courseName: composer.courseLabel,
                      paymentStatus: composer.paymentStatus,
                    })}
                >
                  <RefreshCw className="h-4 w-4" />
                </IconButton>
                <IconButton
                  disabled={isPending || !canSave}
                  label="Gửi test"
                  onClick={() =>
                    void runEmailAction({
                      action: "send_test_email",
                      ...composerPayload,
                      courseSlug: composer.courseId,
                      courseName: composer.courseLabel,
                      paymentStatus: composer.paymentStatus,
                    })
                  }
                >
                  <Mail className="h-4 w-4" />
                </IconButton>
                <IconButton
                  disabled={isPending || !activeCampaignId || !composer.scheduledAt || !canSave}
                  label="Lên lịch"
                  onClick={() => void runEmailAction({ action: "schedule_campaign", campaignId: activeCampaignId, scheduledAt: composer.scheduledAt })}
                >
                  <CalendarClock className="h-4 w-4" />
                </IconButton>
                <IconButton disabled={isPending || !activeCampaignId} label="Hủy lịch" onClick={() => void runEmailAction({ action: "cancel_schedule", campaignId: activeCampaignId })}>
                  <XCircle className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <label className="text-xs font-black text-amber-900">
                  Xác nhận gửi email thật
                  <input
                    aria-label="Xác nhận gửi email thật"
                    className="ml-2 h-9 w-32 rounded-lg border border-amber-200 bg-white px-3 text-xs font-black text-slate-900"
                    onChange={(event) => setConfirmText(event.target.value)}
                    placeholder="GUI THAT"
                    value={confirmText}
                  />
                </label>
                <IconButton
                  disabled={isPending || !canSendNow}
                  label="Gửi thật"
                  onClick={() => void runEmailAction({ action: "send_campaign_now", campaignId: activeCampaignId, confirmText })}
                >
                  <Send className="h-4 w-4" />
                </IconButton>
                <span className="text-xs font-bold text-amber-900">Chỉ mở khi đã refresh audience, có người gửi được và nhập đúng GUI THAT.</span>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-600">
              Bấm một card mail bên trên để tạo chiến dịch và soạn nội dung đầy đủ từ form email cũ.
            </div>
          )}

          {status ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700" role="status">
              {status}
            </div>
          ) : null}
          <EmailSendResultPanel result={sendResult} />
        </div>

        <aside className="min-w-0 border-t border-slate-200 bg-slate-50 p-3 xl:border-l xl:border-t-0">
          <EmailPreviewPanel composer={composer} paragraphs={previewText} sampleRecipient={buildSampleRecipient(composer)} />
          <AudiencePreviewPanel audience={audience} segmentSelected={Boolean(composer.segmentId)} template={selectedTemplate} />
        </aside>
      </div>
    </section>
  );

  function applyOperationalTemplate(template: CrmV2OperationalEmailTemplate) {
    const matchingSegment = pickSegmentForTemplate(template, segmentOptions, composer.segmentId);
    setSelectedTemplateKey(template.key);
    setAudience(null);
    setSendResult(null);
    setConfirmText("");
    setStatus(`Đã chọn ${template.name}. Kiểm tra tệp nhận rồi lưu nháp hoặc gửi test.`);
    setComposer((current) => ({
      ...current,
      name: `${template.name} - ${new Date().toISOString().slice(0, 10)}`,
      goal: template.goal,
      campaignType: template.campaignType,
      segmentId: matchingSegment,
      subject: template.subject,
      preheader: template.preheader,
      body: template.body,
      ctaText: template.ctaText,
      ctaUrl: template.ctaUrl,
      footer: template.footer,
      advancedHtml: "",
      templateKey: template.key,
      audienceLabel: template.audience.label,
      paymentStatus: template.audience.paymentStatus,
      courseScope: template.audience.courseScope,
      courseId: current.courseId || courseOptions[0]?.value || "",
      courseLabel: current.courseLabel || courseOptions[0]?.label || "",
    }));
  }
}

function pickSegmentForTemplate(template: CrmV2OperationalEmailTemplate, segmentOptions: SegmentOption[], currentSegmentId: string) {
  if (currentSegmentId) return currentSegmentId;
  const terms =
    template.key === "payment_success_access"
      ? ["paid", "đã thanh toán", "thanh toán thành công"]
      : template.key === "pending_payment_reminder"
        ? ["pending", "chưa thanh toán", "chờ thanh toán"]
        : template.key === "registration_payment"
          ? ["new", "đăng ký", "pending"]
          : ["new", "đăng ký", "pending"];
  const option = segmentOptions.find((segment) => terms.some((term) => segment.label.toLowerCase().includes(term)));
  return option?.value || segmentOptions[0]?.value || "";
}

export function EmailComposer({
  composer,
  courseOptions,
  isPending,
  segmentOptions,
  setComposer,
}: {
  composer: ComposerState;
  courseOptions: CourseOption[];
  isPending: boolean;
  segmentOptions: SegmentOption[];
  setComposer: (updater: (current: ComposerState) => ComposerState) => void;
}) {
  function update(patch: Partial<ComposerState>) {
    setComposer((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 lg:col-span-2">
        <div className="text-xs font-black uppercase text-blue-700">Tệp nhận đang cấu hình</div>
        <div className="mt-1 text-sm font-black text-slate-950">{composer.audienceLabel || "Chọn card mail để xác định tệp nhận"}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge tone="blue">Thanh toán: {composer.paymentStatus || "chưa chọn"}</StatusBadge>
          <StatusBadge tone="green">Khóa học: {composer.courseScope === "course_specific" ? "theo từng khóa" : "chưa chọn"}</StatusBadge>
          <StatusBadge tone="slate">Template: {composer.templateKey || "chưa chọn"}</StatusBadge>
        </div>
      </div>
      <label className="text-xs font-bold text-slate-600">
        Tên chiến dịch
        <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="name" onChange={(event) => update({ name: event.target.value })} value={composer.name} />
      </label>
      <label className="text-xs font-bold text-slate-600">
        Mục tiêu email
        <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="goal" onChange={(event) => update({ goal: event.target.value })} value={composer.goal}>
          <option value="payment_recovery">Thu hồi thanh toán</option>
          <option value="student_activation">Kích hoạt học viên</option>
          <option value="remarketing">Remarketing khách chưa mua</option>
          <option value="upsell">Upsell học viên</option>
          <option value="nurture">Nuôi dưỡng lead</option>
        </select>
      </label>
      <label className="text-xs font-bold text-slate-600">
        Loại email
        <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="campaignType" onChange={(event) => update({ campaignType: event.target.value })} value={composer.campaignType}>
          <option value="transactional_order">Theo đơn hàng</option>
          <option value="cart_recovery">Nhắc thanh toán</option>
          <option value="broadcast">Broadcast</option>
          <option value="drip">Drip</option>
          <option value="ab_test">A/B Test</option>
        </select>
      </label>
      <label className="text-xs font-bold text-slate-600">
        Gửi cho phân khúc
        <select className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="segmentId" onChange={(event) => update({ segmentId: event.target.value })} value={composer.segmentId}>
          <option value="">Chọn phân khúc</option>
          {segmentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-bold text-slate-600">
        Khóa học khách đăng ký
        <select
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
          name="courseId"
          onChange={(event) => {
            const option = courseOptions.find((item) => item.value === event.target.value);
            update({ courseId: event.target.value, courseLabel: option?.label ?? "" });
          }}
          value={composer.courseId}
        >
          <option value="">Chọn khóa học cụ thể</option>
          {courseOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.paidOrders} paid / {option.pendingOrders} chưa paid)
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
        <div className="font-black uppercase text-slate-500">Scope gửi thật</div>
        <div className="mt-1 text-sm font-black text-slate-900">{composer.courseLabel || "Chưa chọn khóa học"}</div>
        <div className="mt-1">CRM sẽ lọc thêm theo đơn hàng của khóa này và trạng thái thanh toán của template trước khi gửi.</div>
      </div>
      <label className="text-xs font-bold text-slate-600">
        Subject
        <input aria-label="Subject" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="subject" onChange={(event) => update({ subject: event.target.value })} value={composer.subject} />
      </label>
      <label className="text-xs font-bold text-slate-600">
        Preheader
        <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="preheader" onChange={(event) => update({ preheader: event.target.value })} value={composer.preheader} />
      </label>
      <label className="text-xs font-bold text-slate-600 lg:col-span-2">
        Nội dung chính
        <textarea aria-label="Nội dung chính" className="mt-1 min-h-64 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="body" onChange={(event) => update({ body: event.target.value })} value={composer.body} />
      </label>
      <label className="text-xs font-bold text-slate-600">
        CTA text
        <input aria-label="CTA text" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="ctaText" onChange={(event) => update({ ctaText: event.target.value })} value={composer.ctaText} />
      </label>
      <label className="text-xs font-bold text-slate-600">
        CTA URL
        <input aria-label="CTA URL" className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="ctaUrl" onChange={(event) => update({ ctaUrl: event.target.value })} value={composer.ctaUrl} />
      </label>
      <label className="text-xs font-bold text-slate-600">
        Lịch gửi
        <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="scheduledAt" onChange={(event) => update({ scheduledAt: event.target.value })} type="datetime-local" value={composer.scheduledAt} />
      </label>
      <label className="text-xs font-bold text-slate-600">
        Footer/unsubscribe
        <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" name="footer" onChange={(event) => update({ footer: event.target.value })} value={composer.footer} />
      </label>
      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
        <summary className="cursor-pointer text-xs font-black text-slate-700">HTML nâng cao</summary>
        <textarea className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400" disabled={isPending || !composer.segmentId || !composer.courseId} name="advancedHtml" onChange={(event) => update({ advancedHtml: event.target.value })} placeholder="Chỉ dùng khi cần chỉnh HTML sâu. Footer unsubscribe vẫn được thêm tự động." value={composer.advancedHtml} />
      </details>
    </div>
  );
}

function buildSampleRecipient(composer: ComposerState) {
  return {
    name: "Nguyễn Văn A",
    phone: "09xx xxx xxx",
    email: "khachhang@example.com",
    courseTitle: composer.courseLabel || "Khóa học đã chọn",
    orderCode: "TAM-DEMO-001",
    paymentStatus: composer.paymentStatus || "pending",
    paymentUrl: "https://www.theanhmarketing.com/thanh-toan/TAM-DEMO-001",
    courseAccessUrl: "https://app.theanhmarketing.com/dashboard",
  };
}

function replaceMergeTags(value: string, sampleRecipient: ReturnType<typeof buildSampleRecipient>) {
  return value
    .replaceAll("{{customerName}}", sampleRecipient.name)
    .replaceAll("{{customerPhone}}", sampleRecipient.phone)
    .replaceAll("{{customerEmail}}", sampleRecipient.email)
    .replaceAll("{{courseTitle}}", sampleRecipient.courseTitle)
    .replaceAll("{{orderCode}}", sampleRecipient.orderCode)
    .replaceAll("{{paymentStatus}}", sampleRecipient.paymentStatus)
    .replaceAll("{{paymentUrl}}", sampleRecipient.paymentUrl)
    .replaceAll("{{courseAccessUrl}}", sampleRecipient.courseAccessUrl);
}

function renderCrmV2EmailPreview(composer: ComposerState, sampleRecipient: ReturnType<typeof buildSampleRecipient>) {
  const subject = replaceMergeTags(composer.subject || "Subject email", sampleRecipient);
  const preheader = replaceMergeTags(composer.preheader || "Preheader sẽ hiển thị ở đây", sampleRecipient);
  const body = replaceMergeTags(composer.body || "Chọn một card mail để xem nội dung.", sampleRecipient);
  const paragraphs = body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return {
    subject,
    preheader,
    paragraphs,
    ctaText: replaceMergeTags(composer.ctaText, sampleRecipient),
    ctaUrl: replaceMergeTags(composer.ctaUrl, sampleRecipient),
    footer: replaceMergeTags(composer.footer, sampleRecipient),
  };
}

export function EmailPreviewPanel({ composer, paragraphs, sampleRecipient }: { composer: ComposerState; paragraphs: string[]; sampleRecipient: ReturnType<typeof buildSampleRecipient> }) {
  const rendered = renderCrmV2EmailPreview(composer, sampleRecipient);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">Live preview khách nhận</h3>
        <StatusBadge tone={composer.templateKey ? "blue" : "slate"}>{composer.templateKey ? "Live preview" : "Chưa chọn mẫu"}</StatusBadge>
      </div>
      {composer.segmentId && composer.courseId && composer.paymentStatus ? (
        <MockInboxPreview rendered={rendered} sampleRecipient={sampleRecipient} />
      ) : (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-800">
          Chọn đủ segment, khóa học và trạng thái thanh toán để preview đúng dữ liệu khách nhận.
        </div>
      )}
      <div className="sr-only">{paragraphs.length}</div>
    </div>
  );
}

function MockInboxPreview({ rendered, sampleRecipient }: { rendered: ReturnType<typeof renderCrmV2EmailPreview>; sampleRecipient: ReturnType<typeof buildSampleRecipient> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="text-xs font-bold text-slate-500">From: The Anh Marketing &lt;hello@theanhmarketing.com&gt;</div>
        <div className="text-xs font-bold text-slate-500">To: {sampleRecipient.name} &lt;{sampleRecipient.email}&gt;</div>
        <div className="mt-2 text-lg font-black text-slate-950">{rendered.subject}</div>
        <div className="mt-1 text-xs font-bold text-slate-500">{rendered.preheader}</div>
      </div>
      <div className="bg-white p-4">
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800">
          Sample: {sampleRecipient.courseTitle} · {sampleRecipient.orderCode} · {sampleRecipient.paymentStatus}
        </div>
        <div className="max-h-[420px] space-y-3 overflow-auto text-sm font-semibold leading-6 text-slate-700">
          {rendered.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        {rendered.ctaText && rendered.ctaUrl ? <div className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-black text-white">{rendered.ctaText}</div> : null}
        <div className="mt-5 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">{rendered.footer} Hủy nhận email.</div>
      </div>
    </div>
  );
}

export function AudiencePreviewPanel({
  audience,
  segmentSelected,
  template,
}: {
  audience: AudienceSummary | null;
  segmentSelected: boolean;
  template: CrmV2OperationalEmailTemplate | null;
}) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">Audience thật</h3>
        <StatusBadge tone={segmentSelected ? "green" : "orange"}>{segmentSelected ? "Đã chọn segment" : "Chưa chọn segment"}</StatusBadge>
      </div>
      {template ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-600">
          <div className="font-black text-slate-900">{template.audience.label}</div>
          <div className="mt-1">{template.audience.defaultSegmentHint}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {template.audience.filters.map((filter) => (
              <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200" key={filter}>
                {filter}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="Tổng" value={audience?.total ?? 0} />
        <MiniMetric label="Gửi được" value={audience?.sendable ?? 0} tone="green" />
        <MiniMetric label="Suppression" value={audience?.suppressed ?? 0} tone="orange" />
        <MiniMetric label="Thiếu email" value={audience?.missingEmail ?? 0} tone="red" />
      </div>
      <div className="mt-3 space-y-2">
        {(audience?.samples ?? []).map((sample) => (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-2 text-xs font-bold" key={sample.contactId}>
            <span className="truncate text-slate-700">{sample.name}</span>
            <span className="shrink-0 text-slate-500">{sample.email}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmailTemplatePicker({
  configs,
  onPick,
  selectedKey,
  templates,
}: {
  configs: LegacyEmailConfig[];
  onPick: (template: CrmV2OperationalEmailTemplate) => void;
  selectedKey: string;
  templates: CrmV2OperationalEmailTemplate[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {templates.map((template) => (
          <OperationalEmailTemplateCard key={template.key} onPick={onPick} selected={selectedKey === template.key} template={template} />
        ))}
      </div>
      <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-black text-slate-700">Form email cũ đã import</summary>
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {configs.map((config) => (
            <div key={config.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm font-black text-slate-900">{config.name}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{config.trigger}</div>
              <div className="mt-2 text-xs font-semibold text-slate-700">{config.subject}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge tone="blue">{config.sentCount} emails cũ</StatusBadge>
                <StatusBadge tone="slate">{config.source}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export function OperationalEmailTemplateCard({
  onPick,
  selected,
  template,
}: {
  onPick: (template: CrmV2OperationalEmailTemplate) => void;
  selected: boolean;
  template: CrmV2OperationalEmailTemplate;
}) {
  return (
    <button
      className={`min-h-[250px] rounded-lg border p-3 text-left transition ${
        selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
      }`}
      data-crm-action="button"
      onClick={() => onPick(template)}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-black text-slate-950">{template.name}</div>
        <StatusBadge tone={template.audience.paymentStatus === "paid" ? "green" : "orange"}>{template.badge}</StatusBadge>
      </div>
      <p className="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-slate-600">{template.description}</p>
      <div className="mt-3 rounded-lg bg-slate-50 p-2">
        <div className="text-[11px] font-black uppercase text-slate-500">Tệp khách hàng</div>
        <div className="mt-1 text-sm font-black text-slate-900">{template.audience.label}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
            Trạng thái: {template.audience.paymentStatus}
          </span>
          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">Theo khóa học</span>
        </div>
      </div>
      <div className="mt-3 text-xs font-bold text-slate-500">{template.source}</div>
      <div className="mt-3 text-sm font-semibold text-slate-800">{template.subject}</div>
    </button>
  );
}

export function EmailSendResultPanel({ result }: { result: SendResult | null }) {
  if (!result) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-black text-slate-900">Kết quả gửi</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <StatusBadge tone="green">Gửi {result.sent ?? 0}</StatusBadge>
        <StatusBadge tone="orange">Bỏ qua {result.skipped ?? 0}</StatusBadge>
        <StatusBadge tone="red">Lỗi {result.failed ?? 0}</StatusBadge>
      </div>
      {result.message ? <p className="mt-2 text-sm font-semibold text-slate-600">{result.message}</p> : null}
    </div>
  );
}

function MiniMetric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "orange" | "red" }) {
  const toneClass = tone === "green" ? "text-emerald-700" : tone === "orange" ? "text-orange-700" : tone === "red" ? "text-red-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="text-[11px] font-bold uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-black ${toneClass}`}>{value}</div>
    </div>
  );
}
