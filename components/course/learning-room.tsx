"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LessonLink } from "./lesson-link";
import styles from "./learning-room.module.css";
import { useEffect, useRef, useState } from "react";
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
  course: Pick<Course, "slug" | "title">;
  currentLesson: LearningLesson;
  currentLessonCompleted?: boolean;
  lessons: Pick<LearningLesson, "id" | "title" | "access" | "youtubeUrl">[];
  previousLesson?: Pick<LearningLesson, "id">;
  nextLesson?: Pick<LearningLesson, "id">;
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
  const router = useRouter();
  const lessonListRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const list = lessonListRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (list && active) list.scrollTop += active.getBoundingClientRect().top - list.getBoundingClientRect().top - 64;
  }, [currentLesson.id]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(currentLessonCompleted);
  const [progressMessage, setProgressMessage] = useState("");
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const canWatchVideo = Boolean(currentLesson.embedUrl);
  const thumbnailUrl = toYouTubeThumbnailUrl(currentLesson.youtubeUrl);
  const shellClass = "ai-os-bg ai-grid text-white";
  const panelClass = "ai-panel text-white";
  const mutedText = "text-white/62";
  const subtlePanel = "border border-white/10 bg-white/8 text-white/72";

  async function updateProgress() {
    if (isSavingProgress || isCompleted) return;
    setIsSavingProgress(true);
    setProgressMessage("");
    try {
      const response = await fetch("/api/student/progress", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
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
      router.refresh(); // Drop prefetched progress snapshots after a successful save.
      setProgressMessage(`Đã lưu tiến độ ${result.progressPercent ?? 0}%.`);
    } catch (error) {
      setProgressMessage(error instanceof Error ? error.message : "Không cập nhật được tiến độ.");
    } finally {
      setIsSavingProgress(false);
    }
  }

  return (
    <main className={`${styles.room} min-h-screen ${shellClass}`}>
      <aside
        inert={!isSidebarVisible}
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
          {course.slug === "bo-agent-kit-x10-hieu-suat-cong-viec" && <Link className="rounded-xl bg-white/10 px-4 py-3 text-white" prefetch={false} href="/learn/bo-agent-kit-x10-hieu-suat-cong-viec/agents">Thư viện Agent · Tải xuống</Link>}
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
        <header className={`${styles.header} sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[#77d7ff]/15 bg-[#05080d]/78 px-5 pl-20 backdrop-blur-xl lg:px-6 lg:pl-20`}>
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>Đang học</p>
            <p className={styles.courseTitle}>{course.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-black"
              href="/dashboard"
            >
              Khóa học
            </Link>
          </div>
        </header>

        <div className={`${styles.layout} grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_350px] lg:p-6`}>
          <div className={styles.mainColumn}>
            <div id="lesson-player" className={styles.player}>
              {canWatchVideo && isVideoLoading ? <span className={styles.videoLoading} role="status">Đang tải video…</span> : null}
              {canWatchVideo ? (
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-video w-full bg-black"
                  onLoad={() => setIsVideoLoading(false)}
                  referrerPolicy="strict-origin-when-cross-origin"
                  src={currentLesson.embedUrl.includes("youtube.com/embed/") ? `${currentLesson.embedUrl}${currentLesson.embedUrl.includes("?") ? "&" : "?"}playsinline=1` : currentLesson.embedUrl}
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

            <a className={styles.jumpToLessons} href="#lesson-list">Danh sách bài học · {lessons.length} bài ↓</a>
            {referencePacks.length ? <details className={styles.references} onToggle={(event) => setIsReferenceOpen(event.currentTarget.open)}>
              <summary>Tài liệu tham khảo và tải xuống</summary>
              {isReferenceOpen ? <CourseReferenceLibrary packs={referencePacks} /> : null}
            </details> : null}

            <div className={`${styles.lessonContent} ${styles.enter} mt-4 grid gap-4`}>
              <section className={`rounded-2xl p-4 ring-1 ${panelClass}`}>
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>
                  Module {currentLesson.moduleOrder}: {currentLesson.moduleTitle}
                </p>
                <h1 className="mt-2 max-w-5xl text-xl font-semibold leading-snug md:text-2xl">
                  {cleanLessonTitle(currentLesson.title)}
                </h1>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    aria-busy={isSavingProgress}
                    className={`${styles.actionButton} ${isCompleted ? styles.completed : ""} rounded-xl px-5 py-3 text-center text-sm font-bold ${isCompleted ? "bg-emerald-400/80 text-white" : "bg-white text-black"}`}
                    disabled={isSavingProgress || isCompleted}
                    onClick={updateProgress}
                    type="button"
                  >
                    {isSavingProgress ? <span className={styles.spinner} aria-hidden="true" /> : null}
                    {isCompleted ? "✓ Đã hoàn thành" : isSavingProgress ? "Đang lưu..." : "Hoàn thành bài học"}
                  </button>
                  {previousLesson ? (
                    <LessonLink
                      className={`rounded-xl px-5 py-3 text-center text-sm font-bold ${subtlePanel}`}
                      prefetch={true} href={getLessonHref(course.slug, previousLesson.id)}
                    >
                      Bài trước
                    </LessonLink>
                  ) : null}
                  {nextLesson ? (
                    <LessonLink
                      className="rounded-xl bg-[#159cfb] px-5 py-3 text-center text-sm font-bold text-white"
                      prefetch={true} href={getLessonHref(course.slug, nextLesson.id)}
                    >
                      Bài tiếp theo
                    </LessonLink>
                  ) : (
                    <Link
                      className="rounded-xl bg-emerald-400/80 px-5 py-3 text-center text-sm font-bold text-white"
                      href="/dashboard"
                    >
                      Hoàn thành khóa học
                    </Link>
                  )}
                </div>
                {progressMessage ? <p role="status" className="mt-3 text-sm font-bold text-white/72">{progressMessage}</p> : null}
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

          <aside ref={lessonListRef} id="lesson-list" tabIndex={-1} className={`${styles.lessonList} rounded-2xl p-3 ring-1 ${panelClass}`}>
            <p className="ai-kicker">Danh sách bài học</p>
            <div className="mt-4 grid gap-3">
              {lessons.map((lesson, index) => {
                const isActive = lesson.id === currentLesson.id;
                const itemThumbnail = toYouTubeThumbnailUrl(lesson.youtubeUrl);

                return (
                  <LessonLink
                    key={lesson.id}
                    aria-current={isActive ? "page" : undefined}
                    className={`grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-xl p-2 text-sm ${
                      isActive
                        ? "bg-[#159cfb] text-white"
                        : "bg-white/5 text-white/78 hover:bg-white/10"
                    }`}
                    prefetch={false} href={getLessonHref(course.slug, lesson.id)}
                  >
                    <span className="relative overflow-hidden rounded-lg bg-black">
                      {itemThumbnail ? (
                        // Native lazy images avoid downloading every thumbnail before the video.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" src={itemThumbnail} width={160} height={90} loading="lazy" decoding="async" className="block aspect-video w-full object-cover" />
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
                  </LessonLink>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      <nav className={styles.mobileActions} aria-label="Hành động học nhanh trên điện thoại">
        <a href="#lesson-list">Bài học</a>
        {previousLesson ? (
          <LessonLink prefetch={true} href={getLessonHref(course.slug, previousLesson.id)}>Bài trước</LessonLink>
        ) : null}
        {nextLesson ? (
          <LessonLink prefetch={true} href={getLessonHref(course.slug, nextLesson.id)}>Bài tiếp</LessonLink>
        ) : (
          <Link href="/dashboard">Hoàn thành</Link>
        )}
      </nav>
    </main>
  );
}
