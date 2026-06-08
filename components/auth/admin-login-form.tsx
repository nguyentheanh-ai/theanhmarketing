"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSafeNextPath } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"), "/admin/cms", {
    requiredPrefix: "/admin",
  });
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
        <label className="text-sm font-semibold text-white/65">Email</label>
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
          name="email"
          placeholder="admin@example.com"
          required
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-white/65">Mật khẩu</label>
          <Link className="text-xs font-bold text-white/55 hover:text-white" href="/quen-mat-khau">
            Quên mật khẩu?
          </Link>
        </div>
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </div>
      {message ? (
        <p className="rounded-xl border border-red-300/20 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
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
