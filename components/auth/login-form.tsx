"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPostLoginRedirect } from "@/lib/auth/student-account";
import { getSafeNextPath } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function recordStudentLoginActivity() {
  try {
    await fetch("/api/student/activity", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "student_login_success",
        title: "Học viên đăng nhập thành công",
      }),
    });
  } catch {
    // Activity logging must not block a valid login.
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"), "/dashboard");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const rememberLogin = formData.get("rememberLogin") === "on";
    const supabase = createSupabaseBrowserClient({
      persistence: rememberLogin ? "remember" : "session",
    });

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
      setMessage("Email hoặc mật khẩu chưa đúng. Anh/chị kiểm tra lại thông tin đăng nhập.");
      setIsSubmitting(false);
      return;
    }

    void recordStudentLoginActivity();
    router.push(getPostLoginRedirect(data.user, nextPath));
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold text-slate-900">Email</label>
          <input
            className="login-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            name="email"
            placeholder="email@example.com"
            required
            type="email"
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold text-slate-900">Mật khẩu</label>
            <Link className="text-xs font-bold text-sky-700 hover:text-sky-800" href="/quen-mat-khau">
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <input
              className="login-readable-input min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
              name="password"
              placeholder="••••••••"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <label className="flex min-h-10 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
          <input
            className="h-4 w-4 rounded border-slate-300 bg-white text-sky-500 focus:ring-sky-400/30"
            defaultChecked
            name="rememberLogin"
            type="checkbox"
          />
          Lưu đăng nhập trên thiết bị này
        </label>
        {message ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">
            {message}
          </p>
        ) : null}
        <Button isLoading={isSubmitting} loadingLabel="Đang đăng nhập..." type="submit">
          Vào Growth Hub
        </Button>
      </form>
      <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p>
          Chưa có tài khoản?{" "}
          <Link className="font-bold text-sky-700 hover:text-sky-800" href="/dang-ky">
            Đăng ký Growth Hub
          </Link>
        </p>
        <p>
          Bạn đã đăng ký?{" "}
          <Link className="font-bold text-sky-700 hover:text-sky-800" href="/huong-dan">
            Xem hướng dẫn đăng nhập
          </Link>
        </p>
      </div>
    </>
  );
}
