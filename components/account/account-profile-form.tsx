"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function recordProfileActivity(title: string) {
  try {
    await fetch("/api/student/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "profile_updated", title }) });
  } catch { /* Logging must not block an authenticated update. */ }
}

export function AccountProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [profileMessage, setProfileMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim().slice(0, 120);
    const normalizedPhone = String(form.get("phone") || "").replace(/[^0-9+() .-]/g, "").trim().slice(0, 24);
    if (!full_name || normalizedPhone.length < 8) return setProfileMessage("Vui lòng kiểm tra họ tên và số điện thoại.");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setProfileMessage("Chưa cấu hình dịch vụ tài khoản.");
    const { error } = await supabase.auth.updateUser({ data: { full_name, phone: normalizedPhone } });
    setProfileMessage(error ? error.message : "Đã cập nhật thông tin tài khoản.");
    if (!error) await recordProfileActivity("Học viên cập nhật tên hoặc số điện thoại");
  }

  async function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") || "").trim().toLowerCase();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setEmailMessage("Chưa cấu hình dịch vụ tài khoản.");
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setEmailMessage(error ? error.message : "Hãy kiểm tra email mới để xác nhận thay đổi.");
    if (!error) await recordProfileActivity("Học viên yêu cầu đổi email");
  }

  return (
    <div className="grid gap-5">
      <form className="tam-card grid gap-4 p-6" onSubmit={updateProfile}>
        <h2 className="text-xl font-black text-[var(--tam-ink)]">Thông tin cá nhân</h2>
        <label className="grid gap-2 text-sm font-bold">Họ tên<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" defaultValue={name} name="full_name" required /></label>
        <label className="grid gap-2 text-sm font-bold">Số điện thoại<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" defaultValue={phone} name="phone" required /></label>
        {profileMessage ? <p className="text-sm font-semibold text-[var(--tam-muted)]">{profileMessage}</p> : null}
        <Button type="submit">Lưu thông tin</Button>
      </form>
      <form className="tam-card grid gap-4 p-6" onSubmit={updateEmail}>
        <h2 className="text-xl font-black text-[var(--tam-ink)]">Email đăng nhập</h2>
        <label className="grid gap-2 text-sm font-bold">Email<input className="min-h-12 rounded-2xl border border-[var(--tam-line)] px-4" defaultValue={email} name="email" required type="email" /></label>
        <p className="text-sm font-medium leading-6 text-[var(--tam-muted)]">Email mới chỉ được áp dụng sau khi bạn hoàn tất bước xác minh trong hộp thư.</p>
        {emailMessage ? <p className="text-sm font-semibold text-[var(--tam-muted)]">{emailMessage}</p> : null}
        <Button type="submit" variant="secondary">Yêu cầu đổi email</Button>
      </form>
    </div>
  );
}
