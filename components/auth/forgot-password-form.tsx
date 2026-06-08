"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email") ?? "") }),
    }).catch(() => null);
    const result = response ? ((await response.json().catch(() => null)) as { message?: string } | null) : null;

    setIsSubmitting(false);
    setMessage(result?.message || "Chưa gửi được yêu cầu đặt lại mật khẩu. Anh/chị thử lại sau ít phút.");
    if (response?.ok) event.currentTarget.reset();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-white/60">Email</label>
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
          name="email"
          placeholder="email@gmail.com"
          required
          type="email"
        />
      </div>
      {message ? (
        <p className="rounded-xl border border-sky-300/70 bg-sky-500/15 p-4 text-sm font-semibold leading-6 text-sky-50">
          {message}
        </p>
      ) : null}
      <Button isLoading={isSubmitting} loadingLabel="Đang gửi..." type="submit">
        Gửi hướng dẫn đặt lại mật khẩu
      </Button>
      <Link className="text-sm font-bold text-white/75 hover:text-white" href="/dang-nhap">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
