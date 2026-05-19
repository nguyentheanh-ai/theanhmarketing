import type { Course } from "@/data/courses";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

export function CourseMedia({ course }: { course: Course }) {
  const previewThumbnailUrl = toYouTubeThumbnailUrl(course.videoPreviewUrl);

  if (previewThumbnailUrl) {
    return (
      <div className="ai-panel-strong relative overflow-hidden rounded-[1.25rem] bg-black">
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
        className="ai-panel-strong min-h-[280px] rounded-[1.25rem] bg-cover bg-center"
        style={{
          backgroundImage: `url(${course.thumbnailImageUrl || course.bannerImageUrl})`,
        }}
        aria-label={course.thumbnailLabel}
      />
    );
  }

  return (
    <div className="ai-panel flex min-h-[280px] items-center justify-center p-8 text-center">
      <div>
        <p className="ai-kicker">{course.thumbnailLabel}</p>
        <p className="ai-muted mt-3 text-sm leading-6">{course.previewNote}</p>
      </div>
    </div>
  );
}
