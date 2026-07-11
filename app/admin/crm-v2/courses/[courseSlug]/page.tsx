import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ courseSlug: string }>;
  searchParams?: Promise<{ step?: string | string[] }>;
};

export default async function CourseWorkspacePage({ params, searchParams }: PageProps) {
  const { courseSlug } = await params;
  const query = await searchParams;
  const rawStep = Array.isArray(query?.step) ? query.step[0] : query?.step;
  const step = rawStep ? `?step=${encodeURIComponent(rawStep)}` : "";
  redirect(`/admin/course-studio/${courseSlug}${step}`);
}
