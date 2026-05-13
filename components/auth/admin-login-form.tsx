"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Không thể đăng nhập quản trị.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message || "Không thể đăng nhập quản trị.");
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
      <Button
        isLoading={isSubmitting}
        loadingLabel="Đang đăng nhập..."
        type="submit"
      >
        Vào trang quản trị
      </Button>
    </form>
  );
}
