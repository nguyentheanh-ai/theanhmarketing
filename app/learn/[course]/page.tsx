import { notFound, redirect } from "next/navigation";
import { getOrderedCourseLessons } from "@/lib/course-learning";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getCourseBySlug, getPublishedCourseForStudent } from "@/services/courseService";

type CourseLearningPageProps = {
  params: Promise<{
    course: string;
  }>;
};

export default async function CourseLearningPage({ params }: CourseLearningPageProps) {
  const { course: courseSlug } = await params;
  const course = await getPublishedCourseForStudent(courseSlug);

  const firstPublishedLesson = course ? getOrderedCourseLessons(course)[0] : undefined;

  if (!firstPublishedLesson) {
    const catalogCourse = course ?? await getCourseBySlug(courseSlug);
    if (!catalogCourse || catalogCourse.landingPageUrl) {
      notFound();
    }

    return (
      <PageShell>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-sm font-semibold text-indigo-600">{catalogCourse.title}</p>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Khóa học đang được mở bán nội bộ
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Hãy liên hệ với Thế Anh để được học sớm
          </p>
          <div className="mt-8">
            <ButtonLink href="/dashboard" variant="secondary">Về khóa học của tôi</ButtonLink>
          </div>
        </section>
      </PageShell>
    );
  }

  redirect(`/learn/${courseSlug}/${firstPublishedLesson.id}`);
}
