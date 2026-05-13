"use client";

import { useState } from "react";
import { createLead } from "@/services/leadService";

type LeadFormProps = {
  source: string;
  submitLabel?: string;
};

export function LeadForm({ source, submitLabel = "Gửi thông tin" }: LeadFormProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="mt-10 grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(event.currentTarget);
        const result = await createLead({
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          email: String(formData.get("email") ?? ""),
          message: String(formData.get("need") ?? ""),
          source,
        });

        setIsSubmitting(false);
        setMessage(
          result.ok
            ? "Đã gửi thông tin. Team Thế Anh Marketing sẽ liên hệ lại."
            : "Đã ghi nhận trên giao diện. Supabase chưa sẵn sàng nên dữ liệu chưa được lưu vào database.",
        );

        if (result.ok) {
          event.currentTarget.reset();
        }
      }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <input
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="name"
          placeholder="Họ và tên"
          required
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="phone"
          placeholder="Số điện thoại"
        />
        <input
          className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
          name="email"
          placeholder="Email"
          type="email"
        />
      </div>
      <input
        className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none"
        name="need"
        placeholder="Nhu cầu học / lời nhắn"
      />
      <button
        className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Đang gửi..." : submitLabel}
      </button>
      {message ? (
        <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-black/65">
          {message}
        </p>
      ) : null}
    </form>
  );
}
