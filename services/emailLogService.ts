import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordLeadActivity } from "@/services/leadActivityService";

export type EmailLogStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "opened"
  | "clicked";

export type EmailLog = {
  id: string;
  leadId: string | null;
  email: string;
  subject: string;
  templateKey: string;
  resendEmailId: string | null;
  status: EmailLogStatus;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbEmailLog = {
  id: string;
  lead_id: string | null;
  email: string;
  subject: string;
  template_key: string;
  resend_email_id: string | null;
  status: EmailLogStatus;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
  updated_at: string;
};

const emailLogSelect =
  "id,lead_id,email,subject,template_key,resend_email_id,status,error_message,sent_at,delivered_at,opened_at,clicked_at,created_at,updated_at";

function mapEmailLog(row: DbEmailLog): EmailLog {
  return {
    id: row.id,
    leadId: row.lead_id,
    email: row.email,
    subject: row.subject,
    templateKey: row.template_key,
    resendEmailId: row.resend_email_id,
    status: row.status,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    openedAt: row.opened_at,
    clickedAt: row.clicked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEmailLogsByLead(leadId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("email_logs")
    .select(emailLogSelect)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as DbEmailLog[]).map(mapEmailLog);
}

export async function recordEmailLog(input: {
  leadId?: string | null;
  email: string;
  subject: string;
  templateKey: string;
  resendEmailId?: string | null;
  status: EmailLogStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return { ok: false, error: "Missing Supabase admin client" };

  const now = new Date().toISOString();
  const insert = await supabase
    .from("email_logs")
    .insert({
      lead_id: input.leadId ?? null,
      email: input.email,
      subject: input.subject,
      template_key: input.templateKey,
      resend_email_id: input.resendEmailId ?? null,
      status: input.status,
      error_message: input.errorMessage ?? null,
      sent_at: input.status === "sent" ? now : null,
      metadata: input.metadata ?? {},
    })
    .select(emailLogSelect)
    .single();

  if (insert.error || !insert.data) {
    return { ok: false, error: insert.error?.message ?? "Could not record email log" };
  }

  await recordLeadActivity({
    leadId: input.leadId ?? null,
    activityType: input.status === "failed" ? "email_failed" : "email_sent",
    title: input.status === "failed" ? `Email gửi cho ${input.email} bị lỗi` : `Đã gửi email cho ${input.email}`,
    description: input.subject,
    metadata: { templateKey: input.templateKey, resendEmailId: input.resendEmailId ?? null },
  });

  return { ok: true, error: null, log: mapEmailLog(insert.data as DbEmailLog) };
}

export async function updateEmailLogFromResendEvent(event: {
  type: string;
  data?: { email_id?: string; to?: string[]; subject?: string };
}) {
  const supabase = createSupabaseAdminClient();
  const resendEmailId = event.data?.email_id;

  if (!supabase || !resendEmailId) return { ok: false, error: "Missing email id" };

  const statusByType: Record<string, EmailLogStatus> = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.failed": "failed",
  };
  const status = statusByType[event.type];

  if (!status) return { ok: true, skipped: true };

  const now = new Date().toISOString();
  const patch: Record<string, string> = { status, updated_at: now };
  if (status === "delivered") patch.delivered_at = now;
  if (status === "opened") patch.opened_at = now;
  if (status === "clicked") patch.clicked_at = now;

  const update = await supabase
    .from("email_logs")
    .update(patch)
    .eq("resend_email_id", resendEmailId)
    .select(emailLogSelect)
    .single();

  if (update.error || !update.data) {
    return { ok: false, error: update.error?.message ?? "Could not update email log" };
  }

  const log = mapEmailLog(update.data as DbEmailLog);
  await recordLeadActivity({
    leadId: log.leadId,
    activityType: status === "failed" || status === "bounced" || status === "complained" ? "email_failed" : "email_delivered",
    title: status === "delivered" ? `Email đã được giao tới ${log.email}` : `Email ${status} cho ${log.email}`,
    description: log.subject,
    metadata: { resendEmailId, status },
  });

  return { ok: true, log };
}
