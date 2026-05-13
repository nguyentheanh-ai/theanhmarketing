import type { Course } from "@/data/courses";

export function CourseMedia({ course }: { course: Course }) {
  if (course.videoPreviewEmbedUrl) {
    return (
      <div className="overflow-hidden rounded-[2rem] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full"
          src={course.videoPreviewEmbedUrl}
          title={course.thumbnailLabel}
        />
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
    <div className="media-float flex min-h-[280px] items-center justify-center rounded-[2rem] bg-[#f2eadf] p-8 text-center">
      <div>
        <p className="text-sm font-semibold text-[#c77b20]">{course.thumbnailLabel}</p>
        <p className="mt-3 text-sm leading-6 text-black/55">{course.previewNote}</p>
      </div>
    </div>
  );
}
