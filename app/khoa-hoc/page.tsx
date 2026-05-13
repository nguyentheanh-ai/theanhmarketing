import { CourseList } from "@/components/content/course-list";
import { PageShell } from "@/components/site/page-shell";
import { publicPages } from "@/data/pages";
import { getCourses } from "@/services/courseService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khóa học",
  description:
    "Danh sách khóa học Marketing, AI ứng dụng, Growth, Content, Data và vận hành Marketing thực chiến của Thế Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const page = publicPages.courses;
  const courses = await getCourses();
  const openCount = courses.filter((course) => course.status === "open").length;
  const comingSoonCount = courses.filter((course) => course.status === "coming-soon").length;

  return (
    <PageShell>
      <section className="mx-auto max-w-[1440px] px-5 pb-16 pt-32 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-8 border-b border-black/10 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-bold text-[#c77b20]">{page.eyebrow}</p>
            <h1 className="mt-4 max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-9 text-black/60">
              {page.description}
            </p>
          </div>
          <div className="grid gap-3 rounded-[1.25rem] bg-[#fff7ea] px-5 py-4 ring-1 ring-[#f3dec0] sm:grid-cols-2 lg:min-w-[320px]">
            <div>
              <p className="text-2xl font-black tracking-[-0.03em]">{courses.length}</p>
              <p className="text-sm text-black/55">Khóa học</p>
            </div>
            <div>
              <p className="text-2xl font-black tracking-[-0.03em]">{openCount}</p>
              <p className="text-sm text-black/55">Đang mở đăng ký</p>
            </div>
            {comingSoonCount > 0 ? (
              <p className="text-sm text-black/55 sm:col-span-2">
                {comingSoonCount} khóa học sắp diễn ra
              </p>
            ) : null}
          </div>
        </div>

        <div id="danh-sach-khoa-hoc">
          <CourseList courses={courses} filters={page.filters} />
        </div>
      </section>
    </PageShell>
  );
}
