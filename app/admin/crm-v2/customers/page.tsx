import { requireAdminAuth } from "@/lib/auth/session";
import { listAdminCustomerProfiles } from "@/services/adminCustomerService";
import { getAdminCourses } from "@/services/adminDataService";
import { StudentCreateDialog } from "@/components/admin/student-create-dialog";
import { CustomerDirectory } from "@/components/admin/customer-directory";
import { isValidUuid } from "@/lib/security/validation";

export const metadata = { title: "Khách hàng & học viên" };
export const dynamic = "force-dynamic";
export default async function CustomerPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireAdminAuth("/admin/crm-v2/customers", ["owner", "editor"]);
  const params = (await searchParams) ?? {};
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const role = auth?.adminRole ?? "editor";
  const [records, courses] = await Promise.all([listAdminCustomerProfiles({ includeProspects: role === "owner" }), getAdminCourses()]);
  return <CustomerDirectory records={records} courses={courses} canManageAccount={role === "owner"} initialSearch={value("q")} initialCourse={value("course")} initialProfile={value("profile")}
    createAction={<StudentCreateDialog courses={courses} canReviewEmail={role === "owner"} defaultOpen={value("add_student") === "1" || isValidUuid(value("operation_id"))} resumeOperationId={isValidUuid(value("operation_id")) ? value("operation_id") : undefined} />} />;
}
