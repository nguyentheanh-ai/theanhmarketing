import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LeadActivityType =
  | "lead_created"
  | "lead_updated"
  | "note_added"
  | "note_updated"
  | "status_changed"
  | "payment_status_changed"
  | "sale_status_changed"
  | "email_sent"
  | "email_delivered"
  | "email_failed"
  | "password_reset_requested"
  | "customer_contacted";

export type LeadActivity = {
  id: string;
  leadId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  activityType: LeadActivityType;
  title: string;
  description: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type DbLeadActivity = {
  id: string;
  lead_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  activity_type: LeadActivityType;
  title: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const activitySelect =
  "id,lead_id,actor_email,actor_name,activity_type,title,description,old_value,new_value,metadata,created_at";

function mapActivity(row: DbLeadActivity): LeadActivity {
  return {
    id: row.id,
    leadId: row.lead_id,
    actorEmail: row.actor_email,
    actorName: row.actor_name,
    activityType: row.activity_type,
    title: row.title,
    description: row.description,
    oldValue: row.old_value,
    newValue: row.new_value,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function recordLeadActivity(input: {
  leadId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  activityType: LeadActivityType;
  title: string;
  description?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return { ok: false, error: "Missing Supabase admin client" };

  const { error } = await supabase.from("lead_activities").insert({
    lead_id: input.leadId ?? null,
    actor_email: input.actorEmail ?? null,
    actor_name: input.actorName ?? null,
    activity_type: input.activityType,
    title: input.title,
    description: input.description ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    metadata: input.metadata ?? {},
  });

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

export async function getRecentLeadActivities(limit = 10) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lead_activities")
    .select(activitySelect)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as DbLeadActivity[]).map(mapActivity);
}
