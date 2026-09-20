import { readAllAdminRows } from "@/lib/admin/read-all-rows";
import { createSupabaseAuthServerClient } from "@/lib/auth/session";
import type { CourseAccessLead, CourseAccessOrder } from "@/lib/course-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Server-only, request-scoped access inputs. Never load the CRM to render a student page. */
export async function getStudentPortalAccessRecords(email: string): Promise<{
  orders: CourseAccessOrder[];
  leads: CourseAccessLead[];
}> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { orders: [], leads: [] };
  const client = createSupabaseAdminClient() ?? await createSupabaseAuthServerClient();
  if (!client) return { orders: [], leads: [] };
  // ILIKE is case-insensitive; escape pattern characters so an address stays literal.
  const pattern = normalizedEmail.replace(/[\\%_]/g, "\\$&");
  const [orders, leads] = await Promise.all([
    readAllAdminRows((from, to) => client.from("orders")
      .select("id,email,status,course_slug,course_title,payment_plan,order_items", { count: "exact" })
      .ilike("email", pattern).eq("status", "paid")
      .order("id", { ascending: true }).range(from, to), "quyền học từ đơn hàng"),
    readAllAdminRows((from, to) => client.from("leads")
      .select("id,email,source,created_at", { count: "exact" })
      .ilike("email", pattern).is("deleted_at", null).like("source", "admin-access-%")
      .order("id", { ascending: true }).range(from, to), "quyền học được cấp"),
  ]);
  return {
    orders: orders.map((row) => ({ email: row.email, status: row.status,
      courseSlug: row.course_slug, courseTitle: row.course_title,
      paymentPlan: row.payment_plan, orderItems: row.order_items })),
    leads: leads.map((row) => ({ email: row.email, source: row.source, createdAt: row.created_at })),
  };
}
