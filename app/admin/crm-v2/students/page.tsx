import StudentsPageClient from "@/components/crm-v2/students-page-client";
import { listCrmV2Students, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { getAdminLmsSnapshot } from "@/services/lmsService";

export const metadata = {
  title: "Học viên & Khóa học",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2StudentsPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  const query = normalizeCrmListQuery(rawSearchParams);
  const studentsResult = await listCrmV2Students(query);
  const view = Array.isArray(rawSearchParams?.view) ? rawSearchParams?.view[0] : rawSearchParams?.view;
  const selectedCourseSlug = Array.isArray(rawSearchParams?.course) ? rawSearchParams?.course[0] : rawSearchParams?.course;
  const lmsSnapshot = await getAdminLmsSnapshot({ selectedCourseSlug });

  // StudentsPageClient renders StudentActionButtons with the selected live contact.
  return <StudentsPageClient query={query} studentsResult={studentsResult} lmsSnapshot={lmsSnapshot} view={view === "courses" ? "courses" : "students"} />;
}
