"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/data/courses";
import type { StudentAccessRecord } from "@/services/studentAccessService";

export function StudentAccessActions({
  courses,
  student,
}: {
  courses: Course[];
  student: StudentAccessRecord;
}) {
  const router = useRouter();
  const initialCourseSlugs = student.courseSlugs.length > 0 ? student.courseSlugs : courses.slice(0, 1).map((course) => course.slug);
  const [checkedCourseSlugs, setCheckedCourseSlugs] = useState<string[]>(initialCourseSlugs);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function toggleCourse(slug: string) {
    setCheckedCourseSlugs((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  async function submitAccessChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (checkedCourseSlugs.length === 0) {
      setMessage("Chọn ít nhất một khóa.");
      return;
    }

    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/students/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: String(formData.get("action") ?? ""),
        courseSlugs: checkedCourseSlugs,
        email: student.email,
        name: student.name,
        phone: student.phone,
      }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string };

    setIsSaving(false);
    setMessage(result.message ?? "Đã cập nhật quyền học.");

    if (response.ok && result.ok) {
      setIsEditing(false);
      router.refresh();
    }
  }

  return (
    <div className="min-w-32 text-sm">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold">
        <button
          className="text-blue-700 transition hover:text-blue-900 disabled:text-slate-400"
          disabled={!student.email}
          onClick={() => setIsEditing(true)}
          type="button"
        >
          {student.accessStatus === "Có quyền học" ? "View" : "Grant Access"}
        </button>
        <span className="text-slate-300">|</span>
        <button
          className="text-blue-700 transition hover:text-blue-900 disabled:text-slate-400"
          disabled={!student.email}
          onClick={() => setIsEditing((current) => !current)}
          type="button"
        >
          Edit
        </button>
      </div>

      {isEditing ? (
        <form className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-2" onSubmit={submitAccessChange}>
          <div className="grid max-h-40 gap-1.5 overflow-y-auto">
            {courses.map((course) => (
              <label key={course.slug} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs font-semibold text-slate-700">
                <input
                  checked={checkedCourseSlugs.includes(course.slug)}
                  className="size-4 rounded border-slate-300 text-blue-600"
                  onChange={() => toggleCourse(course.slug)}
                  type="checkbox"
                />
                <span className="line-clamp-1">{course.title}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-black text-white disabled:opacity-50"
              disabled={isSaving || !student.email}
              name="action"
              type="submit"
              value="grant"
            >
              Cấp quyền
            </button>
            <button
              className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-black text-red-700 disabled:opacity-50"
              disabled={isSaving || !student.email}
              name="action"
              type="submit"
              value="revoke"
            >
              Thu quyền
            </button>
          </div>
          {message ? <p className="text-xs leading-5 text-slate-500">{message}</p> : null}
        </form>
      ) : message ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{message}</p>
      ) : null}
    </div>
  );
}
