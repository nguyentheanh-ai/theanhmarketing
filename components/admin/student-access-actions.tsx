"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/data/courses";
import type { StudentAccessRecord } from "@/services/studentAccessService";

function formatDateTime(value: string) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 sm:grid-cols-[160px_1fr]">
      <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canManageStudent = Boolean(student.email || student.phone);
  const visibleProgress = Math.max(0, Math.min(100, student.progressPercent));

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

  async function deleteStudent() {
    setMessage("");

    if (!canManageStudent) {
      setMessage("Thiếu email hoặc số điện thoại để xóa học viên.");
      return;
    }

    const confirmed = window.confirm(
      "Xóa học viên này khỏi danh sách quản lý? Đơn hàng đã thanh toán vẫn được giữ để đối soát.",
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    const response = await fetch("/api/admin/students/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: student.email,
        name: student.name,
        phone: student.phone,
      }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string };

    setIsDeleting(false);
    setMessage(result.message ?? "Đã xóa học viên khỏi danh sách quản lý.");

    if (response.ok && result.ok) {
      setIsEditing(false);
      setIsPreviewOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="min-w-32 text-sm">
      <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap text-xs font-bold">
        <button
          className="text-blue-700 transition hover:text-blue-900"
          onClick={() => setIsPreviewOpen(true)}
          type="button"
        >
          View
        </button>
        <span className="text-slate-300">|</span>
        <button
          className="text-blue-700 transition hover:text-blue-900 disabled:text-slate-400"
          disabled={!canManageStudent}
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
              disabled={isSaving || !canManageStudent}
              name="action"
              type="submit"
              value="grant"
            >
              Cấp quyền
            </button>
            <button
              className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-black text-red-700 disabled:opacity-50"
              disabled={isSaving || !canManageStudent}
              name="action"
              type="submit"
              value="revoke"
            >
              Thu quyền
            </button>
            <button
              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 disabled:opacity-50"
              disabled={isDeleting || !canManageStudent}
              onClick={deleteStudent}
              type="button"
            >
              {isDeleting ? "Đang xóa" : "Xóa học viên"}
            </button>
          </div>
          {message ? <p className="text-xs leading-5 text-slate-500">{message}</p> : null}
        </form>
      ) : message ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{message}</p>
      ) : null}

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-8">
          <button
            aria-label="Đóng preview học viên"
            className="fixed inset-0 cursor-default"
            onClick={() => setIsPreviewOpen(false)}
            type="button"
          />
          <section className="relative mx-auto w-full max-w-2xl rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Preview học viên</p>
                <h2 className="mt-1 truncate text-xl font-black text-slate-950">Chi tiết học viên</h2>
                <p className="mt-1 truncate text-sm text-slate-500">{student.name || student.email || student.phone}</p>
              </div>
              <button
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsPreviewOpen(false)}
                type="button"
              >
                Đóng
              </button>
            </div>

            <dl className="px-5 py-2">
              <InfoRow label="Email" value={student.email || "Chưa có"} />
              <InfoRow label="Số điện thoại" value={student.phone || "Chưa có"} />
              <InfoRow label="Thời gian đăng ký" value={formatDateTime(student.registeredAt || student.updatedAt)} />
              <InfoRow
                label="Khóa đăng ký"
                value={
                  student.courseTitles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {student.courseTitles.map((courseTitle) => (
                        <span key={courseTitle} className="rounded bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                          {courseTitle}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "Chưa có khóa"
                  )
                }
              />
              <InfoRow
                label="Mã đơn"
                value={
                  [...student.paidOrderCodes, ...student.pendingOrderCodes].length > 0
                    ? [...student.paidOrderCodes, ...student.pendingOrderCodes].join(", ")
                    : "Chưa có"
                }
              />
              <InfoRow
                label="Trạng thái"
                value={`${student.accessStatus} · ${student.paymentStatus} · ${student.role}`}
              />
              <InfoRow
                label="Tiến độ học"
                value={
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-slate-950">{visibleProgress}%</span>
                      <span className="text-xs font-semibold text-slate-500">{student.progressNote || "Chưa có log học tập"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${visibleProgress}%` }} />
                    </div>
                  </div>
                }
              />
              <InfoRow label="Nguồn" value={student.source || "Chưa có"} />
              <InfoRow label="Ghi chú" value={student.note || "Chưa có"} />
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  );
}
