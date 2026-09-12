import { getCourseAccessSlugs, type CourseAccessOrder } from "@/lib/course-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readAllAdminRows } from "@/lib/admin/read-all-rows";

// Same access resolver as the dashboard, with only this verified user's evidence.
// No CRM enrichment, email history or cross-user payment scan for each PNG.
export async function getOwnedCourseSlugs(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return [];
  const client = createSupabaseAdminClient({ timeoutMs: 8_000 });
  if (!client) throw new Error("Course access source is unavailable");
  const emailPattern = normalizedEmail.replace(/[\\%_]/g, "\\$&");
  const [orders, leads] = await Promise.all([
    readAllAdminRows((from, to) => client.from("orders")
      .select("id,email,status,course_slug,course_title,payment_plan,order_items", { count: "exact" })
      .ilike("email", emailPattern).eq("status", "paid").order("id").range(from, to), "course access orders"),
    readAllAdminRows((from, to) => client.from("leads")
      .select("id,email,source,created_at", { count: "exact" })
      .ilike("email", emailPattern).is("deleted_at", null).order("id").range(from, to), "course access overrides"),
  ]);
  return getCourseAccessSlugs({
    email: normalizedEmail,
    orders: orders.map((order) => ({
      email: order.email, status: order.status, courseSlug: order.course_slug,
      courseTitle: order.course_title, paymentPlan: order.payment_plan,
      orderItems: order.order_items as CourseAccessOrder["orderItems"],
    })),
    leads: leads.map((lead) => ({ email: lead.email, source: lead.source, createdAt: lead.created_at })),
  });
}
