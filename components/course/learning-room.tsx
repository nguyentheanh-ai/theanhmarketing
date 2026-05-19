"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/site/brand-mark";
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
  lessons: LearningLesson[];
  previousLesson?: LearningLesson;
  nextLesson?: LearningLesson;
};

function getLessonHref(courseSlug: string, lessonId: string) {
  return `/learn/${courseSlug}/${lessonId}`;
}

function getAccessLabel(access: CourseLesson["access"]) {
  return access === "free" ? "Miễn phí" : "Premium";
}

function getModuleGroups(lessons: LearningLesson[]) {
  const groups = new Map<string, LearningLesson[]>();

  for (const lesson of lessons) {
    const key = `${lesson.moduleOrder}-${lesson.moduleTitle}`;
    groups.set(key, [...(groups.get(key) ?? []), lesson]);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    moduleOrder: items[0]?.moduleOrder ?? 1,
    title: items[0]?.moduleTitle ?? "Module",
    lessons: items,
  }));
}

export function LearningRoom({
  course,
  currentLesson,
  lessons,
  nextLesson,
  previousLesson,
}: LearningRoomProps) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const moduleGroups = useMemo(() => getModuleGroups(lessons), [lessons]);
  const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLesson.id);
  const progressPercent =
    lessons.length > 0 ? Math.round(((currentIndex + 1) / lessons.length) * 100) : 0;
  const canWatchVideo = Boolean(currentLesson.embedUrl);
  const thumbnailUrl = toYouTubeThumbnailUrl(currentLesson.youtubeUrl);
  const shellClass = "ai-os-bg ai-grid text-white";
  const panelClass = "ai-panel text-white";
  const mutedText = "text-white/62";
  const subtlePanel = "border border-white/10 bg-white/8 text-white/72";
  const dividerClass = "border-white/10";

  return (
    <main className={`min-h-screen ${shellClass}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-72 border-r p-5 transition-transform lg:flex lg:flex-col ${
          isSidebarVisible ? "translate-x-0" : "-translate-x-full"
        } border-[#77d7ff]/15 bg-[#05080d]/88 backdrop-blur-2xl`}
      >
        <button
          aria-label="Ẩn thanh bên"
          className={`absolute -right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-sm font-black shadow-[0_12px_34px_rgba(0,0,0,0.22)] ${
            "bg-white text-black hover:bg-white/90"
          }`}
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
          <a
            className={`rounded-xl px-4 py-3 ${
              "text-white/68 hover:bg-white/8 hover:text-white"
            }`}
            href="#support"
          >
            Hỗ trợ
          </a>
        </nav>

        <div className="mt-auto grid gap-3">
          <div
            className="flex min-h-12 items-center justify-between rounded-xl border border-[#77d7ff]/18 bg-white/8 px-4 text-sm font-black text-white"
          >
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

      {!isSidebarVisible ? (
        <button
          aria-label="Hiện thanh bên"
          className={`fixed left-4 top-1/2 z-30 hidden size-8 -translate-y-1/2 place-items-center rounded-full text-sm font-black shadow-[0_12px_34px_rgba(0,0,0,0.22)] lg:grid ${
            "bg-white text-black hover:bg-white/90"
          }`}
          type="button"
          onClick={() => setIsSidebarVisible(true)}
        >
          {">"}
        </button>
      ) : null}

      <section className={isSidebarVisible ? "transition-[margin] lg:ml-72" : "transition-[margin]"}>
        <header
          className={`sticky top-0 z-20 flex min-h-16 items-center justify-between border-b px-5 backdrop-blur-xl lg:px-6 ${
            "border-[#77d7ff]/15 bg-[#05080d]/78"
          }`}
        >
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>Đang học</p>
            <p className="font-bold">{course.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-black lg:hidden ${
                "bg-[#159cfb] text-white"
              }`}
            >
              OS
            </span>
            <Link
              className={`rounded-full px-4 py-2 text-sm font-black ${
                "bg-white text-black"
              }`}
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-6">
          <div className="min-w-0">
            <div
              className="overflow-hidden rounded-xl border border-[#77d7ff]/15 shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
            >
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

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_280px]">
              <section className={`rounded-2xl p-4 ring-1 ${panelClass}`}>
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>
                  Module {currentLesson.moduleOrder}: {currentLesson.moduleTitle}
                </p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
                  {cleanLessonTitle(currentLesson.title)}
                </h1>
                <div className={`mt-4 grid gap-2 text-xs font-semibold ${mutedText} sm:grid-cols-3`}>
                  <span className={`rounded-lg px-3 py-2 ${subtlePanel}`}>
                    {getAccessLabel(currentLesson.access)}
                  </span>
                  <span className={`rounded-lg px-3 py-2 ${subtlePanel}`}>{currentLesson.duration}</span>
                  <span className={`rounded-lg px-3 py-2 ${subtlePanel}`}>Tiến độ {progressPercent}%</span>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
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
              </section>

              <aside className="grid gap-4">
                <section id="support" className={`rounded-2xl p-5 ring-1 ${panelClass}`}>
                  <p className="ai-kicker">Hỗ trợ học viên</p>
                  <p className={`mt-3 text-sm leading-6 ${mutedText}`}>
                    Cần hỏi về bài học, tài khoản hoặc chiến dịch đang chạy?
                  </p>
                  <div className="mt-4 grid gap-2">
                    <a
                      className="rounded-xl bg-[#159cfb] px-4 py-3 text-center text-sm font-black text-white"
                      href={siteConfig.emailHref}
                    >
                      Gửi email hỗ trợ
                    </a>
                    <a
                      className={`rounded-xl px-4 py-3 text-center text-sm font-black ${subtlePanel}`}
                      href={siteConfig.phoneHref}
                    >
                      Zalo/Hotline {siteConfig.phone}
                    </a>
                  </div>
                </section>
              </aside>
            </div>
          </div>

          <aside className={`max-h-[calc(100vh-96px)] overflow-y-auto rounded-2xl p-4 ring-1 ${panelClass}`}>
            <p className="ai-kicker">Danh sách bài học</p>
            <div className="mt-4 grid gap-6">
              {moduleGroups.map((module) => (
                <section className={`border-t pt-4 first:border-t-0 first:pt-0 ${dividerClass}`} key={module.key}>
                  <p className="text-base font-bold leading-6">{module.title}</p>
                  <div className="mt-3 grid gap-3">
                    {module.lessons.map((lesson, index) => {
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
                              {getAccessLabel(lesson.access)} · {lesson.duration}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
