"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LessonCommentBox({ lessonId }: { lessonId: string }) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa kết nối Supabase nên câu hỏi chưa được gửi.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("lesson_comments").insert({
      lesson_id: lessonId,
      student_name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      content: String(formData.get("content") ?? ""),
    });

    setIsSaving(false);

    if (error) {
      setMessage(
        `Chưa gửi được câu hỏi: ${error.message}. Nếu bảng lesson_comments chưa có, chạy SQL trong docs/DATABASE_SETUP.md.`,
      );
      return;
    }

    setMessage("Đã gửi câu hỏi. Admin/giảng viên sẽ phản hồi trong hệ thống.");
    event.currentTarget.reset();
  }

  return (
    <form className="mt-4 grid gap-3 rounded-2xl bg-white p-4" onSubmit={handleSubmit}>
      <p className="text-sm font-bold text-black">Hỏi đáp bài học</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="min-h-10 rounded-xl border border-black/10 px-3 text-sm"
          name="name"
          placeholder="Tên của bạn"
          required
        />
        <input
          className="min-h-10 rounded-xl border border-black/10 px-3 text-sm"
          name="email"
          placeholder="Email"
          type="email"
        />
      </div>
      <textarea
        className="min-h-20 rounded-xl border border-black/10 p-3 text-sm"
        name="content"
        placeholder="Nhập câu hỏi về bài học..."
        required
      />
      <button
        className="w-fit rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Đang gửi..." : "Gửi câu hỏi"}
      </button>
      {message ? <p className="text-sm font-semibold text-black/55">{message}</p> : null}
    </form>
  );
}
