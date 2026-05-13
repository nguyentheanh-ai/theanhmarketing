"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/data/courses";
import { createLead } from "@/services/leadService";

export function StudentIntakeForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const email = String(formData.get("email") ?? "");
    const course = String(formData.get("course") ?? "");
    const paymentStatus = String(formData.get("paymentStatus") ?? "");
    const source = String(formData.get("source") ?? "Admin");
    const note = String(formData.get("note") ?? "");

    const result = await createLead({
      name,
      phone,
      email,
      source: `admin-student:${source}`,
      message: `Khóa học: ${course}\nTrạng thái: ${paymentStatus}\nGhi chú: ${note}`,
    });

    setIsSaving(false);

    if (!result.ok) {
      setMessage(`Chưa lưu được hồ sơ: ${result.error}`);
      return;
    }

    setMessage(
      "Đã lưu hồ sơ học viên vào Supabase leads. Khi có bảng enrollments/service role, bước này sẽ cấp quyền học thật.",
    );
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
          placeholder="Email"
          type="email"
        />
        <select
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="course"
        >
          {courses.map((course) => (
            <option key={course.slug}>{course.title}</option>
          ))}
        </select>
        <select
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="paymentStatus"
        >
          <option>Đã thanh toán</option>
          <option>Chờ thanh toán</option>
          <option>Học thử</option>
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
      <button
        className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Đang lưu..." : "Lưu hồ sơ học viên"}
      </button>
      {message ? (
        <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
          {message}
        </p>
      ) : null}
    </form>
  );
}
