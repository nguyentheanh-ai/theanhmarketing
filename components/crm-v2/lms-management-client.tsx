"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ExternalLink,
  FileText,
  Layers3,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/crm-v2";
import type {
  AdminLmsSnapshot,
  LmsCourse,
  LmsEnrollment,
  LmsLesson,
  LmsModule,
  LmsPublishStatus,
  LmsResource,
} from "@/lib/lms/types";

type ActionPayload = Record<string, unknown> & { action: string };
type SubmitAction = (payload: ActionPayload, confirmText?: string) => Promise<void>;
type CourseTab = "overview" | "modules" | "lessons" | "students" | "resources" | "settings";

const courseTabs: Array<{ id: CourseTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Tổng quan", icon: BookOpen },
  { id: "modules", label: "Module", icon: Layers3 },
  { id: "lessons", label: "Bài học", icon: FileText },
  { id: "students", label: "Học viên", icon: Users },
  { id: "resources", label: "Tài nguyên", icon: Archive },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const publishStatuses: Array<[LmsPublishStatus, string]> = [
  ["draft", "Nháp"],
  ["published", "Xuất bản"],
  ["archived", "Lưu trữ"],
];

const enrollmentStatuses = [
  ["active", "Đang học"],
  ["paused", "Tạm dừng"],
  ["completed", "Hoàn thành"],
  ["revoked", "Thu quyền"],
] as const;

const lessonTypes = [
  ["video", "Video"],
  ["text", "Text"],
  ["file", "File"],
  ["link", "Link"],
  ["live", "Live"],
] as const;

const accessTypes = [
  ["free_preview", "Xem thử"],
  ["enrolled_only", "Học viên"],
  ["locked", "Khóa"],
] as const;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function slugifyVietnamese(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function inputClass(extra = "") {
  return `min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${extra}`;
}

function textareaClass(extra = "") {
  return `min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${extra}`;
}

function buttonClass(tone: "primary" | "secondary" | "danger" | "ghost" = "secondary") {
  if (tone === "primary") return "bg-slate-950 text-white hover:bg-slate-800";
  if (tone === "danger") return "border border-red-200 bg-white text-red-700 hover:bg-red-50";
  if (tone === "ghost") return "text-slate-600 hover:bg-slate-100";
  return "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-semibold text-slate-400">{hint}</span> : null}
    </label>
  );
}

function ActionButton({
  busy,
  children,
  className = "",
  tone = "secondary",
  type = "button",
  onClick,
}: {
  busy?: boolean;
  children: React.ReactNode;
  className?: string;
  tone?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonClass(tone)} ${className}`}
      disabled={busy}
      onClick={onClick}
      type={type}
    >
      {busy ? "Đang lưu..." : children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "border-emerald-200 bg-emerald-50 text-emerald-700",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    draft: "border-slate-200 bg-slate-50 text-slate-600",
    paused: "border-amber-200 bg-amber-50 text-amber-700",
    completed: "border-blue-200 bg-blue-50 text-blue-700",
    archived: "border-orange-200 bg-orange-50 text-orange-700",
    revoked: "border-red-200 bg-red-50 text-red-700",
    locked: "border-red-200 bg-red-50 text-red-700",
    enrolled_only: "border-violet-200 bg-violet-50 text-violet-700",
    free_preview: "border-blue-200 bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    published: "Published",
    draft: "Draft",
    archived: "Archived",
    active: "Active",
    paused: "Paused",
    completed: "Completed",
    revoked: "Revoked",
    enrolled_only: "Học viên",
    free_preview: "Xem thử",
    locked: "Khóa",
  };
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-black ${map[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 ${className}`}>{children}</section>;
}

function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="text-sm font-black text-slate-900">{title}</div>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ActionMessage({ message }: { message: string }) {
  if (!message) return null;
  return <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{message}</div>;
}

function ModalShell({
  children,
  onClose,
  title,
  subtitle,
  width = "max-w-3xl",
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className={`max-h-[90vh] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ${width}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p> : null}
          </div>
          <button className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={onClose} type="button" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getCourseLessons(course: LmsCourse) {
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })));
}

function getFirstLessonHref(course: LmsCourse) {
  const firstLesson = getCourseLessons(course).find(({ lesson }) => lesson.status === "published")?.lesson ?? getCourseLessons(course)[0]?.lesson;
  return firstLesson ? `/learn/${course.slug}/${firstLesson.id}` : `/khoa-hoc/${course.slug}`;
}

export function CourseLmsManager({
  lmsSnapshot,
  selectedCourseSlug,
  setSelectedCourseSlug,
}: {
  lmsSnapshot: AdminLmsSnapshot;
  selectedCourseSlug: string;
  setSelectedCourseSlug: (value: string) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CourseTab>("overview");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [lessonEditor, setLessonEditor] = useState<{ mode: "create" | "edit"; lesson?: LmsLesson; moduleId?: string } | null>(null);

  const selectedCourse = useMemo(
    () => lmsSnapshot.courses.find((course) => course.slug === selectedCourseSlug) ?? lmsSnapshot.selectedCourse ?? lmsSnapshot.courses[0] ?? null,
    [lmsSnapshot.courses, lmsSnapshot.selectedCourse, selectedCourseSlug],
  );

  const submitAction: SubmitAction = async (payload, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyAction(payload.action);
    setMessage("");
    try {
      const response = await fetch("/api/admin/crm-v2/lms/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; course?: { slug?: string } } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.message ?? "Không lưu được thay đổi LMS.");
      if (result.course?.slug) setSelectedCourseSlug(result.course.slug);
      setMessage(result.message ?? "Đã cập nhật.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được thay đổi LMS.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="LMS" title="Quản lý khóa học" />
      <ActionMessage message={message || lmsSnapshot.message || ""} />
      <div className="grid min-h-[calc(100vh-190px)] min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CourseListPanel
          courses={lmsSnapshot.courses}
          selectedSlug={selectedCourse?.slug ?? ""}
          busy={busyAction === "create_course"}
          onCreate={(payload) => void submitAction(payload)}
          onSelect={(slug) => setSelectedCourseSlug(slug)}
        />
        <div className="min-w-0 space-y-4">
          {selectedCourse ? (
            <>
              <CourseHeader course={selectedCourse} />
              <CourseTabs activeTab={activeTab} onChange={setActiveTab} />
              <Panel className="min-h-[560px]">
                {activeTab === "overview" ? <OverviewTab busy={busyAction === "update_course"} course={selectedCourse} submitAction={submitAction} /> : null}
                {activeTab === "modules" ? (
                  <ModulesTab
                    busyAction={busyAction}
                    course={selectedCourse}
                    submitAction={submitAction}
                    onAddLesson={(moduleId) => {
                      setActiveTab("lessons");
                      setLessonEditor({ mode: "create", moduleId });
                    }}
                  />
                ) : null}
                {activeTab === "lessons" ? (
                  <LessonsTab busyAction={busyAction} course={selectedCourse} onEditLesson={setLessonEditor} submitAction={submitAction} />
                ) : null}
                {activeTab === "students" ? <StudentsTab busyAction={busyAction} course={selectedCourse} submitAction={submitAction} /> : null}
                {activeTab === "resources" ? <ResourcesTab busyAction={busyAction} course={selectedCourse} submitAction={submitAction} /> : null}
                {activeTab === "settings" ? <SettingsTab busyAction={busyAction} course={selectedCourse} submitAction={submitAction} /> : null}
              </Panel>
            </>
          ) : (
            <EmptyState title="Chưa có khóa học" description="Tạo khóa đầu tiên ở cột bên trái để bắt đầu quản lý nội dung LMS." />
          )}
        </div>
      </div>
      {selectedCourse && lessonEditor ? (
        <LessonFormModal
          busy={busyAction === "create_lesson" || busyAction === "update_lesson"}
          course={selectedCourse}
          editor={lessonEditor}
          onClose={() => setLessonEditor(null)}
          submitAction={async (payload) => {
            await submitAction(payload);
            setLessonEditor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CourseListPanel({
  busy,
  courses,
  selectedSlug,
  onCreate,
  onSelect,
}: {
  busy: boolean;
  courses: LmsCourse[];
  selectedSlug: string;
  onCreate: (payload: ActionPayload) => void;
  onSelect: (slug: string) => void;
}) {
  const [search, setSearch] = useState("");
  const visibleCourses = courses.filter((course) => `${course.title} ${course.slug}`.toLowerCase().includes(search.toLowerCase().trim()));
  return (
    <aside className="min-h-0 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-950">Danh sách khóa</div>
            <div className="mt-1 text-xs font-bold text-slate-500">{courses.length} khóa trong LMS</div>
          </div>
          <StatusBadge status="published" />
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className={inputClass("pl-9")} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm khóa..." value={search} />
        </div>
      </div>
      <div className="max-h-[calc(100vh-360px)] min-h-[260px] space-y-2 overflow-y-auto p-3">
        {visibleCourses.map((course) => (
          <button
            className={`w-full rounded-lg border p-3 text-left transition ${
              selectedSlug === course.slug ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            key={course.id}
            onClick={() => onSelect(course.slug)}
            type="button"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{course.title}</div>
              <StatusBadge status={course.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>{course.stats.activeStudents} active</span>
              <span>{course.stats.publishedLessons}/{course.stats.lessons} bài</span>
              <span>{course.stats.modules} module</span>
            </div>
          </button>
        ))}
        {visibleCourses.length === 0 ? <EmptyState title="Không có khóa phù hợp" description="Thử đổi từ khóa tìm kiếm hoặc tạo khóa mới." /> : null}
      </div>
      <form
        className="grid gap-3 border-t border-slate-100 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const title = value(formData, "title");
          onCreate({
            action: "create_course",
            title,
            slug: value(formData, "slug") || slugifyVietnamese(title),
            status: "draft",
            visibility: "enrolled",
          });
          event.currentTarget.reset();
        }}
      >
        <Field label="Tạo khóa mới">
          <input className={inputClass()} name="title" placeholder="Tên khóa học" required />
        </Field>
        <Field label="Slug">
          <input className={inputClass()} name="slug" placeholder="tu-dong-neu-de-trong" />
        </Field>
        <ActionButton busy={busy} tone="primary" type="submit">
          <Plus className="size-4" /> Tạo khóa
        </ActionButton>
      </form>
    </aside>
  );
}

function CourseHeader({ course }: { course: LmsCourse }) {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Khóa đang chọn</div>
          <h2 className="mt-1 max-w-4xl text-2xl font-black leading-tight text-slate-950">{course.title}</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{course.shortDescription || course.description || course.slug}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-black ${buttonClass("secondary")}`} href={`/khoa-hoc/${course.slug}`} target="_blank">
            <ExternalLink className="size-4" /> Xem trang bán
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100" href={getFirstLessonHref(course)} target="_blank">
            <BookOpen className="size-4" /> Xem phòng học
          </Link>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={course.status} />
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">{course.stats.activeStudents} học viên active</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
          {course.stats.publishedLessons}/{course.stats.lessons} bài published
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">{course.stats.modules} module</span>
      </div>
    </Panel>
  );
}

function CourseTabs({ activeTab, onChange }: { activeTab: CourseTab; onChange: (tab: CourseTab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {courseTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-black transition ${
              activeTab === tab.id ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon className="size-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function OverviewTab({ busy, course, submitAction }: { busy: boolean; course: LmsCourse; submitAction: SubmitAction }) {
  const averageProgress =
    course.enrollments.length > 0 ? Math.round(course.enrollments.reduce((sum, enrollment) => sum + enrollment.progressPercent, 0) / course.enrollments.length) : 0;
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat label="Học viên active" value={course.stats.activeStudents} />
        <MiniStat label="Bài published" value={`${course.stats.publishedLessons}/${course.stats.lessons}`} />
        <MiniStat label="Module" value={course.stats.modules} />
        <MiniStat label="Progress TB" value={`${averageProgress}%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const title = value(formData, "title");
            void submitAction({
              action: "update_course",
              courseId: course.id,
              title,
              slug: value(formData, "slug") || slugifyVietnamese(title),
              shortDescription: value(formData, "shortDescription"),
              description: value(formData, "description"),
              thumbnailImage: value(formData, "thumbnailImage"),
              bannerImage: value(formData, "bannerImage"),
              previewVideoUrl: value(formData, "previewVideoUrl"),
              status: value(formData, "status"),
              visibility: value(formData, "visibility"),
            });
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-950">Thông tin khóa học</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Nội dung này dùng chung cho CRM v2 và khu vực học viên.</p>
            </div>
            <ActionButton busy={busy} tone="primary" type="submit">
              Lưu thay đổi
            </ActionButton>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tên khóa">
              <input className={inputClass()} defaultValue={course.title} name="title" required />
            </Field>
            <Field label="Slug">
              <input className={inputClass()} defaultValue={course.slug} name="slug" required />
            </Field>
            <Field label="Trạng thái">
              <select className={inputClass()} defaultValue={course.status} name="status">
                {publishStatuses.map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Visibility">
              <select className={inputClass()} defaultValue={course.visibility} name="visibility">
                <option value="enrolled">Chỉ học viên được cấp quyền</option>
                <option value="public">Công khai</option>
                <option value="private">Riêng tư</option>
              </select>
            </Field>
          </div>
          <Field label="Mô tả ngắn">
            <textarea className={textareaClass("min-h-20")} defaultValue={course.shortDescription} name="shortDescription" />
          </Field>
          <Field label="Mô tả đầy đủ">
            <textarea className={textareaClass()} defaultValue={course.description} name="description" />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Thumbnail URL">
              <input className={inputClass()} defaultValue={course.thumbnailImage} name="thumbnailImage" />
            </Field>
            <Field label="Banner URL">
              <input className={inputClass()} defaultValue={course.bannerImage} name="bannerImage" />
            </Field>
            <Field label="Video preview">
              <input className={inputClass()} defaultValue={course.previewVideoUrl} name="previewVideoUrl" />
            </Field>
          </div>
        </form>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-black text-slate-950">Preview card</div>
          <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-slate-200">
            {course.thumbnailImage || course.bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={course.title} className="size-full object-cover" src={course.thumbnailImage || course.bannerImage} />
            ) : (
              <div className="grid size-full place-items-center text-sm font-black text-slate-400">Chưa có ảnh</div>
            )}
          </div>
          <div className="mt-3 line-clamp-2 text-sm font-black text-slate-950">{course.title}</div>
          <div className="mt-1 line-clamp-3 text-sm font-semibold text-slate-500">{course.shortDescription || course.description || "Chưa có mô tả."}</div>
        </div>
      </div>
    </div>
  );
}

function ModulesTab({
  busyAction,
  course,
  onAddLesson,
  submitAction,
}: {
  busyAction: string;
  course: LmsCourse;
  onAddLesson: (moduleId: string) => void;
  submitAction: SubmitAction;
}) {
  const [editor, setEditor] = useState<LmsModule | "new" | null>(null);
  const moveModule = (index: number, direction: -1 | 1) => {
    const ids = course.modules.map((module) => module.id);
    const target = Math.max(0, Math.min(ids.length - 1, index + direction));
    if (target === index) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void submitAction({ action: "reorder_modules", courseId: course.id, moduleIds: ids });
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Module</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Quản lý cấu trúc khóa học theo từng phần nội dung.</p>
        </div>
        <ActionButton onClick={() => setEditor("new")} tone="primary">
          <Plus className="size-4" /> Thêm module
        </ActionButton>
      </div>
      {course.modules.length === 0 ? <EmptyState title="Chưa có module" description="Tạo module đầu tiên để bắt đầu thêm bài học." /> : null}
      <div className="grid gap-3">
        {course.modules.map((module, index) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4" key={module.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-400">MODULE #{index + 1}</div>
                <div className="mt-1 line-clamp-2 text-base font-black text-slate-950">{module.title}</div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{module.description || "Chưa có mô tả."}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={module.status} />
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">{module.lessons.length} bài học</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => moveModule(index, -1)} tone="ghost">
                  <ArrowUp className="size-4" />
                </ActionButton>
                <ActionButton onClick={() => moveModule(index, 1)} tone="ghost">
                  <ArrowDown className="size-4" />
                </ActionButton>
                <ActionButton onClick={() => onAddLesson(module.id)}>
                  <Plus className="size-4" /> Bài
                </ActionButton>
                <ActionButton onClick={() => setEditor(module)}>
                  <Pencil className="size-4" /> Sửa
                </ActionButton>
                <ActionButton
                  onClick={() =>
                    void submitAction(
                      { action: "delete_module", moduleId: module.id },
                      "Xóa module này? Nếu module còn bài học, hệ thống sẽ chặn để bảo vệ dữ liệu.",
                    )
                  }
                  tone="danger"
                >
                  <Trash2 className="size-4" />
                </ActionButton>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editor ? (
        <ModuleFormModal
          busy={busyAction === "create_module" || busyAction === "update_module"}
          course={course}
          module={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          submitAction={async (payload) => {
            await submitAction(payload);
            setEditor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ModuleFormModal({
  busy,
  course,
  module,
  onClose,
  submitAction,
}: {
  busy: boolean;
  course: LmsCourse;
  module: LmsModule | null;
  onClose: () => void;
  submitAction: SubmitAction;
}) {
  return (
    <ModalShell onClose={onClose} title={module ? "Sửa module" : "Thêm module"} width="max-w-2xl">
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void submitAction({
            action: module ? "update_module" : "create_module",
            courseId: course.id,
            moduleId: module?.id,
            title: value(formData, "title"),
            description: value(formData, "description"),
            status: value(formData, "status"),
            position: module?.position,
          });
        }}
      >
        <Field label="Tên module">
          <input className={inputClass()} defaultValue={module?.title ?? ""} name="title" required />
        </Field>
        <Field label="Mô tả">
          <textarea className={textareaClass("min-h-24")} defaultValue={module?.description ?? ""} name="description" />
        </Field>
        <Field label="Trạng thái">
          <select className={inputClass()} defaultValue={module?.status ?? "published"} name="status">
            {publishStatuses.map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <ActionButton onClick={onClose}>Hủy</ActionButton>
          <ActionButton busy={busy} tone="primary" type="submit">
            Lưu module
          </ActionButton>
        </div>
      </form>
    </ModalShell>
  );
}

function LessonsTab({
  busyAction,
  course,
  onEditLesson,
  submitAction,
}: {
  busyAction: string;
  course: LmsCourse;
  onEditLesson: (editor: { mode: "create" | "edit"; lesson?: LmsLesson; moduleId?: string }) => void;
  submitAction: SubmitAction;
}) {
  const lessons = getCourseLessons(course);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const visibleLessons = lessons.filter(({ lesson, module }) => {
    if (moduleFilter !== "all" && module.id !== moduleFilter) return false;
    if (statusFilter !== "all" && lesson.status !== statusFilter) return false;
    return `${lesson.title} ${lesson.slug} ${module.title}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const moveLesson = (module: LmsModule, lesson: LmsLesson, direction: -1 | 1) => {
    const ids = module.lessons.map((item) => item.id);
    const index = ids.indexOf(lesson.id);
    const target = Math.max(0, Math.min(ids.length - 1, index + direction));
    if (target === index) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void submitAction({ action: "reorder_lessons", moduleId: module.id, lessonIds: ids });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Bài học</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Danh sách compact, chỉ mở form khi thêm hoặc sửa một bài.</p>
        </div>
        <ActionButton onClick={() => onEditLesson({ mode: "create", moduleId: course.modules[0]?.id })} tone="primary">
          <Plus className="size-4" /> Thêm bài học
        </ActionButton>
      </div>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_220px_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className={inputClass("pl-9")} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bài học..." value={search} />
        </div>
        <select className={inputClass()} onChange={(event) => setModuleFilter(event.target.value)} value={moduleFilter}>
          <option value="all">Tất cả module</option>
          {course.modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </select>
        <select className={inputClass()} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
          <option value="all">Tất cả trạng thái</option>
          {publishStatuses.map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <div className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-600">{visibleLessons.length} bài</div>
      </div>
      {visibleLessons.length === 0 ? <EmptyState title="Không có bài học phù hợp" description="Thử đổi bộ lọc hoặc thêm bài học mới." /> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[64px_minmax(260px,1.6fr)_minmax(170px,0.9fr)_110px_120px_110px_110px_150px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.06em] text-slate-500">
          <div>STT</div>
          <div>Tiêu đề</div>
          <div>Module</div>
          <div>Loại</div>
          <div>Quyền xem</div>
          <div>Status</div>
          <div>Thời lượng</div>
          <div className="text-right">Action</div>
        </div>
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {visibleLessons.map(({ lesson, module }, index) => (
            <div className="grid min-w-[1120px] grid-cols-[64px_minmax(260px,1.6fr)_minmax(170px,0.9fr)_110px_120px_110px_110px_150px] items-center gap-3 px-4 py-3" key={lesson.id}>
              <div className="text-sm font-black text-slate-400">#{index + 1}</div>
              <div className="min-w-0">
                <div className="line-clamp-2 text-sm font-black text-slate-950">{lesson.title}</div>
                <div className="mt-1 truncate text-xs font-semibold text-slate-400">{lesson.slug}</div>
              </div>
              <div className="line-clamp-2 text-sm font-bold text-slate-600">{module.title}</div>
              <div className="text-sm font-bold text-slate-600">{lesson.lessonType}</div>
              <StatusBadge status={lesson.accessType} />
              <StatusBadge status={lesson.status} />
              <div className="text-sm font-bold text-slate-600">{lesson.duration || "-"}</div>
              <div className="flex justify-end gap-1">
                <ActionButton onClick={() => moveLesson(module, lesson, -1)} tone="ghost">
                  <ArrowUp className="size-4" />
                </ActionButton>
                <ActionButton onClick={() => moveLesson(module, lesson, 1)} tone="ghost">
                  <ArrowDown className="size-4" />
                </ActionButton>
                <ActionButton onClick={() => onEditLesson({ mode: "edit", lesson })}>
                  <Pencil className="size-4" />
                </ActionButton>
                <ActionButton
                  busy={busyAction === "delete_lesson"}
                  onClick={() => void submitAction({ action: "delete_lesson", lessonId: lesson.id }, "Xóa/lưu trữ bài học này?")}
                  tone="danger"
                >
                  <Trash2 className="size-4" />
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LessonFormModal({
  busy,
  course,
  editor,
  onClose,
  submitAction,
}: {
  busy: boolean;
  course: LmsCourse;
  editor: { mode: "create" | "edit"; lesson?: LmsLesson; moduleId?: string };
  onClose: () => void;
  submitAction: SubmitAction;
}) {
  const lesson = editor.lesson;
  const defaultModuleId = lesson?.moduleId ?? editor.moduleId ?? course.modules[0]?.id ?? "";
  return (
    <ModalShell onClose={onClose} title={lesson ? "Sửa bài học" : "Thêm bài học"} subtitle="Form chỉ mở cho một bài, không làm dài toàn bộ tab." width="max-w-4xl">
      <form
        className="max-h-[calc(90vh-78px)] overflow-y-auto"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const title = value(formData, "title");
          const statusOverride = value(formData, "statusOverride");
          void submitAction({
            action: lesson ? "update_lesson" : "create_lesson",
            courseId: course.id,
            lessonId: lesson?.id,
            moduleId: value(formData, "moduleId"),
            title,
            slug: value(formData, "slug") || slugifyVietnamese(title),
            status: statusOverride || value(formData, "status"),
            accessType: value(formData, "accessType"),
            lessonType: value(formData, "lessonType"),
            duration: value(formData, "duration"),
            youtubeUrl: value(formData, "youtubeUrl"),
            embedUrl: value(formData, "embedUrl"),
            description: value(formData, "description"),
            content: value(formData, "content"),
            position: lesson?.position,
          });
        }}
      >
        <div className="grid gap-5 p-5">
          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="text-sm font-black text-slate-950">Thông tin cơ bản</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Module">
                <select className={inputClass()} defaultValue={defaultModuleId} name="moduleId" required>
                  {course.modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tiêu đề">
                <input className={inputClass()} defaultValue={lesson?.title ?? ""} name="title" required />
              </Field>
              <Field label="Slug">
                <input className={inputClass()} defaultValue={lesson?.slug ?? ""} name="slug" placeholder="tu-dong-neu-de-trong" />
              </Field>
              <Field label="Status">
                <select className={inputClass()} defaultValue={lesson?.status ?? "draft"} name="status">
                  {publishStatuses.map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quyền xem">
                <select className={inputClass()} defaultValue={lesson?.accessType ?? "enrolled_only"} name="accessType">
                  {accessTypes.map(([access, label]) => (
                    <option key={access} value={access}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Loại bài">
                <select className={inputClass()} defaultValue={lesson?.lessonType ?? "video"} name="lessonType">
                  {lessonTypes.map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="text-sm font-black text-slate-950">Nội dung video</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="YouTube URL">
                <input className={inputClass()} defaultValue={lesson?.youtubeUrl ?? ""} name="youtubeUrl" />
              </Field>
              <Field label="Embed URL">
                <input className={inputClass()} defaultValue={lesson?.embedUrl ?? ""} name="embedUrl" />
              </Field>
              <Field label="Thời lượng">
                <input className={inputClass()} defaultValue={lesson?.duration ?? ""} name="duration" placeholder="12 phút" />
              </Field>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="text-sm font-black text-slate-950">Mô tả và nội dung học</h4>
            <div className="mt-3 grid gap-3">
              <Field label="Mô tả ngắn">
                <textarea className={textareaClass("min-h-20")} defaultValue={lesson?.description ?? ""} name="description" />
              </Field>
              <Field label="Nội dung học">
                <textarea className={textareaClass("min-h-36")} defaultValue={lesson?.content ?? ""} name="content" />
              </Field>
            </div>
          </div>
          {lesson?.resources.length ? (
            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="text-sm font-black text-slate-950">Tài nguyên đang gắn</h4>
              <div className="mt-3 grid gap-2">
                {lesson.resources.map((resource) => (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600" key={resource.id}>
                    {resource.title} · {resource.type}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <ActionButton onClick={onClose}>Hủy</ActionButton>
          <ActionButton busy={busy} type="submit">
            Lưu bài
          </ActionButton>
          <button name="statusOverride" value="draft" className={`min-h-10 rounded-lg px-3 text-sm font-black ${buttonClass("secondary")}`} disabled={busy} type="submit">
            Lưu nháp
          </button>
          <button name="statusOverride" value="published" className={`min-h-10 rounded-lg px-3 text-sm font-black ${buttonClass("primary")}`} disabled={busy} type="submit">
            Xuất bản
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function StudentsTab({ busyAction, course, submitAction }: { busyAction: string; course: LmsCourse; submitAction: SubmitAction }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Học viên</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Theo dõi enrollment, trạng thái và tiến độ học thật.</p>
        </div>
        <ActionButton onClick={() => setShowAdd(true)} tone="primary">
          <Plus className="size-4" /> Thêm học viên
        </ActionButton>
      </div>
      <EnrollmentTable busyAction={busyAction} enrollments={course.enrollments} submitAction={submitAction} />
      {showAdd ? (
        <EnrollmentFormModal
          busy={busyAction === "add_enrollment"}
          course={course}
          onClose={() => setShowAdd(false)}
          submitAction={async (payload) => {
            await submitAction(payload);
            setShowAdd(false);
          }}
        />
      ) : null}
    </div>
  );
}

function EnrollmentFormModal({ busy, course, onClose, submitAction }: { busy: boolean; course: LmsCourse; onClose: () => void; submitAction: SubmitAction }) {
  return (
    <ModalShell onClose={onClose} title="Thêm học viên vào khóa" width="max-w-2xl">
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void submitAction({
            action: "add_enrollment",
            courseId: course.id,
            studentName: value(formData, "studentName"),
            email: value(formData, "email"),
            phone: value(formData, "phone"),
            status: "active",
          });
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tên học viên">
            <input className={inputClass()} name="studentName" />
          </Field>
          <Field label="Email">
            <input className={inputClass()} name="email" type="email" />
          </Field>
          <Field label="Số điện thoại">
            <input className={inputClass()} name="phone" />
          </Field>
          <div className="rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-600">
            Khóa: <span className="font-black text-slate-950">{course.title}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <ActionButton onClick={onClose}>Hủy</ActionButton>
          <ActionButton busy={busy} tone="primary" type="submit">
            Enroll học viên
          </ActionButton>
        </div>
      </form>
    </ModalShell>
  );
}

function EnrollmentTable({ busyAction, enrollments, submitAction }: { busyAction: string; enrollments: LmsEnrollment[]; submitAction: SubmitAction }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const visibleEnrollments = enrollments.filter((enrollment) => {
    if (status !== "all" && enrollment.status !== status) return false;
    return `${enrollment.studentName} ${enrollment.email} ${enrollment.phone}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className={inputClass("pl-9")} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, SĐT..." value={search} />
        </div>
        <select className={inputClass()} onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">Tất cả status</option>
          {enrollmentStatuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-600">{visibleEnrollments.length} học viên</div>
      </div>
      {visibleEnrollments.length === 0 ? <EmptyState title="Chưa có học viên phù hợp" description="Thử đổi bộ lọc hoặc enroll học viên mới." /> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(220px,1.3fr)_150px_160px_130px_150px_170px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.06em] text-slate-500">
          <div>Học viên</div>
          <div>Trạng thái</div>
          <div>Tiến độ</div>
          <div>Lần học gần nhất</div>
          <div>Ngày enroll</div>
          <div className="text-right">Action</div>
        </div>
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {visibleEnrollments.map((enrollment) => (
            <div className="grid min-w-[980px] grid-cols-[minmax(220px,1.3fr)_150px_160px_130px_150px_170px] items-center gap-3 px-4 py-3" key={enrollment.id}>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">{enrollment.studentName || "Chưa có tên"}</div>
                <div className="mt-1 truncate text-xs font-bold text-slate-500">{enrollment.email || enrollment.phone || "Chưa có liên hệ"}</div>
              </div>
              <StatusBadge status={enrollment.status} />
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, enrollment.progressPercent))}%` }} />
                </div>
                <div className="mt-1 text-xs font-black text-slate-500">{enrollment.progressPercent}%</div>
              </div>
              <div className="text-xs font-bold text-slate-500">{formatDate(enrollment.lastAccessedAt)}</div>
              <div className="text-xs font-bold text-slate-500">{formatDate(enrollment.enrolledAt)}</div>
              <div className="flex justify-end gap-2">
                <select
                  className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700"
                  defaultValue={enrollment.status}
                  onChange={(event) => void submitAction({ action: "update_enrollment", enrollmentId: enrollment.id, status: event.target.value })}
                >
                  {enrollmentStatuses.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ActionButton
                  busy={busyAction === "remove_enrollment"}
                  onClick={() => void submitAction({ action: "remove_enrollment", enrollmentId: enrollment.id }, "Gỡ quyền học của học viên này?")}
                  tone="danger"
                >
                  Gỡ
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourcesTab({ busyAction, course, submitAction }: { busyAction: string; course: LmsCourse; submitAction: SubmitAction }) {
  const [editor, setEditor] = useState<LmsResource | "new" | null>(null);
  const lessons = getCourseLessons(course);
  const resources = [...course.resources, ...course.modules.flatMap((module) => module.lessons.flatMap((lesson) => lesson.resources))];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">Tài nguyên</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Quản lý link/file gắn với khóa học hoặc từng bài.</p>
        </div>
        <ActionButton onClick={() => setEditor("new")} tone="primary">
          <Plus className="size-4" /> Thêm tài nguyên
        </ActionButton>
      </div>
      {resources.length === 0 ? <EmptyState title="Chưa có tài nguyên" description="Thêm URL hoặc file liên quan để học viên tải về." /> : null}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(220px,1fr)_110px_minmax(240px,1.2fr)_160px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.06em] text-slate-500">
          <div>Title</div>
          <div>Type</div>
          <div>URL</div>
          <div className="text-right">Action</div>
        </div>
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {resources.map((resource) => (
            <div className="grid min-w-[780px] grid-cols-[minmax(220px,1fr)_110px_minmax(240px,1.2fr)_160px] items-center gap-3 px-4 py-3" key={resource.id}>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-slate-950">{resource.title}</div>
                <div className="mt-1 truncate text-xs font-bold text-slate-400">{resource.description || "Không có mô tả"}</div>
              </div>
              <StatusBadge status={resource.type} />
              <div className="truncate text-sm font-bold text-slate-500">{resource.url}</div>
              <div className="flex justify-end gap-2">
                <ActionButton onClick={() => setEditor(resource)}>
                  <Pencil className="size-4" /> Sửa
                </ActionButton>
                <ActionButton
                  busy={busyAction === "delete_resource"}
                  onClick={() => void submitAction({ action: "delete_resource", resourceId: resource.id }, "Xóa tài nguyên này?")}
                  tone="danger"
                >
                  <Trash2 className="size-4" />
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </div>
      {editor ? (
        <ResourceFormModal
          busy={busyAction === "create_resource" || busyAction === "update_resource"}
          course={course}
          lessons={lessons}
          onClose={() => setEditor(null)}
          resource={editor === "new" ? null : editor}
          submitAction={async (payload) => {
            await submitAction(payload);
            setEditor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ResourceFormModal({
  busy,
  course,
  lessons,
  onClose,
  resource,
  submitAction,
}: {
  busy: boolean;
  course: LmsCourse;
  lessons: Array<{ lesson: LmsLesson; module: LmsModule }>;
  onClose: () => void;
  resource: LmsResource | null;
  submitAction: SubmitAction;
}) {
  return (
    <ModalShell onClose={onClose} title={resource ? "Sửa tài nguyên" : "Thêm tài nguyên"} width="max-w-2xl">
      <form
        className="grid gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const lessonId = value(formData, "lessonId");
          const selectedLesson = lessons.find((item) => item.lesson.id === lessonId);
          void submitAction({
            action: resource ? "update_resource" : "create_resource",
            courseId: course.id,
            resourceId: resource?.id,
            moduleId: selectedLesson?.module.id ?? null,
            lessonId: lessonId || null,
            title: value(formData, "title"),
            type: value(formData, "type"),
            url: value(formData, "url"),
            description: value(formData, "description"),
          });
        }}
      >
        <Field label="Gắn với bài">
          <select className={inputClass()} defaultValue={resource?.lessonId ?? ""} name="lessonId">
            <option value="">Toàn khóa</option>
            {lessons.map(({ lesson, module }) => (
              <option key={lesson.id} value={lesson.id}>
                {module.title} · {lesson.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tiêu đề">
            <input className={inputClass()} defaultValue={resource?.title ?? ""} name="title" required />
          </Field>
          <Field label="Loại">
            <select className={inputClass()} defaultValue={resource?.type ?? "link"} name="type">
              <option value="link">Link</option>
              <option value="file">File</option>
              <option value="worksheet">Worksheet</option>
              <option value="template">Template</option>
              <option value="video">Video</option>
              <option value="other">Khác</option>
            </select>
          </Field>
        </div>
        <Field label="URL / File path">
          <input className={inputClass()} defaultValue={resource?.url ?? ""} name="url" required />
        </Field>
        <Field label="Mô tả">
          <textarea className={textareaClass("min-h-20")} defaultValue={resource?.description ?? ""} name="description" />
        </Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <ActionButton onClick={onClose}>Hủy</ActionButton>
          <ActionButton busy={busy} tone="primary" type="submit">
            Lưu tài nguyên
          </ActionButton>
        </div>
      </form>
    </ModalShell>
  );
}

function SettingsTab({ busyAction, course, submitAction }: { busyAction: string; course: LmsCourse; submitAction: SubmitAction }) {
  return (
    <div className="grid gap-4">
      <form
        className="rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          void submitAction({
            action: "update_course",
            courseId: course.id,
            slug: value(formData, "slug") || slugifyVietnamese(course.title),
            status: value(formData, "status"),
            visibility: value(formData, "visibility"),
          });
        }}
      >
        <h3 className="text-base font-black text-slate-950">Xuất bản và quyền truy cập</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
          <Field label="Slug / SEO">
            <input className={inputClass()} defaultValue={course.slug} name="slug" required />
          </Field>
          <Field label="Status">
            <select className={inputClass()} defaultValue={course.status} name="status">
              {publishStatuses.map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visibility">
            <select className={inputClass()} defaultValue={course.visibility} name="visibility">
              <option value="enrolled">Enrollment</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </Field>
          <div className="flex items-end">
            <ActionButton busy={busyAction === "update_course"} tone="primary" type="submit">
              Lưu cài đặt
            </ActionButton>
          </div>
        </div>
      </form>
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="text-base font-black text-red-800">Danger zone</h3>
        <p className="mt-1 text-sm font-semibold text-red-700">Các hành động này có confirm và sẽ bảo vệ enrollment/progress nếu khóa đang có dữ liệu học viên.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            busy={busyAction === "archive_course"}
            onClick={() => void submitAction({ action: "archive_course", courseId: course.id }, "Lưu trữ khóa học này?")}
            tone="danger"
          >
            <Archive className="size-4" /> Lưu trữ khóa
          </ActionButton>
          <ActionButton
            busy={busyAction === "delete_course"}
            onClick={() => void submitAction({ action: "delete_course", courseId: course.id }, "Xóa/lưu trữ khóa học này? Enrollment và progress sẽ được bảo vệ.")}
            tone="danger"
          >
            <Trash2 className="size-4" /> Xóa khóa
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function LmsStudentsOverview({ lmsSnapshot }: { lmsSnapshot: AdminLmsSnapshot }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const submitAction: SubmitAction = async (payload, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyAction(payload.action);
    setMessage("");
    try {
      const response = await fetch("/api/admin/crm-v2/lms/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.message ?? "Không cập nhật được học viên.");
      setMessage(result.message ?? "Đã cập nhật.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không cập nhật được học viên.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-black text-slate-950">Quản lý học viên LMS</div>
          <p className="mt-1 text-sm font-semibold text-slate-600">Danh sách enrollment thật, liên kết với contact/user hiện có.</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">{lmsSnapshot.enrollments.length} enrollment</div>
      </div>
      <div className="mt-4">
        <ActionMessage message={message || lmsSnapshot.message || ""} />
      </div>
      <div className="mt-4">
        <GlobalEnrollmentForm busy={busyAction === "add_enrollment"} courses={lmsSnapshot.courses} submitAction={submitAction} />
      </div>
      <div className="mt-4">
        <EnrollmentTable busyAction={busyAction} enrollments={lmsSnapshot.enrollments} submitAction={submitAction} />
      </div>
    </Panel>
  );
}

function GlobalEnrollmentForm({ busy, courses, submitAction }: { busy: boolean; courses: LmsCourse[]; submitAction: SubmitAction }) {
  return (
    <form
      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void submitAction({
          action: "add_enrollment",
          courseSlug: value(formData, "courseSlug"),
          studentName: value(formData, "studentName"),
          email: value(formData, "email"),
          phone: value(formData, "phone"),
          status: "active",
        });
        event.currentTarget.reset();
      }}
    >
      <Field label="Khóa học">
        <select className={inputClass()} name="courseSlug" required>
          {courses.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tên học viên">
        <input className={inputClass()} name="studentName" />
      </Field>
      <Field label="Email">
        <input className={inputClass()} name="email" type="email" />
      </Field>
      <Field label="Số điện thoại">
        <input className={inputClass()} name="phone" />
      </Field>
      <div className="flex items-end">
        <ActionButton busy={busy} tone="primary" type="submit">
          Enroll
        </ActionButton>
      </div>
    </form>
  );
}
