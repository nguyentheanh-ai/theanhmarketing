import StudentsPageClient from "@/components/crm-v2/students-page-client";
import { listCrmV2Students, normalizeCrmListQuery } from "@/lib/crm-v2/data";
import { getAdminCourses } from "@/services/adminDataService";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Học viên & Khóa học",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CrmV2StudentsPage({ searchParams }: PageProps) {
  const rawSearchParams = await searchParams;
  const query = normalizeCrmListQuery(rawSearchParams);
  const view = Array.isArray(rawSearchParams?.view) ? rawSearchParams?.view[0] : rawSearchParams?.view;
  if (view === "courses") redirect("/admin/crm-v2/courses");
  const [studentsResult, courses] = await Promise.all([listCrmV2Students(query), getAdminCourses()]);

  // StudentsPageClient renders StudentActionButtons with the selected live contact.
  return <StudentsPageClient courses={courses} query={query} studentsResult={studentsResult} />;
}
