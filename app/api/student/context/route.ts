import { NextResponse } from "next/server";
import { getStudentCourseHref } from "@/lib/student-course-navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStudentPortalSnapshot } from "@/services/studentPortalService";

export const dynamic = "force-dynamic";

// Structured, read-only context about the signed-in student. Used by the
// student help launcher today and by the customer-care bot later; it only
// ever describes the caller's own account.
export async function GET() {
  const snapshot = await getStudentPortalSnapshot();
  if (!snapshot.user || !snapshot.email) return NextResponse.json({ ok: false, message: "Cần đăng nhập." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const courses = snapshot.ownedCourses.map((course) => ({
    slug: course.slug, title: course.title, href: getStudentCourseHref(course),
    progress: Math.max(0, Math.min(100, Math.round(snapshot.progressBySlug[course.slug] ?? 0))),
    lessons: snapshot.lessonCountsBySlug[course.slug] ?? null,
  }));
  const next = courses.filter((course) => course.progress < 100).sort((a, b) => b.progress - a.progress)[0] ?? null;
  let pendingOrders: { code: string; product: string; amount: number | null; createdAt: string }[] = [];
  const client = createSupabaseAdminClient();
  if (client) {
    const pattern = snapshot.email.trim().toLowerCase().replace(/[\\%_]/g, "\\$&");
    const { data } = await client.from("orders").select("order_code,course_title,product_name,amount,created_at")
      .ilike("email", pattern).eq("status", "pending").order("created_at", { ascending: false }).limit(5);
    pendingOrders = (data ?? []).map((row) => ({ code: String(row.order_code ?? ""), product: String(row.product_name || row.course_title || ""), amount: typeof row.amount === "number" ? row.amount : null, createdAt: String(row.created_at ?? "") }));
  }
  return NextResponse.json({
    ok: true,
    student: { name: snapshot.displayName, email: snapshot.email },
    courses, nextCourse: next, pendingOrders,
    support: { booking: "/dat-lich-ho-tro", account: "/tai-khoan" },
  }, { headers: { "Cache-Control": "no-store" } });
}
