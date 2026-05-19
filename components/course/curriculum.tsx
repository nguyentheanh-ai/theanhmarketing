"use client";

import { useMemo, useState } from "react";
import { LessonCommentBox } from "@/components/course/lesson-comment-box";
import { SoftCard } from "@/components/ui/soft-card";
import type { Course, CourseLesson } from "@/data/courses";
import { cleanLessonTitle } from "@/lib/lesson-title";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

function getAccessLabel(access: CourseLesson["access"]) {
  if (access === "free") {
    return "Miễn phí";
  }

  if (access === "paid") {
    return "Premium";
  }

  return "Premium";
}

export function Curriculum({ course }: { course: Course }) {
  const initialOpenModules = useMemo(
    () => new Set(course.modules[0] ? [course.modules[0].title] : []),
    [course.modules],
  );
  const [openModules, setOpenModules] = useState(initialOpenModules);

  function toggleModule(title: string) {
    setOpenModules((current) => {
      const next = new Set(current);

      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }

      return next;
    });
  }

  return (
    <div className="grid gap-4">
      {course.modules.map((module, moduleIndex) => {
        const isOpen = openModules.has(module.title);
        const lessons = module.lessons.slice().sort((a, b) => a.order - b.order);

        return (
          <SoftCard key={module.title}>
            <button
              className="grid w-full gap-4 text-left sm:grid-cols-[72px_1fr_auto] sm:items-start"
              type="button"
              onClick={() => toggleModule(module.title)}
              aria-expanded={isOpen}
            >
              <span className="text-3xl font-black tracking-[-0.05em]">
                {String(moduleIndex + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block text-2xl font-black tracking-[-0.04em]">
                  {module.title}
                </span>
                <span className="mt-2 block leading-7 text-white/60">
                  {module.description}
                </span>
                <span className="mt-3 block text-sm font-semibold text-[#8bdcff]">
                  {lessons.length} bài học
                </span>
              </span>
              <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/8 text-xl font-bold text-white/60">
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen ? (
              <div className="mt-5 grid gap-3 border-t border-white/10 pt-5">
                {lessons.map((lesson, lessonIndex) => {
                  const thumbnailUrl = toYouTubeThumbnailUrl(lesson.youtubeUrl);

                  return (
                    <div key={lesson.id} className="rounded-xl border border-white/10 bg-white/6 p-4">
                      <div className="grid gap-4 text-sm lg:grid-cols-[180px_1fr_auto]">
                        <div className="relative overflow-hidden rounded-2xl bg-black">
                          {thumbnailUrl ? (
                            <div
                              aria-label={lesson.title}
                              className="aspect-video w-full bg-cover bg-center"
                              role="img"
                              style={{ backgroundImage: `url(${thumbnailUrl})` }}
                            />
                          ) : (
                            <div className="aspect-video w-full bg-white/10" />
                          )}
                          <span className="absolute left-3 top-3 rounded-full bg-black/78 px-3 py-1 text-xs font-black text-white">
                            Bài {lessonIndex + 1}
                          </span>
                          {lesson.access !== "free" ? (
                            <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-xs font-black text-black">
                              Premium
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <p className="font-semibold">{cleanLessonTitle(lesson.title)}</p>
                          <p className="mt-1 text-xs font-semibold text-[#8bdcff]">
                            {getAccessLabel(lesson.access)}
                          </p>
                          {lesson.access !== "free" ? (
                            <p className="mt-3 leading-6 text-white/60">
                              Bài học hiển thị trong lộ trình, video chỉ mở cho khách đã mua khóa.
                            </p>
                          ) : null}
                        </div>
                        <span className="text-white/50">{lesson.duration}</span>
                      </div>
                      {lesson.access === "free" && lesson.embedUrl ? (
                        <div className="mt-4 overflow-hidden rounded-2xl bg-black">
                          <iframe
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="aspect-video w-full"
                            src={lesson.embedUrl}
                            title={lesson.title}
                          />
                        </div>
                      ) : null}
                      {lesson.access !== "free" ? (
                        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white/8 p-4 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            Bài học Premium dành cho khách đã mua khóa.
                          </span>
                          <a href="/dang-ky" className="font-bold text-white">
                            Đăng ký để học →
                          </a>
                        </div>
                      ) : null}
                      {lesson.resources && lesson.resources.length > 0 ? (
                        <div className="mt-4 rounded-xl bg-white/8 p-4">
                          <p className="text-sm font-bold text-white">Tài liệu bài học</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {lesson.resources.map((resource) => (
                              <a
                                className="rounded-xl border border-white/10 bg-white/7 px-4 py-2 text-sm font-semibold text-white/65 transition hover:border-white/20 hover:text-white"
                                href={resource.url}
                                key={`${lesson.id}-${resource.url}`}
                                rel="noreferrer"
                                target={resource.url.startsWith("http") ? "_blank" : undefined}
                              >
                                {resource.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {lesson.allowComments ? (
                        <LessonCommentBox lessonId={lesson.id} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </SoftCard>
        );
      })}
    </div>
  );
}
