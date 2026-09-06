import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminAuth } from "@/lib/auth/session";
import { isValidUuid } from "@/lib/security/validation";
import { PageHeader } from "@/components/crm-v2";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { StudentAccessPanel } from "@/components/admin/student-access-panel";
import StudentsPageClient from "@/components/crm-v2/students-page-client";
import { listCrmV2Students, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { getAdminCourses } from "@/services/adminDataService";
export const metadata = { title: "Học viên" };
type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export default async function CrmV2StudentsPage({ searchParams }: PageProps) {
  const auth = await requireAdminAuth("/admin/crm-v2/students", ["owner", "editor"]);
  const params = (await searchParams) ?? {};
  if (params.view === "courses") redirect("/admin/crm-v2/courses");
  const query = normalizeCrmListQuery(params);
  const courses = await getAdminCourses();
  const progressView = params.view === "progress";
  const studentsResult = progressView ? await listCrmV2Students(query) : null;
  const adminRole = auth?.adminRole ?? "owner";
  return <div className="space-y-5">
    <PageHeader eyebrow="Chăm sóc học viên" title="Học viên" />
    <StudentCreateDialog courses={courses} canReviewEmail={adminRole === "owner"} defaultOpen={params.add_student === "1" || isValidUuid(params.operation_id)} resumeOperationId={isValidUuid(params.operation_id) ? params.operation_id : undefined} />
    <nav aria-label="Chức năng học viên" className="flex gap-2 border-b border-slate-200 pb-3">
      <Link className={`rounded-lg px-4 py-2 text-sm font-bold ${!progressView ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`} href="/admin/crm-v2/students">Tài khoản & quyền học</Link>
      <Link className={`rounded-lg px-4 py-2 text-sm font-bold ${progressView ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`} href="/admin/crm-v2/students?view=progress">Tiến độ học</Link>
    </nav>
    {studentsResult ? <StudentsPageClient courses={courses} query={query} studentsResult={studentsResult} canCreateTicket={adminRole === "owner"} /> : <StudentAccessPanel params={params} adminRole={adminRole} />}
  </div>;
}
