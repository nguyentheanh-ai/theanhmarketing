"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/courses";

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
        courseSlug: String(formData.get("courseSlug") ?? ""),
        paymentStatus: String(formData.get("paymentStatus") ?? ""),
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
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none"
          name="name"
          placeholder="Họ và tên học viên"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none"
          name="phone"
          placeholder="Số điện thoại/Zalo"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none"
          name="email"
          placeholder="Email dùng để đăng nhập học"
          required
          type="email"
        />
        <select
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="courseSlug"
          required
        >
          {courses.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.title}
            </option>
          ))}
        </select>
        <select
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="paymentStatus"
        >
          <option value="paid">Đã thanh toán - cấp quyền học</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="trial">Học thử / chưa cấp quyền</option>
        </select>
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none"
          name="source"
          placeholder="Nguồn: Facebook, Zalo, Referral..."
        />
      </div>
      <textarea
        className="min-h-24 rounded-2xl border border-black/10 p-4 outline-none"
        name="note"
        placeholder="Ghi chú tư vấn / nhu cầu học"
      />
      <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
        Lưu hồ sơ và xử lý quyền học
      </Button>
      {message ? (
        <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
          {message}
        </p>
      ) : null}
    </form>
  );
}
