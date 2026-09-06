import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readAllAdminRows } from "@/lib/admin/read-all-rows";
import { getConfiguredOwnerEmails } from "@/lib/admin/admin-emails";
import { getStudentAccessRecords, type StudentAccessRecord } from "@/services/studentAccessService";
import { getActiveDeletedStudentKeys } from "@/services/adminDeletionService";
import { logStudentActivity } from "@/services/activityLogService";
import type { User } from "@supabase/supabase-js";

export function customerIdentity(email?: string | null, phone?: string | null, id = "") {
  const normalized = email?.trim().toLowerCase();
  return normalized ? `email:${normalized}` : phone?.replace(/\D/g, "") ? `phone:${phone.replace(/\D/g, "")}` : `record:${id}`;
}

export async function listAdminCustomerProfiles({ includeProspects = true }: { includeProspects?: boolean } = {}) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Nguồn hồ sơ chưa sẵn sàng.");
  const deleted = await getActiveDeletedStudentKeys({ strict: true });
  const [students, contacts] = await Promise.all([
    getStudentAccessRecords({ includeAllLeads: includeProspects, strict: true, deletedStudentKeys: deleted }),
    includeProspects ? readAllAdminRows((from, to) => client.schema("crm_v2").from("contacts")
      .select("id,full_name,email,phone,source,created_at,updated_at", { count: "exact" }).order("id").range(from, to), "hồ sơ CRM") : Promise.resolve([]),
  ]);
  const records = new Map(students.map((student) => [customerIdentity(student.email, student.phone, student.id), student]));
  for (const contact of contacts) {
    const key = customerIdentity(contact.email, contact.phone, contact.id);
    if (deleted.has(key) || records.has(key)) continue;
    records.set(key, { id: key, name: contact.full_name ?? "", email: contact.email ?? "", phone: contact.phone ?? "", source: contact.source ?? "CRM", note: "", role: "Lead", accessStatus: "Chưa cấp quyền", paymentStatus: "Không có đơn thanh toán", courseTitles: [], courseSlugs: [], accessibleCourseSlugs: [], paidOrderCodes: [], pendingOrderCodes: [], registeredAt: contact.created_at ?? "", updatedAt: contact.updated_at ?? "", progressPercent: 0, progressNote: "Chưa có hoạt động học tập" } satisfies StudentAccessRecord);
  }
  return [...records.values()].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function findCustomerAccount(email: string) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Không kết nối được tài khoản.");
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("Không đọc được trạng thái tài khoản.");
    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  throw new Error("Chưa xác nhận được tài khoản trong giới hạn tra cứu.");
}

export function isProtectedCustomerAccount(email: string, user: User | null, actorId?: string) {
  return getConfiguredOwnerEmails().includes(email.trim().toLowerCase()) || Boolean(user && (user.id === actorId || ["owner", "editor"].includes(user.app_metadata?.admin_role)));
}

export function customerAccountState(user: User | null) {
  const bannedUntil = (user as (User & { banned_until?: string }) | null)?.banned_until;
  return { exists: Boolean(user), blocked: Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now()) };
}

export async function setCustomerAccountBlocked(email: string, blocked: boolean, actor: { id: string; email?: string }) {
  const user = await findCustomerAccount(email);
  if (!user) throw new Error("Hồ sơ này chưa có tài khoản đăng nhập.");
  if (isProtectedCustomerAccount(email, user, actor.id)) throw new Error("Không thể chặn tài khoản quản trị từ hồ sơ khách hàng.");
  const client = createSupabaseAdminClient();
  if (!client) throw new Error("Không kết nối được tài khoản.");
  const { error } = await client.auth.admin.updateUserById(user.id, { ban_duration: blocked ? "876000h" : "none" });
  if (error) throw new Error("Không cập nhật được trạng thái chặn tài khoản.");
  const verified = await client.auth.admin.getUserById(user.id);
  if (verified.error || customerAccountState(verified.data.user).blocked !== blocked) throw new Error("Yêu cầu đã gửi nhưng chưa xác nhận được trạng thái; hãy tải lại hồ sơ trước khi thử lại.");
  const log = await logStudentActivity({ eventType: "profile_updated", eventTitle: blocked ? "Chặn đăng nhập tài khoản" : "Mở lại đăng nhập tài khoản", studentEmail: email, userId: user.id, actorId: actor.id, actorEmail: actor.email, actorType: "admin", status: "success", metadata: { action: blocked ? "block_login" : "unblock_login" } });
  return { ...customerAccountState(verified.data.user), auditRecorded: log.ok };
}
