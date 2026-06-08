import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordLeadActivity } from "@/services/leadActivityService";

export type LeadNote = {
  id: string;
  leadId: string;
  content: string;
  noteType: string;
  createdByEmail: string | null;
  updatedByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

type DbLeadNote = {
  id: string;
  lead_id: string;
  content: string;
  note_type: string | null;
  created_by_email: string | null;
  updated_by_email: string | null;
  created_at: string;
  updated_at: string;
};

const noteSelect = "id,lead_id,content,note_type,created_by_email,updated_by_email,created_at,updated_at";

function mapNote(row: DbLeadNote): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    content: row.content,
    noteType: row.note_type ?? "care",
    createdByEmail: row.created_by_email,
    updatedByEmail: row.updated_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLeadNotes(leadId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lead_notes")
    .select(noteSelect)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as DbLeadNote[]).map(mapNote);
}

export async function addLeadNote(input: {
  leadId: string;
  content: string;
  noteType?: string;
  actorEmail?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) return { ok: false, error: "Missing Supabase admin client" };

  const insert = await supabase
    .from("lead_notes")
    .insert({
      lead_id: input.leadId,
      content: input.content,
      note_type: input.noteType ?? "care",
      created_by_email: input.actorEmail ?? null,
      updated_by_email: input.actorEmail ?? null,
    })
    .select(noteSelect)
    .single();

  if (insert.error || !insert.data) {
    return { ok: false, error: insert.error?.message ?? "Could not add lead note" };
  }

  const note = mapNote(insert.data as DbLeadNote);
  await recordLeadActivity({
    leadId: input.leadId,
    actorEmail: input.actorEmail ?? null,
    activityType: "note_added",
    title: "Sale đã thêm ghi chú khách hàng",
    description: input.content.slice(0, 240),
    metadata: { noteId: note.id },
  });

  return { ok: true, error: null, note, updatedAt: note.createdAt };
}
