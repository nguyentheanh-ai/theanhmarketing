import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const retentionDays = 30;

export type SoftDeletedStudent = {
  id: string;
  studentKey: string;
  email: string;
  phone: string;
  name: string;
  deletedAt: string;
  deleteAfter: string;
  purgedAt: string | null;
};

type DbSoftDeletedStudent = {
  id: string;
  student_key: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  deleted_at: string | null;
  delete_after: string | null;
  purged_at: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined) {
  return (phone ?? "").replace(/\D/g, "");
}

export function getAdminDeletedStudentKey(input: { email?: string; phone?: string; name?: string }) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;

  return `name:${(input.name ?? "hoc-vien").trim().toLowerCase()}`;
}

function addRetentionWindow(value = new Date()) {
  const deleteAfter = new Date(value);
  deleteAfter.setDate(deleteAfter.getDate() + retentionDays);
  return deleteAfter.toISOString();
}

function mapStudent(row: DbSoftDeletedStudent): SoftDeletedStudent {
  return {
    id: row.id,
    studentKey: row.student_key,
    email: row.email ?? "",
    phone: row.phone ?? "",
    name: row.name ?? "",
    deletedAt: row.deleted_at ?? "",
    deleteAfter: row.delete_after ?? "",
    purgedAt: row.purged_at,
  };
}

export async function getActiveDeletedStudentKeys() {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("admin_deleted_students")
    .select("student_key,restored_at")
    .is("restored_at", null);

  if (error || !data) {
    if (error?.code !== "42P01") {
      console.error("[admin-delete] Could not read deleted student tombstones", error);
    }

    return new Set<string>();
  }

  return new Set(data.map((row) => String(row.student_key)).filter(Boolean));
}

export async function softDeleteStudent(input: {
  name?: string;
  email?: string;
  phone?: string;
  reason?: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const now = new Date().toISOString();
  const studentKey = getAdminDeletedStudentKey(input);
  const { data, error } = await supabase
    .from("admin_deleted_students")
    .upsert(
      {
        student_key: studentKey,
        email: normalizeEmail(input.email) || null,
        phone: normalizePhone(input.phone) || null,
        name: input.name ?? "",
        reason: input.reason ?? "Admin soft delete",
        deleted_at: now,
        delete_after: addRetentionWindow(new Date(now)),
        restored_at: null,
        purged_at: null,
      },
      { onConflict: "student_key" },
    )
    .select("id,student_key,email,phone,name,deleted_at,delete_after,purged_at")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not soft delete student" };
  }

  return { ok: true, error: null, student: mapStudent(data as DbSoftDeletedStudent) };
}

export async function softDeleteLead(leadId: string, reason = "Admin soft delete") {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("leads")
    .update({
      deleted_at: now,
      delete_after: addRetentionWindow(new Date(now)),
      delete_reason: reason,
    })
    .eq("id", leadId)
    .is("deleted_at", null);

  return error ? { ok: false, error: error.message } : { ok: true, error: null };
}

async function findAuthUserByEmail(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  email: string,
) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email);

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }
  }

  return null;
}

export async function purgeExpiredAdminDeletes(now = new Date()) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, error: "Missing Supabase admin client" };
  }

  const nowIso = now.toISOString();
  const leadDelete = await supabase.from("leads").delete().not("deleted_at", "is", null).lte("delete_after", nowIso);

  if (leadDelete.error) {
    return { ok: false, error: leadDelete.error.message };
  }

  const { data: students, error: studentReadError } = await supabase
    .from("admin_deleted_students")
    .select("id,student_key,email,phone,name,deleted_at,delete_after,purged_at")
    .is("purged_at", null)
    .lte("delete_after", nowIso);

  if (studentReadError) {
    if (studentReadError.code === "42P01") {
      return { ok: true, purgedLeads: leadDelete.count ?? 0, purgedStudents: 0, deletedAuthUsers: 0 };
    }

    return { ok: false, error: studentReadError.message };
  }

  let purgedStudents = 0;
  let deletedAuthUsers = 0;

  for (const student of (students ?? []) as DbSoftDeletedStudent[]) {
    const email = normalizeEmail(student.email);
    const phone = normalizePhone(student.phone);

    if (email) {
      await supabase.from("leads").delete().eq("email", email).or("source.ilike.admin-student%,source.ilike.admin-access-%");

      const user = await findAuthUserByEmail(supabase, email);
      if (user) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (!error) deletedAuthUsers += 1;
      }
    }

    if (phone) {
      await supabase.from("leads").delete().eq("phone", phone).or("source.ilike.admin-student%,source.ilike.admin-access-%");
    }

    const { error } = await supabase
      .from("admin_deleted_students")
      .update({ purged_at: nowIso })
      .eq("id", student.id);

    if (!error) {
      purgedStudents += 1;
    }
  }

  return {
    ok: true,
    purgedLeads: leadDelete.count ?? 0,
    purgedStudents,
    deletedAuthUsers,
  };
}
