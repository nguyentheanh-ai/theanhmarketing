"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

// Native (Cloudflare) reset: the one-time token arrives in the URL fragment so
// it never reaches server logs; it is removed from the address bar on load.
export function NativeResetPasswordForm() {
  const token = useRef<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
    token.current = value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("password") ?? "");
    if (!token.current) { setInvalid(true); return; }
    if (newPassword !== String(formData.get("confirm") ?? "")) { setMessage("Hai mật khẩu chưa khớp."); return; }
    setMessage(""); setIsSubmitting(true);
    const response = await fetch("/api/cloudflare-auth/recovery/complete", {
      method: "POST", signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.current, newPassword }),
    }).catch(() => null);
    const result = response ? ((await response.json().catch(() => null)) as { message?: string } | null) : null;
    setIsSubmitting(false);
    setMessage(result?.message || "Chưa đặt lại được mật khẩu. Anh/chị thử lại sau ít phút.");
    if (response?.ok) setDone(true);
  }

  const input = "auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20";
  if (done) return <div className="grid gap-4"><p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-900">{message}</p><Link className="text-sm font-bold text-sky-700" href="/dang-nhap?passwordChanged=1">Đăng nhập</Link></div>;
  if (invalid) return <div className="grid gap-4"><p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Link đặt lại mật khẩu không hợp lệ hoặc đã được dùng. Anh/chị yêu cầu link mới.</p><Link className="text-sm font-bold text-sky-700" href="/quen-mat-khau">Gửi lại link</Link></div>;
  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-bold text-slate-900">Mật khẩu mới<input className={input} name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-900">Nhập lại mật khẩu mới<input className={input} name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label>
      {message ? <p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-900">{message}</p> : null}
      <Button isLoading={isSubmitting} loadingLabel="Đang lưu..." type="submit">Lưu mật khẩu mới</Button>
    </form>
  );
}
