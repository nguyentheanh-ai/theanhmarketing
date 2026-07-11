"use client";

import { BookOpen, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/crm-v2";
import type { AdminLmsSnapshot } from "@/lib/lms/types";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CourseHub({ snapshot }: { snapshot: AdminLmsSnapshot }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const courses = useMemo(
    () => snapshot.courses.filter((course) => `${course.title} ${course.slug}`.toLowerCase().includes(search.trim().toLowerCase())),
    [search, snapshot.courses],
  );

  async function createCourse(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(title);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/crm-v2/lms/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_course", title, slug, status: "draft", visibility: "enrolled" }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; course?: { slug?: string } } | null;
      if (!response.ok || !result?.ok || !result.course?.slug) throw new Error(result?.message || "Không tạo được khóa học.");
      window.open(`/admin/course-studio/${result.course.slug}`, "_blank", "noopener,noreferrer");
      setCreating(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được khóa học.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="LMS · Course Hub" title="Khóa học" />
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc slug..." value={search} />
        </label>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700" onClick={() => setCreating(true)} type="button">
          <Plus className="size-4" /> Tạo khóa học
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <Link className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md" href={`/admin/course-studio/${course.slug}`} key={course.id} rel="noopener noreferrer" target="_blank">
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="size-5" /></span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${course.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{course.status === "published" ? "Đang xuất bản" : "Bản nháp"}</span>
            </div>
            <h2 className="mt-4 line-clamp-2 text-lg font-black text-slate-950 group-hover:text-blue-700">{course.title}</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">/{course.slug}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              <div><b className="block text-base text-slate-950">{course.stats.modules}</b><span className="text-xs font-semibold text-slate-500">Chủ đề</span></div>
              <div><b className="block text-base text-slate-950">{course.stats.publishedLessons}/{course.stats.lessons}</b><span className="text-xs font-semibold text-slate-500">Bài học</span></div>
              <div><b className="block text-base text-slate-950">{course.stats.activeStudents}</b><span className="text-xs font-semibold text-slate-500">Học viên</span></div>
            </div>
          </Link>
        ))}
      </div>
      {courses.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center font-bold text-slate-600">Không có khóa học phù hợp.</div> : null}

      {creating ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <button aria-label="Đóng" className="fixed inset-0" onClick={() => !busy && setCreating(false)} type="button" />
          <form action={createCourse} className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-950">Tạo khóa học</h2><button aria-label="Đóng" className="grid size-10 place-items-center rounded-full bg-slate-100" disabled={busy} onClick={() => setCreating(false)} type="button"><X className="size-4" /></button></div>
            <label className="mt-5 grid gap-2 text-sm font-black text-slate-700">Tên khóa học<input className="min-h-11 rounded-xl border border-slate-300 px-3 font-semibold text-slate-950" name="title" required /></label>
            <label className="mt-4 grid gap-2 text-sm font-black text-slate-700">Slug <span className="text-xs font-semibold text-slate-500">Có thể để trống để tạo tự động.</span><input className="min-h-11 rounded-xl border border-slate-300 px-3 font-semibold text-slate-950" name="slug" /></label>
            {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
            <button className="mt-5 min-h-11 w-full rounded-xl bg-blue-600 font-black text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? "Đang tạo..." : "Tạo và mở workspace"}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
