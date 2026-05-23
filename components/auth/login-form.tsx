"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPostLoginRedirect } from "@/lib/auth/student-account";
import { getSafeNextPath } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"), "/dashboard");
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push(getPostLoginRedirect(data.user, nextPath));
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
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/35">
          <span className="h-px flex-1 bg-white/10" />
          hoặc
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-white/60">Email</label>
          <input
            className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
            name="email"
            placeholder="email@example.com"
            required
            type="email"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-white/60">Mật khẩu</label>
          <input
            className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
            name="password"
            placeholder="••••••••"
            required
            type="password"
          />
        </div>
        {message ? (
          <p className="rounded-xl bg-red-500/12 p-4 text-sm font-semibold text-red-100">
            {message}
          </p>
        ) : null}
        <Button isLoading={isSubmitting} loadingLabel="Đang đăng nhập..." type="submit">
          Vào Growth Hub
        </Button>
      </form>
      <div className="mt-6 grid gap-3 rounded-xl bg-white/8 p-4 text-sm leading-6 text-white/60">
        <p>
          Chưa có tài khoản?{" "}
          <Link className="font-bold text-white" href="/dang-ky">
            Đăng ký Growth Hub
          </Link>
        </p>
      </div>
    </>
  );
}
