import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
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
  return (
    <article className="group flex min-h-[390px] flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-[0_22px_70px_rgba(50,34,12,0.07)] ring-1 ring-black/5">
      <div
        className="relative min-h-[230px] overflow-hidden bg-cover bg-center"
        style={getPosterStyle(course)}
      >
        <span className="absolute right-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold text-[#9b5c13] shadow-sm">
          {course.statusLabel}
        </span>
      </div>

      <div className="bg-white p-5 text-black">
        <Link href={`/khoa-hoc/${course.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c77b20]">
          <h2 className="text-2xl font-black tracking-[-0.04em] text-black">
            {course.title}
          </h2>
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-black/58">
            {course.shortDescription || course.description}
          </p>
        </Link>
        <div className="mt-5 flex items-center justify-between gap-4 text-xs font-bold text-black/50">
          <span>The Anh Marketing</span>
          <span>{course.modules.length} module</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-sm font-black text-black/80">
          <span className="text-[#b56b18]">{course.price}</span>
          <span>{getCourseLessonCount(course)} bài học</span>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <AddToCartButton
            slug={course.slug}
            title={course.title}
            price={course.price}
            className="flex-1"
          />
          <Link
            href={`/khoa-hoc/${course.slug}#lo-trinh`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-bold text-black/72 transition hover:border-black/25 hover:text-black"
          >
            Học thử miễn phí
          </Link>
        </div>
      </div>
    </article>
  );
}
