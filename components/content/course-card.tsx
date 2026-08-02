import Link from "next/link";
import type { Course } from "@/data/courses";
import { getCourseLessonCount } from "@/data/courses";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

function getPosterStyle(course: Course) {
  const imageUrl =
    course.thumbnailImageUrl ||
    course.bannerImageUrl ||
    toYouTubeThumbnailUrl(course.videoPreviewUrl);

  if (imageUrl) {
    return {
      backgroundImage: `url(${imageUrl})`,
    };
  }

  return {
    background:
      "radial-gradient(circle at 18% 24%, rgba(242,162,58,0.34) 0 12px, transparent 13px), radial-gradient(circle at 22% 24%, transparent 0 38px, rgba(242,162,58,0.18) 39px 40px, transparent 41px 54px), linear-gradient(180deg, #ffffff 0%, #fff8ed 58%, #f4eadc 100%)",
  };
}

export function CourseCard({ course }: { course: Course }) {
  const isComingSoon = course.status === "coming-soon";
  const courseHref = course.landingPageUrl || "";
  const summary = (
    <>
      <h2 className="text-xl font-black tracking-[-0.04em] text-[var(--tam-ink)] sm:text-2xl">
        {course.title}
      </h2>
      <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-[var(--tam-muted)]">
        {course.shortDescription || course.description}
      </p>
    </>
  );

  return (
    <article className="tam-course-card tam-card tam-lift group flex min-h-[410px] flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-[#eef5fb]">
        <div className="tam-media-zoom absolute inset-0 bg-cover bg-center" style={getPosterStyle(course)} />
        <span className="absolute right-4 top-4 rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[11px] font-black text-[var(--tam-accent-strong)] shadow-sm backdrop-blur">
          {course.statusLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {isComingSoon ? (
          <div className="block rounded-lg">{summary}</div>
        ) : (
          <Link href={courseHref} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#159cfb] focus-visible:ring-offset-4">
            {summary}
          </Link>
        )}
        <div className="mt-5 flex items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <span>The Anh Marketing</span>
          <span>{course.modules.length} module</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-sm font-black text-[var(--tam-ink)]">
          <span className="text-lg text-[var(--tam-accent-strong)]">{course.price}</span>
          <span className="text-xs text-slate-500">{getCourseLessonCount(course)} bài học</span>
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
          {isComingSoon ? (
            <span aria-disabled="true" className="inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center rounded-full bg-[#e7eef5] px-5 text-sm font-black text-slate-500">
              Sắp ra mắt
            </span>
          ) : (
            <Link
              href={courseHref}
              className="tap-motion inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#159cfb] px-5 text-sm font-black text-white shadow-[0_10px_22px_rgba(21,156,251,.24)]"
            >
              Đăng ký ngay
            </Link>
          )}
          {!isComingSoon ? (
            <Link
              href={courseHref}
              className="tap-motion inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--tam-line)] bg-white px-5 text-sm font-bold text-[var(--tam-ink)] hover:border-[#159cfb]/30 hover:text-[var(--tam-accent-strong)]"
            >
              Xem chi tiết
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
