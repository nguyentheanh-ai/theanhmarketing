"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { getSafeNextPath } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
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
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setMessage("Mật khẩu mới cần tối thiểu 8 ký tự.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Hai mật khẩu chưa khớp.");
      setIsSubmitting(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Link đặt lại mật khẩu chưa hợp lệ hoặc đã hết hạn. Vui lòng mở lại link mới nhất trong email.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-white/60">Mật khẩu mới</label>
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
          minLength={8}
          name="password"
          placeholder="Tối thiểu 8 ký tự"
          required
          type="password"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-white/60">Nhập lại mật khẩu mới</label>
        <input
          className="min-h-12 rounded-xl border border-white/10 bg-white/8 px-4 text-white outline-none transition placeholder:text-white/35 focus:border-[#77d7ff]/35"
          minLength={8}
          name="confirmPassword"
          placeholder="Nhập lại để xác nhận"
          required
          type="password"
        />
      </div>
      {message ? (
        <p className="rounded-xl bg-red-500/12 p-4 text-sm font-semibold text-red-100">
          {message}
        </p>
      ) : null}
      <Button isLoading={isSubmitting} loadingLabel="Đang cập nhật..." type="submit">
        Đổi mật khẩu và vào dashboard
      </Button>
    </form>
  );
}
