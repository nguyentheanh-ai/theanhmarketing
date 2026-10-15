"use client";

import {withNativeAuthMutation,NativeAuthCoordinationError} from "@/lib/cloudflare/native-auth-mutation";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { getSafeNextPath } from "@/lib/navigation";
import {getSafeNativeAppBridgePath} from "@/lib/cloudflare/native-app-bridge-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function recordPasswordChangedActivity(mode: string | null) {
  try {
    await fetch("/api/student/activity", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: mode === "reset" ? "password_reset_completed" : "password_changed",
        title: mode === "reset" ? "Học viên đặt lại mật khẩu thành công" : "Học viên đổi mật khẩu thành công",
      }),
    });
  } catch {
    // Activity logging must not block a successful password update.
  }
}

export function ChangePasswordForm({authProvider="supabase"}:{authProvider?:"supabase"|"native-d1"}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const nextPath = (authProvider === "native-d1" ? getSafeNativeAppBridgePath(searchParams.get("next")) : null) ?? getSafeNextPath(searchParams.get("next"), authProvider === "native-d1" ? "/learn/facebook-ads-2026" : mode === "account" ? "/tai-khoan" : "/dashboard");
  const [operationId] = useState(() => authProvider === "native-d1" ? crypto.randomUUID() : null);
  const resetError = searchParams.get("error");
  const [message, setMessage] = useState(resetError ? "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới." : "");
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

    if (authProvider === "native-d1") {
      try {
        await withNativeAuthMutation(async()=>{
          const currentPassword = String(formData.get("currentPassword") ?? "");
          if (mode === "reset") { setMessage("Đặt lại mật khẩu tạm thời chưa khả dụng. Vui lòng liên hệ hỗ trợ."); return; }
          if (!currentPassword || !operationId) { setMessage("Vui lòng nhập mật khẩu hiện tại."); return; }
          if (new TextEncoder().encode(password).length > 72) { setMessage("Mật khẩu mới quá dài. Vui lòng chọn mật khẩu ngắn hơn."); return; }
          if (password === currentPassword) { setMessage("Vui lòng chọn mật khẩu mới khác mật khẩu hiện tại."); return; }
          const response = await fetch("/api/cloudflare-auth/change-password", {method:"POST",signal:AbortSignal.timeout(20000),headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword,newPassword:password,operationId})});
          const result = await response.json().catch(() => null);
          if (!response.ok || result?.ok !== true || result.reauthenticate !== true) {
            setMessage(response.status === 401 ? "Phiên hoặc mật khẩu hiện tại chưa hợp lệ. Vui lòng kiểm tra lại." : "Chưa xác nhận được thay đổi. Vui lòng thử lại hoặc đăng nhập lại bằng mật khẩu mới.");
            return;
          }
          window.location.assign('/dang-nhap?' + new URLSearchParams({passwordChanged:'1',next:nextPath}));
        });
      } catch (error) {
        setMessage(error instanceof NativeAuthCoordinationError?error.message:"Chưa xác nhận được thay đổi. Vui lòng thử lại hoặc đăng nhập lại bằng mật khẩu mới.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    try {
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

    void recordPasswordChangedActivity(mode);
    router.push(nextPath);
    router.refresh();
    } catch {
      setMessage("Chưa kết nối được hệ thống. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {authProvider === "native-d1" ? <div className="grid gap-2">
        <label htmlFor="current-password" className="text-sm font-bold text-slate-900">Mật khẩu hiện tại</label>
        <input className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20" name="currentPassword" id="current-password" autoComplete="current-password" required type="password" />
        <p className="text-sm text-slate-600">Sau khi đổi mật khẩu, bạn cần đăng nhập lại. Bạn sẽ đăng nhập bằng mật khẩu mới để tiếp tục.</p>
      </div> : null}
      <div className="grid gap-2">
        <label htmlFor="new-password" className="text-sm font-bold text-slate-900">Mật khẩu mới</label>
        <input
          className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
          minLength={8}
          name="password"
          id="new-password"
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          required
          type="password"
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="confirm-password" className="text-sm font-bold text-slate-900">Nhập lại mật khẩu mới</label>
        <input
          className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
          minLength={8}
          name="confirmPassword"
          id="confirm-password"
          autoComplete="new-password"
          placeholder="Nhập lại để xác nhận"
          required
          type="password"
        />
      </div>
      {message ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">
          {message}
        </p>
      ) : null}
      <Button isLoading={isSubmitting} loadingLabel="Đang cập nhật..." type="submit">
        Lưu mật khẩu và tiếp tục
      </Button>
    </form>
  );
}
