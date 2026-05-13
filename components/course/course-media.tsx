import type { Course } from "@/data/courses";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

export function CourseMedia({ course }: { course: Course }) {
  const previewThumbnailUrl = toYouTubeThumbnailUrl(course.videoPreviewUrl);

  if (previewThumbnailUrl) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <div
          aria-label={course.thumbnailLabel}
          className="aspect-video w-full bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url(${previewThumbnailUrl})` }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 to-transparent p-5 text-white">
          <p className="text-sm font-bold">{course.thumbnailLabel}</p>
        </div>
      </div>
    );
  }

  if (course.thumbnailImageUrl || course.bannerImageUrl) {
    return (
      <div
        className="min-h-[280px] rounded-[2rem] bg-cover bg-center shadow-[0_24px_80px_rgba(0,0,0,0.08)]"
        style={{
          backgroundImage: `url(${course.thumbnailImageUrl || course.bannerImageUrl})`,
        }}
        aria-label={course.thumbnailLabel}
      />
    );
  }

  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] bg-[#f2eadf] p-8 text-center">
      <div>
        <p className="text-sm font-semibold text-[#c77b20]">{course.thumbnailLabel}</p>
        <p className="mt-3 text-sm leading-6 text-black/55">{course.previewNote}</p>
      </div>
    </div>
  );
}
