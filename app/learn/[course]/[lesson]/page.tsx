import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/app/dashboard-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";
import type { Course, CourseLesson } from "@/data/courses";
import { getCourseBySlug } from "@/services/courseService";

type LessonWithCourseMeta = CourseLesson & {
  moduleTitle: string;
  moduleOrder: number;
};

type LessonPageProps = {
  params: Promise<{
    course: string;
    lesson: string;
  }>;
};

function getLessons(course: Course) {
  const lessons = course.modules
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
          moduleOrder: module.order,
        })),
    );

  return { course, lessons };
}

function getAccessLabel(access: CourseLesson["access"]) {
  if (access === "free") {
    return "Học thử";
  }

  if (access === "paid") {
    return "Học viên";
  }

  return "Khóa";
}

function getLessonHref(courseSlug: string, lessonId: string) {
  return `/learn/${courseSlug}/${lessonId}`;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { course: courseSlug, lesson: lessonId } = await params;
  const course = await getCourseBySlug(courseSlug);

  if (!course) {
    notFound();
  }

  const { lessons } = getLessons(course);
  const legacyLessonMatch = /^lesson-(\d+)$/.exec(lessonId);
  const legacyLessonIndex = legacyLessonMatch ? Number(legacyLessonMatch[1]) - 1 : -1;
  const currentIndex =
    lessons.findIndex((lesson) => lesson.id === lessonId) !== -1
      ? lessons.findIndex((lesson) => lesson.id === lessonId)
      : legacyLessonIndex;
  const currentLesson = lessons[currentIndex] as LessonWithCourseMeta | undefined;

  if (!currentLesson) {
    notFound();
  }

  const previousLesson = lessons[currentIndex - 1];
  const nextLesson = lessons[currentIndex + 1];
  const canWatchVideo = currentLesson.access !== "locked" && Boolean(currentLesson.embedUrl);

  return (
    <DashboardShell>
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[340px_1fr]">
        <SoftCard>
          <p className="text-sm font-semibold text-[#c77b20]">Khóa học</p>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">
            {course.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/55">
            {course.duration} · {course.level}
          </p>

          <div className="mt-6 grid gap-3">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson.id;

              return (
                <Link
                  key={lesson.id}
                  href={getLessonHref(course.slug, lesson.id)}
                  className={`rounded-2xl p-4 text-sm leading-6 transition hover:-translate-y-0.5 ${
                    isActive
                      ? "bg-black text-white shadow-[0_18px_45px_rgba(0,0,0,0.16)]"
                      : "bg-[#f2eadf] text-black hover:bg-white"
                  }`}
                >
                  <span className="block text-xs font-semibold opacity-60">
                    Bài {index + 1} · {getAccessLabel(lesson.access)}
                  </span>
                  <span className="mt-1 block font-semibold">{lesson.title}</span>
                  <span className="mt-1 block text-xs opacity-60">{lesson.duration}</span>
                </Link>
              );
            })}
          </div>
        </SoftCard>

        <div>
          {canWatchVideo ? (
            <div className="overflow-hidden rounded-[2rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
              <iframe
                className="aspect-video w-full"
                src={currentLesson.embedUrl}
                title={currentLesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-[2rem] bg-black px-6 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
              <div>
                <p className="text-sm font-semibold text-white/60">
                  {currentLesson.access === "locked" ? "Bài học đang khóa" : "Chưa có video"}
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                  {currentLesson.access === "locked"
                    ? "Đăng ký khóa học để mở bài này"
                    : "Video sẽ được cập nhật trong CMS"}
                </h2>
              </div>
            </div>
          )}

          <SoftCard className="mt-5">
            <p className="text-sm font-semibold text-[#c77b20]">
              Module {currentLesson.moduleOrder}: {currentLesson.moduleTitle}
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              {currentLesson.title}
            </h2>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-black/55">
              <span className="rounded-full bg-[#f2eadf] px-4 py-2">
                {currentLesson.duration}
              </span>
              <span className="rounded-full bg-[#f2eadf] px-4 py-2">
                {getAccessLabel(currentLesson.access)}
              </span>
            </div>
            <p className="mt-5 leading-8 text-black/65">
              Đây là giao diện học bài động theo dữ liệu khóa học. Khi nối database,
              video, tài liệu, trạng thái hoàn thành và tiến độ học viên sẽ đọc từ
              enrollment/progress thật.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard" variant="secondary">
                Quay lại dashboard
              </ButtonLink>
              {previousLesson ? (
                <ButtonLink
                  href={getLessonHref(course.slug, previousLesson.id)}
                  variant="secondary"
                >
                  Bài trước
                </ButtonLink>
              ) : null}
              {nextLesson ? (
                <ButtonLink href={getLessonHref(course.slug, nextLesson.id)}>
                  Bài tiếp theo
                </ButtonLink>
              ) : (
                <ButtonLink href="/dashboard">Hoàn thành khóa học</ButtonLink>
              )}
            </div>
          </SoftCard>
        </div>
      </div>
    </DashboardShell>
  );
}
