"use client";

import { useMemo, useRef, useState } from "react";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Button } from "@/components/ui/button";
import type { Course, CourseStatus, LessonAccess } from "@/data/courses";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadMediaFile } from "@/lib/supabase/media-upload";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

const storageKey = "tam-admin-courses";

function toDbLessonAccess(access: LessonAccess) {
  if (access === "free") {
    return "free_preview";
  }

  if (access === "paid") {
    return "enrolled_only";
  }

  return "enrolled_only";
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

type CourseEditorPanel = "overview" | "media" | "content";

const fieldClass =
  "min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400";

const textareaClass =
  "min-h-24 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-blue-400";

const panelOptions = [
  { id: "overview", label: "Tổng quan" },
  { id: "media", label: "Media" },
  { id: "content", label: "Nội dung" },
] satisfies Array<{ id: CourseEditorPanel; label: string }>;

function getCourseStats(course: Course) {
  const lessonCount = course.modules.reduce((total, courseModule) => total + courseModule.lessons.length, 0);
  const freeLessonCount = course.modules.reduce(
    (total, courseModule) => total + courseModule.lessons.filter((lesson) => lesson.access === "free").length,
    0,
  );

  return {
    moduleCount: course.modules.length,
    lessonCount,
    freeLessonCount,
  };
}

function statusBadgeClass(status: CourseStatus) {
  if (status === "open") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "coming-soon") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

export function CourseEditor({ initialCourses }: CourseEditorProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedSlug, setSelectedSlug] = useState(initialCourses[0]?.slug ?? "");
  const [courseSearch, setCourseSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const [editorMode, setEditorMode] = useState<"list" | "edit">("list");
  const [activePanel, setActivePanel] = useState<CourseEditorPanel>("overview");
  const [draggedSlug, setDraggedSlug] = useState("");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<"banner" | "thumbnail" | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.slug === selectedSlug) ?? courses[0],
    [courses, selectedSlug],
  );
  const selectedCourseIndex = useMemo(
    () => courses.findIndex((course) => course.slug === selectedSlug),
    [courses, selectedSlug],
  );
  const selectedStats = useMemo(
    () => (selectedCourse ? getCourseStats(selectedCourse) : { moduleCount: 0, lessonCount: 0, freeLessonCount: 0 }),
    [selectedCourse],
  );
  const filteredCourses = useMemo(() => {
    const keyword = courseSearch.trim().toLowerCase();

    return courses.filter((course) => {
      const stats = getCourseStats(course);
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;
      const matchesSearch =
        !keyword ||
        [
          course.title,
          course.slug,
          course.statusLabel,
          course.price,
          course.level,
          `${stats.moduleCount} module`,
          `${stats.lessonCount} bài`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [courseSearch, courses, statusFilter]);

  function persist(nextCourses: Course[]) {
    setCourses(nextCourses);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextCourses));
    }
    setHasLocalChanges(true);
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
    setActivePanel("overview");
    setEditorMode("edit");
    setNotice("Đã tạo khóa học mới trong local CMS. Bấm Lưu Supabase để ghi vào database.");
  }

  function openCourseEditor(slug: string) {
    setSelectedSlug(slug);
    setActivePanel("overview");
    setEditorMode("edit");
  }

  function moveCourseBySlug(fromSlug: string, toSlug: string) {
    if (!fromSlug || !toSlug || fromSlug === toSlug) {
      return;
    }

    const fromIndex = courses.findIndex((course) => course.slug === fromSlug);
    const toIndex = courses.findIndex((course) => course.slug === toSlug);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextCourses = courses.slice();
    const [current] = nextCourses.splice(fromIndex, 1);
    nextCourses.splice(toIndex, 0, current);
    persist(nextCourses);
    setNotice("Đã cập nhật thứ tự khóa học. Bấm lưu để đồng bộ Supabase.");
  }

  async function saveSelectedCourseToSupabase() {
    try {
      setIsSaving(true);
      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setNotice("Thiếu biến môi trường Supabase. Dữ liệu vẫn được lưu local.");
        setIsSaving(false);
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
            sort_order: selectedCourseIndex >= 0 ? selectedCourseIndex + 1 : null,
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
        setIsSaving(false);
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
          setIsSaving(false);
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
            setIsSaving(false);
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
            const { error: resourceError } = await supabase.from("lesson_resources").insert(lessonResources);

            if (resourceError) {
              setNotice(`Bài học đã lưu, nhưng tài liệu đính kèm bị lỗi: ${resourceError.message}`);
              setIsSaving(false);
              return;
            }
          }
        }
      }

      setNotice("Đã lưu khóa học, module và bài học lên Supabase.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(courses));
      }
      setHasLocalChanges(false);
      setIsSaving(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể kết nối Supabase.";
      setNotice(`Lỗi đăng nhập phiên Supabase hoặc kết nối. Vui lòng đăng nhập lại admin. ${message}`);
      setIsSaving(false);
    }
  }

  const saveButtonLabel = isSaving
    ? "Đang lưu..."
    : hasLocalChanges
      ? "Lưu thay đổi"
      : "Đã lưu local";

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
      setIsSaving(false);
      return;
    }

    try {
      const { error } = await supabase.from("courses").delete().eq("slug", selectedCourse.slug);

      if (error) {
        setNotice(`Đã xóa local, nhưng Supabase báo lỗi: ${error.message}`);
        return;
      }

      setNotice("Đã xóa khóa học khỏi Supabase.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể kết nối Supabase.";
      setNotice(`Đã xóa local, nhưng phiên Supabase lỗi. Vui lòng đăng nhập lại admin. ${message}`);
    }
  }

  function updateCourse(field: keyof Course, value: string) {
    if (field === "slug") {
      persist(
        courses.map((course, index) =>
          index === selectedCourseIndex
            ? {
                ...course,
                slug: value,
              }
            : course,
        ),
      );
      setSelectedSlug(value);
      return;
    }

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

  async function uploadCourseImage(
    field: "bannerImageUrl" | "thumbnailImageUrl",
    file: File | undefined,
  ) {
    if (!file || !selectedCourse) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice("Chưa cấu hình Supabase. Không thể upload ảnh.");
      return;
    }

    const uploadKind = field === "bannerImageUrl" ? "banner" : "thumbnail";
    setUploadingField(uploadKind);
    setNotice("");

    try {
      const url = await uploadMediaFile({
        file,
        folder: `courses/${selectedCourse.slug}/${uploadKind}`,
        supabase,
      });
      updateCourse(field, url);
      setNotice("Đã upload ảnh và cập nhật URL. Bấm lưu để ghi vào Supabase.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không upload được ảnh.");
    } finally {
      setUploadingField(null);
    }
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
                          access: "paid",
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

  if (editorMode === "list") {
    return (
      <div className="grid gap-5">
        {notice ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {notice}
          </div>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-blue-700">Tutor LMS Courses</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Danh sách khóa học</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Flow theo Tutor LMS: quản lý danh sách trước, bấm Edit/Mở phần sửa mới vào Course Builder của từng khóa.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="md" type="button" onClick={addCourse}>
                Thêm khóa học
              </Button>
              <Button size="md" type="button" variant="secondary" onClick={exportCourses}>
                Xuất JSON
              </Button>
              <Button size="md" type="button" variant="secondary" onClick={() => importInputRef.current?.click()}>
                Nhập JSON
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
              <span aria-hidden="true">⌕</span>
              <input
                className="w-full bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Tìm khóa học theo tên, slug, giá, cấp độ"
                type="search"
                value={courseSearch}
                onChange={(event) => setCourseSearch(event.target.value)}
              />
            </label>
            <select
              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CourseStatus | "all")}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Đang mở</option>
              <option value="coming-soon">Sắp ra mắt</option>
              <option value="closed">Đã đóng</option>
            </select>
            <Button size="md" type="button" variant="danger" onClick={resetCourses}>
              Khôi phục
            </Button>
          </div>
          <input
            ref={importInputRef}
            className="hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => importCourses(event.target.files?.[0])}
          />
        </section>

        <section className="grid gap-3">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course, index) => {
              const stats = getCourseStats(course);

              return (
                <article
                  key={`course-module-${course.slug}`}
                  className="rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
                  draggable
                  onDragStart={() => setDraggedSlug(course.slug)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    moveCourseBySlug(draggedSlug, course.slug);
                    setDraggedSlug("");
                  }}
                  onDragEnd={() => setDraggedSlug("")}
                >
                  <div className="grid gap-4 lg:grid-cols-[52px_minmax(0,1fr)_260px_auto] lg:items-center">
                    <button
                      aria-label={`Mở phần sửa ${course.title}`}
                      className="grid size-11 place-items-center rounded-md bg-slate-100 text-sm font-black text-slate-600"
                      type="button"
                      onClick={() => openCourseEditor(course.slug)}
                    >
                      {index + 1}
                    </button>
                    <button className="min-w-0 text-left" type="button" onClick={() => openCourseEditor(course.slug)}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="line-clamp-1 text-base font-black text-slate-950">{course.title}</span>
                        <span className={`rounded border px-2 py-1 text-xs font-black ${statusBadgeClass(course.status)}`}>
                          {course.statusLabel || course.status}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold text-slate-500">{course.slug}</span>
                    </button>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500">
                      <span className="rounded-md bg-slate-50 px-2 py-2">
                        <strong className="block text-sm text-slate-950">{stats.moduleCount}</strong>
                        topic
                      </span>
                      <span className="rounded-md bg-slate-50 px-2 py-2">
                        <strong className="block text-sm text-slate-950">{stats.lessonCount}</strong>
                        lesson
                      </span>
                      <span className="rounded-md bg-slate-50 px-2 py-2">
                        <strong className="block text-sm text-slate-950">{course.price || "0đ"}</strong>
                        giá
                      </span>
                    </div>
                    <Button size="sm" type="button" onClick={() => openCourseEditor(course.slug)}>
                      Mở phần sửa
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">
              Không có khóa phù hợp.
            </p>
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-400">Quản trị dữ liệu</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Kéo thả từng dòng để đổi thứ tự. Mọi thay đổi cần mở khóa học và bấm lưu để đồng bộ Supabase.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5" data-editor-mode={editorMode === "edit" ? "edit" : "list"}>
      <section className="min-w-0">
        <div className="sticky top-[72px] z-20 rounded-md border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <button
                className="mb-3 text-sm font-black text-blue-700 hover:text-blue-800"
                type="button"
                onClick={() => setEditorMode("list")}
              >
                Quay lại danh sách
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-1 text-xs font-black ${statusBadgeClass(selectedCourse.status)}`}>
                  {selectedCourse.statusLabel || selectedCourse.status}
                </span>
                <span className="text-xs font-bold text-slate-500">{selectedStats.moduleCount} topic</span>
                <span className="text-xs font-bold text-slate-500">{selectedStats.lessonCount} lesson</span>
                <span className="text-xs font-bold text-slate-500">{selectedStats.freeLessonCount} free</span>
              </div>
              <h2 className="mt-2 truncate text-2xl font-black text-slate-950">{selectedCourse.title}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">Course Builder · {selectedCourse.slug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="md" type="button" variant="danger" onClick={deleteSelectedCourseFromSupabase}>
                Xóa khóa học
              </Button>
              <Button
                isLoading={isSaving}
                loadingLabel="Đang lưu..."
                size="md"
                type="button"
                variant={hasLocalChanges ? "primary" : "secondary"}
                onClick={saveSelectedCourseToSupabase}
              >
                {saveButtonLabel}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto">
            {panelOptions.map((panel) => (
              <button
                key={panel.id}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-black ${
                  activePanel === panel.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                type="button"
                onClick={() => setActivePanel(panel.id)}
              >
                {panel.label}
              </button>
            ))}
          </div>
        </div>

        {notice ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {notice}
          </div>
        ) : null}

        {activePanel === "overview" ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase text-blue-700">Tổng quan</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Thông tin bán hàng</h3>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Tên khóa học
                <input className={fieldClass} value={selectedCourse.title} onChange={(e) => updateCourse("title", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Slug
                <input className={fieldClass} value={selectedCourse.slug} onChange={(e) => updateCourse("slug", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Giá bán
                <input className={fieldClass} value={selectedCourse.price} onChange={(e) => updateCourse("price", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Giá gốc
                <input className={fieldClass} value={selectedCourse.originalPrice} onChange={(e) => updateCourse("originalPrice", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Trạng thái
                <select className={fieldClass} value={selectedCourse.status} onChange={(e) => updateCourse("status", e.target.value)}>
                  <option value="open">Đang mở</option>
                  <option value="coming-soon">Sắp ra mắt</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Nhãn trạng thái
                <input className={fieldClass} value={selectedCourse.statusLabel} onChange={(e) => updateCourse("statusLabel", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                CTA
                <input className={fieldClass} value={selectedCourse.ctaText} onChange={(e) => updateCourse("ctaText", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Thời lượng
                <input className={fieldClass} value={selectedCourse.duration} onChange={(e) => updateCourse("duration", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Cấp độ
                <input className={fieldClass} value={selectedCourse.level} onChange={(e) => updateCourse("level", e.target.value)} />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-500">
                Cập nhật
                <input className={fieldClass} value={selectedCourse.updatedAt} onChange={(e) => updateCourse("updatedAt", e.target.value)} />
              </label>
            </div>
            <label className="mt-4 grid gap-1 text-xs font-bold text-slate-500">
              Mô tả
              <textarea className={textareaClass} value={selectedCourse.description} onChange={(e) => updateCourse("description", e.target.value)} />
            </label>
          </div>
        ) : null}

        {activePanel === "media" ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase text-blue-700">Media</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Ảnh và video preview</h3>
            </div>
            <label className="mt-5 grid gap-1 text-xs font-bold text-slate-500">
              YouTube preview URL
              <input className={fieldClass} value={selectedCourse.videoPreviewUrl} onChange={(e) => updatePreviewUrl(e.target.value)} />
            </label>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ImageUploadField
            description="Dùng cho hero/trang chi tiết khóa học. Đây là vùng bấm lớn, dễ thao tác hơn input file mặc định."
            isUploading={uploadingField === "banner"}
            label="Banner khóa học"
            uploadLabel="Upload banner"
            value={selectedCourse.bannerImageUrl}
            onFileSelect={(file) => uploadCourseImage("bannerImageUrl", file)}
            onUrlChange={(url) => updateCourse("bannerImageUrl", url)}
          />
          <ImageUploadField
            description="Dùng cho card khóa học ở trang danh sách và trang chủ."
            isUploading={uploadingField === "thumbnail"}
            label="Thumbnail khóa học"
            uploadLabel="Upload thumbnail"
            value={selectedCourse.thumbnailImageUrl}
            onFileSelect={(file) => uploadCourseImage("thumbnailImageUrl", file)}
            onUrlChange={(url) => updateCourse("thumbnailImageUrl", url)}
          />
            </div>
            {selectedCourse.thumbnailImageUrl || selectedCourse.bannerImageUrl ? (
          <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
            <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Thumbnail khóa học đang chọn"
                className="h-full w-full object-contain"
                src={selectedCourse.thumbnailImageUrl || selectedCourse.bannerImageUrl}
              />
            </div>
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
          <div className="mt-5 overflow-hidden rounded-md bg-black">
            <iframe className="aspect-video w-full" src={selectedCourse.videoPreviewEmbedUrl} title={selectedCourse.title} />
          </div>
        ) : null}
          </div>
        ) : null}

        {activePanel === "content" ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p aria-label="Course outline" className="text-xs font-black uppercase text-blue-700">
                  Nội dung khóa học
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Module & bài học</h3>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Theo Tutor LMS Course Builder: Course &gt; Topic &gt; Lesson. Open edX và Canvas cũng tách outline
                  khỏi media/preview để admin không bị quá tải một màn hình.
                </p>
              </div>
              <Button size="md" type="button" onClick={addModule}>
                Thêm module
              </Button>
            </div>

            <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
              <div className="min-w-[1080px]">
                <div className="grid grid-cols-[74px_minmax(240px,1fr)_minmax(260px,1fr)_110px_118px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-500">
                  <span>Thứ tự</span>
                  <span aria-label="Module title">Tên module</span>
                  <span>Mô tả</span>
                  <span>Bài học</span>
                  <span>Thao tác</span>
                </div>

                {selectedCourse.modules.length > 0 ? (
                  selectedCourse.modules
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((module) => {
                      const isExpanded = expandedModules[module.id] ?? true;

                      return (
                        <div key={module.id} className="border-t border-slate-200">
                          <div className="grid grid-cols-[74px_minmax(240px,1fr)_minmax(260px,1fr)_110px_118px] items-start gap-3 bg-white px-4 py-3">
                            <input
                              aria-label="Module order"
                              className={fieldClass}
                              min={1}
                              type="number"
                              value={module.order}
                              onChange={(event) => updateModule(module.id, "order", event.target.value)}
                            />
                            <label className="grid gap-1">
                              <span aria-label="Module title" className="text-[11px] font-black uppercase text-slate-400">
                                Tên module
                              </span>
                              <input
                                className={fieldClass}
                                value={module.title}
                                onChange={(event) => updateModule(module.id, "title", event.target.value)}
                              />
                            </label>
                            <textarea
                              className="min-h-10 rounded-md border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700 outline-none focus:border-blue-400"
                              value={module.description}
                              onChange={(event) => updateModule(module.id, "description", event.target.value)}
                            />
                            <button
                              aria-expanded={isExpanded}
                              className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 hover:bg-slate-100"
                              type="button"
                              onClick={() => toggleModule(module.id)}
                            >
                              {module.lessons.length} bài
                            </button>
                            <Button size="sm" type="button" variant="danger" onClick={() => deleteModule(module.id)}>
                              Xóa
                            </Button>
                          </div>

                          {isExpanded ? (
                            <div className="bg-slate-50 px-4 pb-4">
                              <div className="grid grid-cols-[56px_minmax(240px,1fr)_100px_120px_minmax(220px,1fr)_minmax(220px,1fr)_116px_70px] gap-3 border-t border-slate-200 py-3 text-xs font-black uppercase text-slate-500">
                                <span>#</span>
                                <span aria-label="Lesson title">Tên bài</span>
                                <span>Thời lượng</span>
                                <span>Quyền xem</span>
                                <span>YouTube URL</span>
                                <span>Tài liệu</span>
                                <span>Comment</span>
                                <span></span>
                              </div>

                              {module.lessons
                                .slice()
                                .sort((a, b) => a.order - b.order)
                                .map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    className="grid grid-cols-[56px_minmax(240px,1fr)_100px_120px_minmax(220px,1fr)_minmax(220px,1fr)_116px_70px] items-start gap-3 border-t border-slate-200 py-3"
                                  >
                                    <input
                                      aria-label="Lesson order"
                                      className={fieldClass}
                                      min={1}
                                      type="number"
                                      value={lesson.order}
                                      onChange={(event) => updateLesson(module.id, lesson.id, "order", event.target.value)}
                                    />
                                    <label className="grid gap-1">
                                      <span className="sr-only">Lesson title</span>
                                      <input
                                        className={fieldClass}
                                        value={lesson.title}
                                        onChange={(event) => updateLesson(module.id, lesson.id, "title", event.target.value)}
                                      />
                                    </label>
                                    <input
                                      className={fieldClass}
                                      value={lesson.duration}
                                      onChange={(event) => updateLesson(module.id, lesson.id, "duration", event.target.value)}
                                    />
                                    <select
                                      className={fieldClass}
                                      value={lesson.access}
                                      onChange={(event) => updateLesson(module.id, lesson.id, "access", event.target.value)}
                                    >
                                      <option value="free">Miễn phí</option>
                                      <option value="paid">Premium</option>
                                    </select>
                                    <input
                                      className={fieldClass}
                                      placeholder="https://youtube.com/..."
                                      value={lesson.youtubeUrl}
                                      onChange={(event) => updateLesson(module.id, lesson.id, "youtubeUrl", event.target.value)}
                                    />
                                    <textarea
                                      className="min-h-10 rounded-md border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700 outline-none focus:border-blue-400"
                                      placeholder="Tên tài liệu|https://link"
                                      value={serializeLessonResources(lesson.resources)}
                                      onChange={(event) => updateLesson(module.id, lesson.id, "resources", event.target.value)}
                                    />
                                    <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                                      <input
                                        checked={lesson.allowComments ?? true}
                                        type="checkbox"
                                        onChange={(event) =>
                                          updateLesson(module.id, lesson.id, "allowComments", String(event.target.checked))
                                        }
                                      />
                                      Bật
                                    </label>
                                    <Button size="sm" type="button" variant="danger" onClick={() => deleteLesson(module.id, lesson.id)}>
                                      Xóa
                                    </Button>
                                  </div>
                                ))}

                              <Button
                                aria-label="Add item"
                                className="mt-2"
                                size="sm"
                                type="button"
                                variant="secondary"
                                onClick={() => addLesson(module.id)}
                              >
                                Thêm bài học
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                ) : (
                  <div className="border-t border-slate-200 bg-white px-4 py-8 text-sm font-semibold text-slate-500">
                    Chưa có module. Bấm Thêm module để tạo outline đầu tiên.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
