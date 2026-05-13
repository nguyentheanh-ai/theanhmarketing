import Link from "next/link";
import type { Course } from "@/data/courses";
import { getCourseLessonCount } from "@/data/courses";

function getPosterStyle(course: Course) {
  const imageUrl = course.thumbnailImageUrl || course.bannerImageUrl;

  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,247,235,0.88)), url(${imageUrl})`,
    };
  }

  return {
    background:
      "radial-gradient(circle at 18% 24%, rgba(242,162,58,0.34) 0 12px, transparent 13px), radial-gradient(circle at 22% 24%, transparent 0 38px, rgba(242,162,58,0.18) 39px 40px, transparent 41px 54px), linear-gradient(180deg, #ffffff 0%, #fff8ed 58%, #f4eadc 100%)",
  };
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <article
      className="group flex min-h-[390px] flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-[0_22px_70px_rgba(50,34,12,0.07)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(50,34,12,0.11)]"
    >
      <div
        className="relative flex min-h-[230px] flex-1 flex-col justify-between overflow-hidden bg-cover bg-center p-5"
        style={getPosterStyle(course)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-black shadow-sm">
            TAM
          </div>
          <span className="rounded-full bg-[#fff4df] px-3 py-1 text-[11px] font-bold text-[#9b5c13]">
            {course.statusLabel}
          </span>
        </div>
        <div>
          <p className="inline bg-white/85 px-2 py-1 text-lg font-black leading-snug tracking-[-0.025em] text-black shadow-sm">
            {course.title}
          </p>
          <p className="mt-3 line-clamp-2 text-base font-semibold leading-7 text-black/60">
            {course.shortDescription}
          </p>
        </div>
      </div>

      <div className="bg-white p-5 text-black">
        <Link href={`/khoa-hoc/${course.slug}`} className="block">
          <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-black/58">
            {course.description}
          </p>
        </Link>
        <div className="mt-5 flex items-center justify-between gap-4 text-xs font-bold text-black/50">
          <span>Thế Anh Marketing</span>
          <span>{course.duration}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-sm font-black text-black/80">
          <span className="text-[#b56b18]">{course.price}</span>
          <span>{getCourseLessonCount(course)} bài học</span>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/khoa-hoc/${course.slug}#giao-trinh`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-black px-4 text-sm font-bold text-white transition hover:-translate-y-0.5"
          >
            Học thử miễn phí
          </Link>
          <Link
            href={`/khoa-hoc/${course.slug}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:border-black/20"
          >
            Chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}
