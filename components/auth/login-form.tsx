"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
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
      setMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setMessage("");
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${nextPath}`,
      },
    });

    if (error) {
      setMessage(error.message);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Button variant="secondary" type="button" onClick={handleGoogleLogin}>
          Đăng nhập với Google
        </Button>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
          <span className="h-px flex-1 bg-black/10" />
          hoặc
          <span className="h-px flex-1 bg-black/10" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-black/60">Email</label>
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none transition focus:border-black/30"
            name="email"
            placeholder="email@example.com"
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
          <p className="rounded-2xl bg-[#f2eadf] p-4 text-sm font-semibold text-black/70">
            {message}
          </p>
        ) : null}
        <Button isLoading={isSubmitting} loadingLabel="Đang đăng nhập..." type="submit">
          Vào dashboard học viên
        </Button>
      </form>
      <div className="mt-6 grid gap-3 rounded-2xl bg-[#f2eadf] p-4 text-sm leading-6 text-black/60">
        <p>
          Chưa có tài khoản?{" "}
          <Link className="font-bold text-black" href="/dang-ky">
            Đăng ký học
          </Link>
        </p>
      </div>
    </>
  );
}
