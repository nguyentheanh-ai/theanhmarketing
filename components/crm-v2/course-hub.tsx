"use client";

import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AdminDialog } from "@/components/admin/admin-dialog";
import type { AdminLmsSnapshot } from "@/lib/lms/types";

function slugify(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const statusLabels = { published: "Đang xuất bản", draft: "Bản nháp", archived: "Đã lưu trữ" };
const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function CourseHub({ snapshot }: { snapshot: AdminLmsSnapshot }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [reorder, setReorder] = useState(false);
  const [orderedCourses, setOrderedCourses] = useState(snapshot.courses);
  const [error, setError] = useState("");
  const courses = useMemo(() => orderedCourses.filter((course) => (status === "all" || course.status === status) && `${course.title} ${course.slug}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))), [orderedCourses, search, status]);

  async function moveCourse(courseId: string, direction: -1 | 1) {
    const index = orderedCourses.findIndex((course) => course.id === courseId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedCourses.length || pending.current) return;
    pending.current = true;
    const previous = orderedCourses;
    const next = [...previous];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedCourses(next); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/crm-v2/lms/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder_courses", courseIds: next.map((course) => course.id) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.message || "Không lưu được thứ tự khóa học.");
    } catch (cause) {
      setOrderedCourses(previous); setError(cause instanceof Error ? cause.message : "Không lưu được thứ tự khóa học.");
    } finally { pending.current = false; setBusy(false); }
  }

  async function createCourse(formData: FormData) {
    if (pending.current) return;
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(title);
    if (!title || !slug) { setError("Nhập tên khóa học và đường dẫn hợp lệ."); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/crm-v2/lms/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_course", title, slug, status: "draft", visibility: "enrolled" }) });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok || !result.course?.slug) throw new Error(result?.message || "Không tạo được khóa học.");
      router.push(`/admin/course-studio/${encodeURIComponent(result.course.slug)}?step=curriculum`);
      setCreating(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tạo được khóa học."); }
    finally { pending.current = false; setBusy(false); }
  }

  return <div className="space-y-4 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">Khóa học</h1><p className="mt-1 text-sm text-slate-500">Nội dung, tài liệu và quyền học trong một nơi.</p></div>
      <button type="button" disabled={!snapshot.ok || busy} onClick={() => { setError(""); setCreating(true); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Plus className="size-4" />Tạo khóa học</button>
    </header>
    {!snapshot.ok ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5"><p className="font-semibold">Chưa tải được khóa học</p><p className="mt-1 text-sm">{snapshot.message || "Kết nối tạm thời gián đoạn. Dữ liệu hiện có vẫn được giữ nguyên."}</p><button type="button" onClick={() => router.refresh()} className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold">Tải lại</button></div> : <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Trạng thái khóa học">{[["all", "Tất cả"], ["published", "Đang xuất bản"], ["draft", "Bản nháp"], ["archived", "Đã lưu trữ"]].map(([key, label]) => <button key={key} type="button" disabled={reorder} aria-pressed={status === key} onClick={() => setStatus(key)} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${status === key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{label}<span className="ml-2 text-xs text-slate-400">{key === "all" ? orderedCourses.length : orderedCourses.filter((course) => course.status === key).length}</span></button>)}</div>
        <button type="button" disabled={busy} onClick={() => { setSearch(""); setStatus("all"); setReorder(!reorder); if (reorder) router.refresh(); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-50">{reorder ? "Xong sắp xếp" : "Sắp xếp"}</button>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3"><label className="relative w-full max-w-md"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input aria-label="Tìm khóa học" disabled={reorder} className={`${inputClass} pl-9`} placeholder="Tìm tên khóa học hoặc đường dẫn…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span className="shrink-0 text-xs text-slate-500">{courses.length} khóa học</span></div>
      {error && !creating ? <p role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="max-h-[calc(100dvh-300px)] min-h-64 overflow-auto">
        <div className="hidden grid-cols-[minmax(240px,1fr)_140px_100px_100px_120px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 lg:grid"><span>KHÓA HỌC</span><span>TRẠNG THÁI</span><span>BÀI HỌC</span><span>HỌC VIÊN</span><span className="text-right">THAO TÁC</span></div>
        {courses.map((course) => <article key={course.id} className="grid items-center gap-3 border-b border-slate-100 p-4 last:border-b-0 hover:bg-slate-50/70 lg:grid-cols-[minmax(240px,1fr)_140px_100px_100px_120px] lg:gap-4">
          <Link href={`/admin/course-studio/${encodeURIComponent(course.slug)}?step=curriculum`} className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-blue-50 text-blue-600">{course.thumbnailImage ? <Image alt="" width={44} height={44} unoptimized className="size-full object-cover" src={course.thumbnailImage} /> : <BookOpen className="size-5" />}</span>
            <span className="min-w-0"><span className="block break-words text-sm font-semibold leading-5 hover:text-blue-600">{course.title}</span><span className="mt-1 block truncate text-xs text-slate-400">/{course.slug}</span></span>
          </Link>
          <div><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${course.status === "published" ? "bg-emerald-50 text-emerald-700" : course.status === "archived" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>{statusLabels[course.status]}</span></div>
          <div className="text-sm"><span className="font-semibold">{course.stats.publishedLessons}</span><span className="text-slate-400"> / {course.stats.lessons}</span><span className="ml-2 text-xs text-slate-500 lg:hidden">bài đã xuất bản</span></div>
          <div className="text-sm font-semibold">{course.stats.activeStudents}<span className="ml-2 text-xs font-normal text-slate-500 lg:hidden">đang học</span></div>
          {reorder ? <div className="flex justify-end gap-1"><button type="button" aria-label={`Đưa ${course.title} lên`} disabled={busy || orderedCourses[0]?.id === course.id} onClick={() => void moveCourse(course.id, -1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ArrowUp className="size-4" /></button><button type="button" aria-label={`Đưa ${course.title} xuống`} disabled={busy || orderedCourses.at(-1)?.id === course.id} onClick={() => void moveCourse(course.id, 1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30"><ArrowDown className="size-4" /></button></div> : <Link className="inline-flex items-center justify-end gap-1 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800" href={`/admin/course-studio/${encodeURIComponent(course.slug)}?step=curriculum`}>Quản lý<ChevronRight className="size-4" /></Link>}
        </article>)}
        {!courses.length ? <div className="p-12 text-center text-sm text-slate-500">Không có khóa học phù hợp với bộ lọc.</div> : null}
      </div>
    </section>}
    <AdminDialog open={creating} onClose={() => { if (!busy) setCreating(false); }} title="Tạo khóa học" description="Khóa mới ở trạng thái nháp. Anh có thể thêm nội dung trước khi xuất bản.">
      <form action={createCourse} className="space-y-4">
        <label className="grid gap-2 text-sm font-medium">Tên khóa học<input name="title" maxLength={220} required className={inputClass} autoFocus /></label>
        <label className="grid gap-2 text-sm font-medium">Đường dẫn<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} placeholder="Tự tạo từ tên khóa học" /><span className="text-xs font-normal text-slate-500">Chữ thường, số và dấu gạch ngang. Đường dẫn được giữ cố định sau khi tạo.</span></label>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Hủy</button><button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Đang tạo…" : "Tạo và soạn nội dung"}</button></div>
      </form>
    </AdminDialog>
  </div>;
}
