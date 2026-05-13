"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/dashboard";
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });

    const result = (await response.json()) as { ok: boolean; message?: string };
    setIsSubmitting(false);

    if (!response.ok || !result.ok) {
      setMessage(result.message || "Không thể đăng nhập quản trị.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-black/60">Email</label>
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none transition focus:border-black/30"
          name="email"
          placeholder="admin@example.com"
          required
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-black/60">Mật khẩu</label>
        <input
          className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none transition focus:border-black/30"
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </div>
      {message ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}
      <button
        className="min-h-12 rounded-full bg-black px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Đang đăng nhập..." : "Vào trang quản trị"}
      </button>
    </form>
  );
}
