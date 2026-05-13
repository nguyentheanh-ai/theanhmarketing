"use client";

import { useMemo, useRef, useState } from "react";
import { SoftCard } from "@/components/ui/soft-card";
import type { Course, CourseStatus, LessonAccess } from "@/data/courses";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

const storageKey = "tam-admin-courses";

function toDbLessonAccess(access: LessonAccess) {
  if (access === "free") {
    return "free_preview";
  }

  if (access === "paid") {
    return "enrolled_only";
  }

  return "locked";
}

function toDatabasePrice(value: string) {
  if (!value.trim()) {
    return null;
  }

  const numericValue = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
}

function toDatabasePriceText(value: string) {
  return value.trim() || null;
}

function serializeLessonResources(resources: Course["modules"][number]["lessons"][number]["resources"] = []) {
  return resources.map((resource) => `${resource.title}|${resource.url}`).join("\n");
}

function parseLessonResources(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...urlParts] = line.split("|");
      return {
        title: title.trim(),
        url: (urlParts.join("|") || "/tai-lieu").trim(),
      };
    });
}

type CourseEditorProps = {
  initialCourses: Course[];
};

export function CourseEditor({ initialCourses }: CourseEditorProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<Course[]>(() => {
    if (typeof window === "undefined") {
      return initialCourses;
    }

    const cached = window.localStorage.getItem(storageKey);
    if (!cached) {
      return initialCourses;
    }

    try {
      const parsed = JSON.parse(cached) as Course[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialCourses;
    } catch {
      return initialCourses;
    }
  });
  const [selectedSlug, setSelectedSlug] = useState(courses[0]?.slug ?? "");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");

  const selectedCourse = useMemo(
    () => courses.find((course) => course.slug === selectedSlug) ?? courses[0],
    [courses, selectedSlug],
  );

  function persist(nextCourses: Course[]) {
    setCourses(nextCourses);
    window.localStorage.setItem(storageKey, JSON.stringify(nextCourses));
  }

  function exportCourses() {
    const blob = new Blob([JSON.stringify(courses, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `the-anh-courses-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    setNotice("Đã xuất file JSON khóa học.");
  }

  function importCourses(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Course[];

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("Invalid course list");
        }

        persist(parsed);
        setSelectedSlug(parsed[0]?.slug ?? "");
        setNotice("Đã nhập dữ liệu khóa học vào local CMS.");
      } catch {
        setNotice("File không đúng định dạng. Vui lòng nhập JSON courses đã xuất từ admin.");
      } finally {
        if (importInputRef.current) {
          importInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  }

  function resetCourses() {
    if (!window.confirm("Khôi phục dữ liệu khóa học mặc định và xóa bản local hiện tại?")) {
      return;
    }

    persist(initialCourses);
    setSelectedSlug(initialCourses[0]?.slug ?? "");
    setExpandedModules({});
    setNotice("Đã khôi phục dữ liệu khóa học mặc định.");
  }

  function addCourse() {
    const baseCourse = initialCourses[0];
    if (!baseCourse) {
      return;
    }

    const slug = `khoa-hoc-moi-${Date.now()}`;
    const nextCourse: Course = {
      ...baseCourse,
      slug,
      title: "Khóa học mới",
      eyebrow: "Khóa học",
      description: "Mô tả khóa học mới",
      shortDescription: "Mô tả ngắn",
      price: "0đ",
      originalPrice: "",
      status: "coming-soon",
      statusLabel: "Sắp ra mắt",
      ctaText: "Nhận thông báo",
      duration: "0 giờ",
      level: "Người mới",
      updatedAt: new Date().toLocaleDateString("vi-VN"),
      bannerImageUrl: "",
      thumbnailImageUrl: "",
      videoPreviewUrl: "",
      videoPreviewEmbedUrl: "",
      modules: [],
      relatedSlugs: [],
    };

    const nextCourses = [nextCourse, ...courses];
    persist(nextCourses);
    setSelectedSlug(slug);
    setNotice("Đã tạo khóa học mới trong local CMS. Bấm Lưu Supabase để ghi vào database.");
  }

  async function saveSelectedCourseToSupabase() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setNotice("Thiếu biến môi trường Supabase. Dữ liệu vẫn được lưu local.");
      return;
    }

    const coursePayload = {
          title: selectedCourse.title,
          slug: selectedCourse.slug,
          short_description: selectedCourse.shortDescription,
          description: selectedCourse.description,
          price: toDatabasePrice(selectedCourse.price),
          original_price: toDatabasePrice(selectedCourse.originalPrice),
          status: selectedCourse.status,
          duration: selectedCourse.duration,
          lesson_count: selectedCourse.modules.reduce(
            (total, courseModule) => total + courseModule.lessons.length,
            0,
          ),
          level: selectedCourse.level,
          updated_at: selectedCourse.updatedAt,
          banner_image: selectedCourse.bannerImageUrl,
          thumbnail_image: selectedCourse.thumbnailImageUrl,
          preview_video_url: selectedCourse.videoPreviewUrl,
          cta_text: selectedCourse.ctaText,
        };

    let { data: savedCourse, error: courseError } = await supabase
      .from("courses")
      .upsert(coursePayload, { onConflict: "slug" })
      .select("id")
      .single();

    if (courseError) {
      const textPricePayload = {
        ...coursePayload,
        price: toDatabasePriceText(selectedCourse.price),
        original_price: toDatabasePriceText(selectedCourse.originalPrice),
      };
      const retryResult = await supabase
        .from("courses")
        .upsert(textPricePayload, { onConflict: "slug" })
        .select("id")
        .single();

      savedCourse = retryResult.data;
      courseError = retryResult.error;
    }

    if (courseError || !savedCourse) {
      setNotice(`Không lưu được khóa học lên Supabase. Local vẫn an toàn. ${courseError?.message ?? ""}`);
      return;
    }

    const courseId = savedCourse.id as string;
    await supabase.from("course_modules").delete().eq("course_id", courseId);

    for (const courseModule of selectedCourse.modules) {
      const { data: savedModule, error: moduleError } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          title: courseModule.title,
          description: courseModule.description,
          sort_order: courseModule.order,
        })
        .select("id")
        .single();

      if (moduleError || !savedModule) {
        setNotice(`Khóa học đã lưu, nhưng module bị lỗi: ${moduleError?.message ?? ""}`);
        return;
      }

      if (courseModule.lessons.length > 0) {
        const { data: savedLessons, error: lessonError } = await supabase.from("lessons").insert(
          courseModule.lessons.map((lesson) => ({
            module_id: savedModule.id,
            title: lesson.title,
            description: "",
            duration: lesson.duration,
            youtube_url: lesson.youtubeUrl,
            embed_url: lesson.embedUrl || toYouTubeEmbedUrl(lesson.youtubeUrl),
            access_type: toDbLessonAccess(lesson.access),
            sort_order: lesson.order,
          })),
        ).select("id");

        if (lessonError) {
          setNotice(`Module đã lưu, nhưng bài học bị lỗi: ${lessonError.message}`);
          return;
        }

        const lessonResources = courseModule.lessons
          .flatMap((lesson, index) =>
            (lesson.resources ?? []).map((resource) => ({
              lesson_id: String(savedLessons?.[index]?.id ?? ""),
              title: resource.title,
              url: resource.url,
            })),
          )
          .filter((resource) => resource.lesson_id);

        if (lessonResources.length > 0) {
          await supabase.from("lesson_resources").insert(lessonResources);
        }
      }
    }

    setNotice("Đã lưu khóa học, module và bài học lên Supabase.");
  }

  async function deleteSelectedCourseFromSupabase() {
    if (!window.confirm(`Xóa khóa học "${selectedCourse.title}" khỏi local CMS và Supabase?`)) {
      return;
    }

    const nextCourses = courses.filter((course) => course.slug !== selectedCourse.slug);
    persist(nextCourses);
    setSelectedSlug(nextCourses[0]?.slug ?? "");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice("Đã xóa khỏi local CMS. Supabase chưa được cấu hình.");
      return;
    }

    const { error } = await supabase.from("courses").delete().eq("slug", selectedCourse.slug);

    if (error) {
      setNotice(`Đã xóa local, nhưng Supabase báo lỗi: ${error.message}`);
      return;
    }

    setNotice("Đã xóa khóa học khỏi Supabase.");
  }

  function updateCourse(field: keyof Course, value: string) {
    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              [field]: field === "status" ? (value as CourseStatus) : value,
            }
          : course,
      ),
    );
  }

  function updatePreviewUrl(value: string) {
    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              videoPreviewUrl: value,
              videoPreviewEmbedUrl: toYouTubeEmbedUrl(value),
            }
          : course,
      ),
    );
  }

  function updateModule(
    moduleId: string,
    field: "title" | "description" | "order",
    value: string,
  ) {
    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              modules: course.modules.map((module) =>
                module.id === moduleId
                  ? {
                      ...module,
                      [field]: field === "order" ? Number(value) : value,
                    }
                  : module,
              ),
            }
          : course,
      ),
    );
  }

  function updateLesson(
    moduleId: string,
    lessonId: string,
    field: "title" | "duration" | "order" | "youtubeUrl" | "access" | "resources" | "allowComments",
    value: string,
  ) {
    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              modules: course.modules.map((module) =>
                module.id === moduleId
                  ? {
                      ...module,
                      lessons: module.lessons.map((lesson) =>
                        lesson.id === lessonId
                          ? {
                              ...lesson,
                              [field]:
                                field === "order"
                                  ? Number(value)
                                  : field === "resources"
                                    ? parseLessonResources(value)
                                    : field === "allowComments"
                                      ? value === "true"
                                  : field === "access"
                                    ? (value as LessonAccess)
                                    : value,
                              embedUrl:
                                field === "youtubeUrl"
                                  ? toYouTubeEmbedUrl(value)
                                  : lesson.embedUrl,
                            }
                          : lesson,
                      ),
                    }
                  : module,
              ),
            }
          : course,
      ),
    );
  }

  function addModule() {
    const id = `module-${Date.now()}`;
    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              modules: [
                ...course.modules,
                {
                  id,
                  title: "Module mới",
                  description: "Mô tả module",
                  order: course.modules.length + 1,
                  lessons: [],
                },
              ],
            }
          : course,
      ),
    );
    setExpandedModules((current) => ({ ...current, [id]: true }));
  }

  function deleteModule(moduleId: string) {
    const courseModule = selectedCourse.modules.find((item) => item.id === moduleId);

    if (!courseModule || !window.confirm(`Xóa module "${courseModule.title}" và toàn bộ bài học bên trong?`)) {
      return;
    }

    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              modules: course.modules.filter((item) => item.id !== moduleId),
            }
          : course,
      ),
    );
  }

  function addLesson(moduleId: string) {
    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              modules: course.modules.map((module) =>
                module.id === moduleId
                  ? {
                      ...module,
                      lessons: [
                        ...module.lessons,
                        {
                          id: `lesson-${Date.now()}`,
                          title: "Bài học mới",
                          duration: "10 phút",
                          order: module.lessons.length + 1,
                          youtubeUrl: "",
                          embedUrl: "",
                          access: "locked",
                          resources: [],
                          allowComments: true,
                        },
                      ],
                    }
                  : module,
              ),
            }
          : course,
      ),
    );
    setExpandedModules((current) => ({ ...current, [moduleId]: true }));
  }

  function deleteLesson(moduleId: string, lessonId: string) {
    const courseModule = selectedCourse.modules.find((item) => item.id === moduleId);
    const lesson = courseModule?.lessons.find((item) => item.id === lessonId);

    if (!lesson || !window.confirm(`Xóa bài học "${lesson.title}"?`)) {
      return;
    }

    persist(
      courses.map((course) =>
        course.slug === selectedCourse.slug
          ? {
              ...course,
              modules: course.modules.map((item) =>
                item.id === moduleId
                  ? {
                      ...item,
                      lessons: item.lessons.filter(
                        (currentLesson) => currentLesson.id !== lessonId,
                      ),
                    }
                  : item,
              ),
            }
          : course,
      ),
    );
  }

  function toggleModule(moduleId: string) {
    setExpandedModules((current) => ({
      ...current,
      [moduleId]: !(current[moduleId] ?? true),
    }));
  }

  if (!selectedCourse) {
    return null;
  }

  return (
    <div className="grid gap-5">
      <SoftCard>
        <p className="text-sm font-semibold text-[#c77b20]">Chọn khóa học</p>
        <select
          className="mt-4 min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4"
          value={selectedCourse.slug}
          onChange={(event) => setSelectedSlug(event.target.value)}
        >
          {courses.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.title}
            </option>
          ))}
        </select>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white"
            type="button"
            onClick={addCourse}
          >
            Thêm khóa học
          </button>
          <button
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold"
            type="button"
            onClick={saveSelectedCourseToSupabase}
          >
            Lưu Supabase
          </button>
          <button
            className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700"
            type="button"
            onClick={deleteSelectedCourseFromSupabase}
          >
            Xóa khóa học
          </button>
          <button
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold"
            type="button"
            onClick={exportCourses}
          >
            Xuất JSON
          </button>
          <button
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            Nhập JSON
          </button>
          <button
            className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700"
            type="button"
            onClick={resetCourses}
          >
            Khôi phục mặc định
          </button>
          <input
            ref={importInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => importCourses(event.target.files?.[0])}
          />
        </div>
        {notice ? <p className="mt-3 text-sm font-semibold text-black/55">{notice}</p> : null}
      </SoftCard>

      <SoftCard>
        <p className="text-sm font-semibold text-[#c77b20]">Thông tin khóa học</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.title} onChange={(e) => updateCourse("title", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.slug} onChange={(e) => updateCourse("slug", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.price} onChange={(e) => updateCourse("price", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.originalPrice} onChange={(e) => updateCourse("originalPrice", e.target.value)} />
          <select className="min-h-12 rounded-2xl border border-black/10 bg-white px-4" value={selectedCourse.status} onChange={(e) => updateCourse("status", e.target.value)}>
            <option value="open">Đang mở</option>
            <option value="coming-soon">Sắp ra mắt</option>
            <option value="closed">Đã đóng</option>
          </select>
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.statusLabel} onChange={(e) => updateCourse("statusLabel", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.ctaText} onChange={(e) => updateCourse("ctaText", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.duration} onChange={(e) => updateCourse("duration", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.level} onChange={(e) => updateCourse("level", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={selectedCourse.updatedAt} onChange={(e) => updateCourse("updatedAt", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" placeholder="Banner image URL cho trang chi tiết" value={selectedCourse.bannerImageUrl} onChange={(e) => updateCourse("bannerImageUrl", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4" placeholder="Thumbnail image URL cho card khóa học" value={selectedCourse.thumbnailImageUrl} onChange={(e) => updateCourse("thumbnailImageUrl", e.target.value)} />
          <input className="min-h-12 rounded-2xl border border-black/10 px-4 md:col-span-2" placeholder="YouTube preview URL" value={selectedCourse.videoPreviewUrl} onChange={(e) => updatePreviewUrl(e.target.value)} />
        </div>
        <textarea className="mt-4 min-h-28 w-full rounded-2xl border border-black/10 p-4" value={selectedCourse.description} onChange={(e) => updateCourse("description", e.target.value)} />
        {selectedCourse.thumbnailImageUrl || selectedCourse.bannerImageUrl ? (
          <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
            <div
              className="min-h-32 rounded-2xl bg-[#f2eadf] bg-cover bg-center"
              style={{
                backgroundImage: `url(${selectedCourse.thumbnailImageUrl || selectedCourse.bannerImageUrl})`,
              }}
              aria-label="Thumbnail khóa học đang chọn"
            />
            <div>
              <p className="text-sm font-bold text-black">Thumbnail đang chọn</p>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Ảnh này sẽ hiển thị trên card ở trang `/khoa-hoc`. Banner vẫn dùng cho
                phần hero/trang chi tiết khóa học.
              </p>
            </div>
          </div>
        ) : null}
        {selectedCourse.videoPreviewEmbedUrl ? (
          <div className="mt-5 overflow-hidden rounded-2xl bg-black">
            <iframe className="aspect-video w-full" src={selectedCourse.videoPreviewEmbedUrl} title={selectedCourse.title} />
          </div>
        ) : null}
      </SoftCard>

      <SoftCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#c77b20]">Module & bài học</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Quản lý curriculum</h2>
          </div>
          <button className="rounded-full bg-black px-5 py-3 text-sm font-bold text-white" type="button" onClick={addModule}>
            Thêm module
          </button>
        </div>
        <div className="mt-6 grid gap-5">
          {selectedCourse.modules
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((module) => {
              const isExpanded = expandedModules[module.id] ?? true;

              return (
                <div key={module.id} className="rounded-3xl border border-black/10 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <button
                      aria-expanded={isExpanded}
                      className="flex items-center gap-3 text-left text-sm font-bold text-black"
                      type="button"
                      onClick={() => toggleModule(module.id)}
                    >
                      <span className={`inline-block transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                        →
                      </span>
                      <span>
                        {isExpanded ? "Thu gọn bài học" : "Show bài học"} · {module.lessons.length} bài
                      </span>
                    </button>
                    <button
                      className="w-fit rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                      type="button"
                      onClick={() => deleteModule(module.id)}
                    >
                      Xóa module
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[90px_1fr]">
                    <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={module.order} onChange={(e) => updateModule(module.id, "order", e.target.value)} />
                    <input className="min-h-12 rounded-2xl border border-black/10 px-4" value={module.title} onChange={(e) => updateModule(module.id, "title", e.target.value)} />
                  </div>
                  <textarea className="mt-4 min-h-20 w-full rounded-2xl border border-black/10 p-4" value={module.description} onChange={(e) => updateModule(module.id, "description", e.target.value)} />

                  {isExpanded ? (
                    <>
                      <div className="mt-5 grid gap-3">
                        {module.lessons
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((lesson) => (
                            <div key={lesson.id} className="grid gap-3 rounded-2xl bg-[#f7f3ec] p-4">
                              <div className="grid gap-3 md:grid-cols-[70px_1fr_120px_1fr_220px]">
                              <input className="min-h-11 rounded-xl border border-black/10 px-3" value={lesson.order} onChange={(e) => updateLesson(module.id, lesson.id, "order", e.target.value)} />
                              <input className="min-h-11 rounded-xl border border-black/10 px-3" value={lesson.title} onChange={(e) => updateLesson(module.id, lesson.id, "title", e.target.value)} />
                              <input className="min-h-11 rounded-xl border border-black/10 px-3" value={lesson.duration} onChange={(e) => updateLesson(module.id, lesson.id, "duration", e.target.value)} />
                              <input className="min-h-11 rounded-xl border border-black/10 px-3" placeholder="YouTube URL" value={lesson.youtubeUrl} onChange={(e) => updateLesson(module.id, lesson.id, "youtubeUrl", e.target.value)} />
                              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                <select className="min-h-11 rounded-xl border border-black/10 bg-white px-3" value={lesson.access} onChange={(e) => updateLesson(module.id, lesson.id, "access", e.target.value)}>
                                  <option value="free">Học thử miễn phí</option>
                                  <option value="paid">Chỉ học viên đã mua</option>
                                  <option value="locked">Khóa</option>
                                </select>
                                <button
                                  className="rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700"
                                  type="button"
                                  onClick={() => deleteLesson(module.id, lesson.id)}
                                >
                                  Xóa
                                </button>
                              </div>
                              </div>
                              <textarea
                                className="min-h-20 rounded-xl border border-black/10 p-3 text-sm"
                                placeholder={"Tài liệu bài học, mỗi dòng: Tên tài liệu|https://link"}
                                value={serializeLessonResources(lesson.resources)}
                                onChange={(e) => updateLesson(module.id, lesson.id, "resources", e.target.value)}
                              />
                              <label className="flex items-center gap-2 text-sm font-semibold text-black/60">
                                <input
                                  checked={lesson.allowComments ?? true}
                                  type="checkbox"
                                  onChange={(e) => updateLesson(module.id, lesson.id, "allowComments", String(e.target.checked))}
                                />
                                Cho phép học viên comment/hỏi ở bài này
                              </label>
                            </div>
                          ))}
                      </div>
                      <button className="mt-4 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold" type="button" onClick={() => addLesson(module.id)}>
                        Thêm bài học
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
        </div>
      </SoftCard>
    </div>
  );
}
