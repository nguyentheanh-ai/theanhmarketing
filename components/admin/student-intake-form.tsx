"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/courses";

const inputClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const labelClass = "text-xs font-bold text-slate-700";

export function StudentIntakeForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/students/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        courseSlugs: formData.getAll("courseSlugs").map(String),
        paymentStatus: String(formData.get("paymentStatus") ?? ""),
        temporaryPassword: String(formData.get("temporaryPassword") ?? ""),
        source: String(formData.get("source") ?? "Admin"),
        note: String(formData.get("note") ?? ""),
      }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string };

    setIsSaving(false);

    if (!response.ok || !result.ok) {
      setMessage(result.message ?? "Chưa lưu được hồ sơ học viên.");
      return;
    }

    setMessage(result.message ?? "Đã lưu hồ sơ học viên.");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1.5">
          <span className={labelClass}>Họ tên</span>
          <input className={inputClass} name="name" required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Số điện thoại</span>
          <input className={inputClass} name="phone" required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Email</span>
          <input className={inputClass} name="email" required type="email" />
        </label>
        <div className="grid gap-1.5 md:col-span-2">
          <span className={labelClass}>Chọn khóa học</span>
          <div className="grid max-h-36 gap-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 sm:grid-cols-2">
            {courses.map((course, index) => (
              <label
                key={course.slug}
                className="flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <input
                  className="size-4 rounded border-slate-300 text-blue-600"
                  defaultChecked={index === 0}
                  name="courseSlugs"
                  type="checkbox"
                  value={course.slug}
                />
                <span className="line-clamp-1">{course.title}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="grid gap-1.5">
          <span className={labelClass}>Trạng thái quyền học</span>
          <select className={inputClass} name="paymentStatus">
            <option value="paid">Đã cấp quyền</option>
            <option value="pending">Chờ xử lý</option>
            <option value="trial">Học thử</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Mật khẩu</span>
          <input className={inputClass} name="temporaryPassword" placeholder="Để trống sẽ tự tạo" type="text" />
        </label>
        <label className="grid gap-1.5 md:col-span-2">
          <span className={labelClass}>Nguồn / ghi chú</span>
          <input className={inputClass} name="source" placeholder="Facebook, Zalo, Referral..." />
        </label>
      </div>
      <input name="note" type="hidden" value="" />
      <Button
        className="h-10 w-fit rounded-md px-5 text-sm shadow-none"
        isLoading={isSaving}
        loadingLabel="Đang lưu..."
        type="submit"
      >
        Thêm học viên
      </Button>
      {message ? <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">{message}</p> : null}
    </form>
  );
}
