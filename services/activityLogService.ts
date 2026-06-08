import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanEmail, cleanPhone, cleanText } from "@/lib/security/validation";

export type ActivityLogStatus = "success" | "failed" | "pending" | "info";
export type ActivityActorType = "system" | "student" | "admin" | "sale" | "support";

export type ActivityEventType =
  | "payment_email_sent"
  | "payment_email_failed"
  | "payment_success_email_sent"
  | "payment_success_email_failed"
  | "student_account_created"
  | "course_access_granted"
  | "course_access_revoked"
  | "student_login_success"
  | "student_login_failed"
  | "student_entered_learning"
  | "password_changed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "profile_updated"
  | "payment_status_updated"
  | "sale_status_updated"
  | "sheet_sync_success"
  | "sheet_sync_failed";

export type ActivityLog = {
  id: string;
  studentId: string | null;
  leadId: string | null;
  userId: string | null;
  studentEmail: string | null;
  studentPhone: string | null;
  eventType: ActivityEventType;
  eventTitle: string;
  eventDescription: string | null;
  status: ActivityLogStatus;
  actorType: ActivityActorType;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type DbActivityLog = {
  id: string;
  student_id: string | null;
  lead_id: string | null;
  user_id: string | null;
  student_email: string | null;
  student_phone: string | null;
  event_type: ActivityEventType;
  event_title: string;
  event_description: string | null;
  status: ActivityLogStatus;
  actor_type: ActivityActorType;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const activityLogSelect =
  "id,student_id,lead_id,user_id,student_email,student_phone,event_type,event_title,event_description,status,actor_type,actor_id,actor_email,actor_name,metadata,ip_address,user_agent,created_at";

const blockedMetadataKeys = new Set([
  "authorization",
  "apiKey",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "secret",
  "password",
  "temporaryPassword",
  "resetToken",
]);

function mapActivityLog(row: DbActivityLog): ActivityLog {
  return {
    id: row.id,
    studentId: row.student_id,
    leadId: row.lead_id,
    userId: row.user_id,
    studentEmail: row.student_email,
    studentPhone: row.student_phone,
    eventType: row.event_type,
    eventTitle: row.event_title,
    eventDescription: row.event_description,
    status: row.status,
    actorType: row.actor_type,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorName: row.actor_name,
    metadata: row.metadata ?? {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function normalizeMetadataKey(key: string) {
  return key.replace(/[-_\s]/g, "").toLowerCase();
}

export function sanitizeActivityMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const clean: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = normalizeMetadataKey(key);
    const isBlocked = Array.from(blockedMetadataKeys).some((blockedKey) => normalizeMetadataKey(blockedKey) === normalizedKey);

    if (isBlocked) {
      continue;
    }

    if (rawValue === null || ["string", "number", "boolean"].includes(typeof rawValue)) {
      clean[key] = typeof rawValue === "string" ? cleanText(rawValue, 500) : rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      clean[key] = rawValue
        .filter((item) => item === null || ["string", "number", "boolean"].includes(typeof item))
        .slice(0, 20)
        .map((item) => (typeof item === "string" ? cleanText(item, 200) : item));
    }
  }

  return clean;
}

export async function logStudentActivity(input: {
  studentId?: string | null;
  leadId?: string | null;
  userId?: string | null;
  studentEmail?: string | null;
  studentPhone?: string | null;
  eventType: ActivityEventType;
  eventTitle: string;
  eventDescription?: string | null;
  status?: ActivityLogStatus;
  actorType?: ActivityActorType;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  dedupeWindowMinutes?: number;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    console.warn("[activity-log] Missing Supabase client; skipped activity log.", { eventType: input.eventType });
    return { ok: false, error: "Missing Supabase client" };
  }

  const studentEmail = cleanEmail(input.studentEmail);
  const studentPhone = cleanPhone(input.studentPhone);
  const dedupeWindowMinutes = input.dedupeWindowMinutes ?? 0;

  if (dedupeWindowMinutes > 0 && (studentEmail || input.userId)) {
    const since = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000).toISOString();
    let query = supabase
      .from("activity_logs")
      .select("id")
      .eq("event_type", input.eventType)
      .gte("created_at", since)
      .limit(1);

    query = input.userId ? query.eq("user_id", input.userId) : query.eq("student_email", studentEmail);
    const existing = await query.maybeSingle();

    if (existing.data?.id) {
      return { ok: true, skipped: true, error: null };
    }
  }

  const { error } = await supabase.from("activity_logs").insert({
    student_id: input.studentId ?? null,
    lead_id: input.leadId ?? null,
    user_id: input.userId ?? null,
    student_email: studentEmail || null,
    student_phone: studentPhone || null,
    event_type: input.eventType,
    event_title: cleanText(input.eventTitle, 220),
    event_description: input.eventDescription ? cleanText(input.eventDescription, 1000) : null,
    status: input.status ?? "info",
    actor_type: input.actorType ?? "system",
    actor_id: input.actorId ?? null,
    actor_email: cleanEmail(input.actorEmail) || null,
    actor_name: input.actorName ? cleanText(input.actorName, 160) : null,
    metadata: sanitizeActivityMetadata(input.metadata),
    ip_address: input.ipAddress ? cleanText(input.ipAddress, 120) : null,
    user_agent: input.userAgent ? cleanText(input.userAgent, 500) : null,
  });

  if (error) {
    console.error("[activity-log] Could not write activity log", { eventType: input.eventType, error: error.message });
    return { ok: false, error: error.message };
  }

  return { ok: true, skipped: false, error: null };
}

export async function getStudentActivityLogs(input: {
  studentEmail?: string | null;
  leadId?: string | null;
  userId?: string | null;
  limit?: number;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return [];

  const limit = Math.max(1, Math.min(input.limit ?? 25, 100));
  let query = supabase.from("activity_logs").select(activityLogSelect).order("created_at", { ascending: false }).limit(limit);

  if (input.userId) {
    query = query.eq("user_id", input.userId);
  } else if (input.leadId) {
    query = query.eq("lead_id", input.leadId);
  } else {
    const studentEmail = cleanEmail(input.studentEmail);
    if (!studentEmail) return [];
    query = query.eq("student_email", studentEmail);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) console.error("[activity-log] Could not read activity logs", { error: error.message });
    return [];
  }

  return (data as DbActivityLog[]).map(mapActivityLog);
}
