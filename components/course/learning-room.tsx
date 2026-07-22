"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CourseReferenceLibrary } from "@/components/course/course-reference-library";
import { BrandMark } from "@/components/site/brand-mark";
import type { CourseReferencePack } from "@/data/course-reference-packs";
import type { Course, CourseLesson } from "@/data/courses";
import { siteConfig } from "@/data/site";
import { cleanLessonTitle } from "@/lib/lesson-title";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

export type LearningLesson = CourseLesson & {
  moduleTitle: string;
  moduleOrder: number;
};

type LearningRoomProps = {
  course: Course;
  currentLesson: LearningLesson;
  currentLessonCompleted?: boolean;
  lessons: LearningLesson[];
  previousLesson?: LearningLesson;
  nextLesson?: LearningLesson;
  referencePacks?: CourseReferencePack[];
};

function getLessonHref(courseSlug: string, lessonId: string) {
  return `/learn/${courseSlug}/${lessonId}`;
}

function getAccessLabel(access: CourseLesson["access"]) {
  return access === "free" ? "Miễn phí" : "Premium";
}

export function LearningRoom({
  course,
  currentLesson,
  currentLessonCompleted = false,
  lessons,
  nextLesson,
  previousLesson,
  referencePacks = [],
}: LearningRoomProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(currentLessonCompleted);
  const [progressMessage, setProgressMessage] = useState("");
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const canWatchVideo = Boolean(currentLesson.embedUrl);
  const thumbnailUrl = toYouTubeThumbnailUrl(currentLesson.youtubeUrl);
  const shellClass = "ai-os-bg ai-grid text-white";
  const panelClass = "ai-panel text-white";
  const mutedText = "text-white/62";
  const subtlePanel = "border border-white/10 bg-white/8 text-white/72";

  async function updateProgress() {
    setIsSavingProgress(true);
    setProgressMessage("");
    try {
      const response = await fetch("/api/student/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlug: course.slug,
          lessonId: currentLesson.id,
          completed: true,
        }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; progressPercent?: number } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.message ?? "Không cập nhật được tiến độ.");
      setIsCompleted(true);
      setProgressMessage(`Đã lưu tiến độ ${result.progressPercent ?? 0}%.`);
    } catch (error) {
      setProgressMessage(error instanceof Error ? error.message : "Không cập nhật được tiến độ.");
    } finally {
      setIsSavingProgress(false);
    }
  }

  return (
    <main className={`min-h-screen ${shellClass}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r p-5 transition-transform ${
          isSidebarVisible ? "translate-x-0" : "-translate-x-full"
        } border-[#77d7ff]/15 bg-[#05080d]/88 backdrop-blur-2xl`}
      >
        <button
          aria-label="Ẩn menu khóa học"
          className="absolute -right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-black text-black shadow-[0_12px_34px_rgba(0,0,0,0.22)] hover:bg-white/90"
          type="button"
          onClick={() => setIsSidebarVisible(false)}
        >
          {"<"}
        </button>

        <Link href="/" className="flex items-center gap-3 rounded-xl border border-[#77d7ff]/18 bg-white/8 p-3 text-white">
          <BrandMark className="grid size-10 place-items-center overflow-hidden rounded-lg bg-white/8 p-1 ring-1 ring-[#77d7ff]/25" />
          <span>
            <span className="block text-sm font-black">{siteConfig.name}</span>
            <span className="block text-xs font-bold text-white/48">The Anh Academy</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-2 text-sm font-bold">
          <Link
            className="rounded-xl bg-[#159cfb] px-4 py-3 text-white"
            href="/dashboard"
          >
            Khóa học của tôi
          </Link>
        </nav>

        <div className="mt-auto grid gap-3">
          <div className="flex min-h-12 items-center justify-between rounded-xl border border-[#77d7ff]/18 bg-white/8 px-4 text-sm font-black text-white">
            <span>Content OS</span>
            <span className="grid size-7 place-items-center rounded-full bg-black text-white">
              AI
            </span>
          </div>
          <SignOutButton
            className="rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-white/62 hover:bg-white/8 hover:text-white"
          />
        </div>
      </aside>

      {isSidebarVisible ? (
        <button
          aria-label="Đóng menu khóa học"
          className="fixed inset-0 z-30 bg-black/48 backdrop-blur-sm"
          type="button"
          onClick={() => setIsSidebarVisible(false)}
        />
      ) : null}

      <button
        aria-label="Mở menu khóa học"
        className="fixed left-4 top-4 z-30 grid size-11 place-items-center rounded-full border border-white/10 bg-[#05080d]/88 text-2xl font-black text-white shadow-[0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-white hover:text-black"
        type="button"
        onClick={() => setIsSidebarVisible(true)}
      >
        ≡
      </button>

      <section className="transition-[margin]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#77d7ff]/15 bg-[#05080d]/78 px-5 pl-20 backdrop-blur-xl lg:px-6 lg:pl-20">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>Đang học</p>
            <p className="font-bold">{course.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#159cfb] px-4 py-2 text-sm font-black text-white lg:hidden">
              OS
            </span>
            <Link
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-black"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-6">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-xl border border-[#77d7ff]/15 shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
              {canWatchVideo ? (
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-video w-full bg-black"
                  src={currentLesson.embedUrl}
                  title={cleanLessonTitle(currentLesson.title)}
                />
              ) : (
                <div className="relative aspect-video bg-black">
                  {thumbnailUrl ? (
                    <div
                      aria-label={cleanLessonTitle(currentLesson.title)}
                      className="absolute inset-0 bg-cover bg-center opacity-62"
                      role="img"
                      style={{ backgroundImage: `url(${thumbnailUrl})` }}
                    />
                  ) : null}
                  <div className="absolute inset-0 grid place-items-center px-6 text-center text-white">
                    <div>
                      <p className="text-sm font-bold text-white/62">Chưa có video</p>
                      <h1 className="mt-3 text-2xl font-semibold">Bài học sẽ được cập nhật trong admin.</h1>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <CourseReferenceLibrary packs={referencePacks} />

            <div className="mt-4 grid gap-4">
              <section className={`rounded-2xl p-4 ring-1 ${panelClass}`}>
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>
                  Module {currentLesson.moduleOrder}: {currentLesson.moduleTitle}
                </p>
                <h1 className="mt-2 max-w-5xl text-xl font-semibold leading-snug md:text-2xl">
                  {cleanLessonTitle(currentLesson.title)}
                </h1>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    className={`rounded-xl px-5 py-3 text-center text-sm font-bold ${isCompleted ? "bg-emerald-400/80 text-white" : "bg-white text-black"}`}
                    disabled={isSavingProgress || isCompleted}
                    onClick={updateProgress}
                    type="button"
                  >
                    {isCompleted ? "Đã hoàn thành" : isSavingProgress ? "Đang lưu..." : "Hoàn thành bài học"}
                  </button>
                  {previousLesson ? (
                    <Link
                      className={`rounded-xl px-5 py-3 text-center text-sm font-bold ${subtlePanel}`}
                      href={getLessonHref(course.slug, previousLesson.id)}
                    >
                      Bài trước
                    </Link>
                  ) : null}
                  {nextLesson ? (
                    <Link
                      className="rounded-xl bg-[#159cfb] px-5 py-3 text-center text-sm font-bold text-white"
                      href={getLessonHref(course.slug, nextLesson.id)}
                    >
                      Bài tiếp theo
                    </Link>
                  ) : (
                    <Link
                      className="rounded-xl bg-emerald-400/80 px-5 py-3 text-center text-sm font-bold text-white"
                      href="/dashboard"
                    >
                      Hoàn thành khóa học
                    </Link>
                  )}
                </div>
                {progressMessage ? <p className="mt-3 text-sm font-bold text-white/72">{progressMessage}</p> : null}
              </section>
              {currentLesson.description || currentLesson.content ? (
                <section className={`rounded-2xl p-4 ring-1 ${panelClass}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>Nội dung bài học</p>
                  {currentLesson.description ? <p className="mt-3 text-sm leading-7 text-white/72">{currentLesson.description}</p> : null}
                  {currentLesson.content ? <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/82">{currentLesson.content}</div> : null}
                </section>
              ) : null}
              {currentLesson.resources?.length ? (
                <section className={`rounded-2xl p-4 ring-1 ${panelClass}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>Tài nguyên</p>
                  <div className="mt-3 grid gap-2">
                    {currentLesson.resources.map((resource) => (
                      <Link
                        className="rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-bold text-white/82 hover:bg-white/12"
                        href={resource.url}
                        key={`${resource.title}-${resource.url}`}
                        target="_blank"
                      >
                        {resource.title}
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          <aside className={`max-h-[calc(100vh-96px)] overflow-y-auto rounded-2xl p-4 ring-1 ${panelClass}`}>
            <p className="ai-kicker">Danh sách bài học</p>
            <div className="mt-4 grid gap-3">
              {lessons.map((lesson, index) => {
                const isActive = lesson.id === currentLesson.id;
                const itemThumbnail = toYouTubeThumbnailUrl(lesson.youtubeUrl);

                return (
                  <Link
                    key={lesson.id}
                    className={`grid grid-cols-[92px_1fr] gap-3 rounded-xl p-2 text-sm ${
                      isActive
                        ? "bg-[#159cfb] text-white"
                        : "bg-white/5 text-white/78 hover:bg-white/10"
                    }`}
                    href={getLessonHref(course.slug, lesson.id)}
                  >
                    <span className="relative overflow-hidden rounded-lg bg-black">
                      {itemThumbnail ? (
                        <span
                          aria-label={cleanLessonTitle(lesson.title)}
                          className="block aspect-video bg-cover bg-center"
                          role="img"
                          style={{ backgroundImage: `url(${itemThumbnail})` }}
                        />
                      ) : (
                        <span className="block aspect-video bg-black/20" />
                      )}
                      <span className="absolute right-1 top-1 rounded bg-black/72 px-1.5 py-0.5 text-[10px] font-black text-white">
                        {index + 1}
                      </span>
                    </span>
                    <span>
                      <span className="line-clamp-2 font-semibold leading-5">
                        {cleanLessonTitle(lesson.title)}
                      </span>
                      <span className={`mt-1 block text-xs font-semibold ${isActive ? "text-white/72" : mutedText}`}>
                        {getAccessLabel(lesson.access)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <nav className="learning-mobile-action" aria-label="Hành động học nhanh trên điện thoại">
        <Link href="/dashboard">Dashboard</Link>
        {previousLesson ? (
          <Link href={getLessonHref(course.slug, previousLesson.id)}>Bài trước</Link>
        ) : null}
        {nextLesson ? (
          <Link href={getLessonHref(course.slug, nextLesson.id)}>Bài tiếp</Link>
        ) : (
          <Link href="/dashboard">Hoàn thành</Link>
        )}
      </nav>
    </main>
  );
}
