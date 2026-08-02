"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FormStatus = { tone: "success" | "error"; text: string } | null;
type AccountChange = "email" | "password" | null;

const inputClasses =
  "min-h-13 w-full rounded-2xl border border-[#cfe8f8] bg-white px-4 text-[15px] font-semibold text-[#12335b] outline-none transition placeholder:text-[#8aa7bd] focus:border-[#159cfb] focus:ring-4 focus:ring-[#159cfb]/10 disabled:cursor-not-allowed disabled:bg-[#eef8ff] disabled:text-[#6486a2]";

function friendlyAccountError(message: string) {
  if (/same password|different from the old password/i.test(message)) return "Mật khẩu mới cần khác mật khẩu hiện tại.";
  if (/already registered|already been registered/i.test(message)) return "Email này đã được sử dụng cho một tài khoản khác.";
  if (/rate limit|too many requests/i.test(message)) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
  return "Chưa cập nhật được. Vui lòng kiểm tra thông tin và thử lại.";
}

async function recordAccountActivity(eventType: string, title: string) {
  try {
    await fetch("/api/student/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, title }),
    });
  } catch {
    // Activity logging must not block a successful account update.
  }
}

function StatusMessage({ status }: { status: FormStatus }) {
  if (!status) return null;
  const success = status.tone === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <p
      aria-live="polite"
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
        success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      {status.text}
    </p>
  );
}

function SectionHeading({ icon: Icon, title, description }: { icon: typeof UserRound; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf7ff] text-[#087dc6]">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-xl font-black text-[#12335b]">{title}</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#6486a2]">{description}</p>
      </div>
    </div>
  );
}

export function AccountProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const [profileStatus, setProfileStatus] = useState<FormStatus>(null);
  const [emailStatus, setEmailStatus] = useState<FormStatus>(null);
  const [passwordStatus, setPasswordStatus] = useState<FormStatus>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeChange, setActiveChange] = useState<AccountChange>(null);

  function closeChange() {
    setActiveChange(null);
    setEmailStatus(null);
    setPasswordStatus(null);
    setShowPassword(false);
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileStatus(null);
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim().slice(0, 120);
    const normalizedPhone = String(form.get("phone") || "").replace(/[^0-9+() .-]/g, "").trim().slice(0, 24);
    if (!full_name || normalizedPhone.length < 8) {
      setProfileStatus({ tone: "error", text: "Vui lòng nhập họ tên và số điện thoại hợp lệ." });
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setProfileStatus({ tone: "error", text: "Chưa kết nối được dịch vụ tài khoản." });
    setProfileLoading(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name, phone: normalizedPhone } });
    setProfileLoading(false);
    if (error) return setProfileStatus({ tone: "error", text: friendlyAccountError(error.message) });
    setProfileStatus({ tone: "success", text: "Đã lưu họ tên và số điện thoại." });
    await recordAccountActivity("profile_updated", "Học viên cập nhật tên hoặc số điện thoại");
  }

  async function updateEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailStatus(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nextEmail = String(form.get("new_email") || "").trim().toLowerCase();
    if (!nextEmail || nextEmail === email.toLowerCase()) {
      setEmailStatus({ tone: "error", text: "Vui lòng nhập một email mới khác email hiện tại." });
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setEmailStatus({ tone: "error", text: "Chưa kết nối được dịch vụ tài khoản." });
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setEmailLoading(false);
    if (error) return setEmailStatus({ tone: "error", text: friendlyAccountError(error.message) });
    formElement.reset();
    setEmailStatus({ tone: "success", text: "Đã gửi yêu cầu. Hãy kiểm tra email mới để xác nhận thay đổi." });
    await recordAccountActivity("profile_updated", "Học viên yêu cầu đổi email");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("current_password") || "");
    const newPassword = String(form.get("new_password") || "");
    const confirmation = String(form.get("confirm_password") || "");
    if (!currentPassword) {
      setPasswordStatus({ tone: "error", text: "Vui lòng nhập mật khẩu hiện tại." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ tone: "error", text: "Mật khẩu mới cần tối thiểu 8 ký tự." });
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordStatus({ tone: "error", text: "Hai lần nhập mật khẩu chưa khớp." });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordStatus({ tone: "error", text: "Mật khẩu mới cần khác mật khẩu hiện tại." });
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setPasswordStatus({ tone: "error", text: "Chưa kết nối được dịch vụ tài khoản." });
    setPasswordLoading(true);
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verificationError) {
      setPasswordLoading(false);
      setPasswordStatus({ tone: "error", text: "Mật khẩu hiện tại chưa đúng." });
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false, password_changed_at: new Date().toISOString() },
    });
    setPasswordLoading(false);
    if (error) return setPasswordStatus({ tone: "error", text: friendlyAccountError(error.message) });
    formElement.reset();
    setShowPassword(false);
    setPasswordStatus({ tone: "success", text: "Đã đổi mật khẩu. Bạn có thể tiếp tục sử dụng tài khoản ngay." });
    await recordAccountActivity("password_changed", "Học viên đổi mật khẩu thành công");
  }

  return (
    <div className="grid gap-5">
      <form className="tam-card grid gap-5 p-6 sm:p-7" onSubmit={updateProfile}>
        <SectionHeading icon={UserRound} title="Thông tin cá nhân" description="Tên và số điện thoại dùng khi hỗ trợ hoặc xác nhận dịch vụ." />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#31597a]">Họ tên<input className={inputClasses} defaultValue={name} name="full_name" required /></label>
          <label className="grid gap-2 text-sm font-black text-[#31597a]">Số điện thoại<input className={inputClasses} defaultValue={phone} inputMode="tel" name="phone" placeholder="Ví dụ: 0901234567" required /></label>
        </div>
        <StatusMessage status={profileStatus} />
        <button className="min-h-12 w-full rounded-2xl bg-[#159cfb] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(21,156,251,0.24)] transition hover:bg-[#087dc6] disabled:opacity-60 sm:w-fit" disabled={profileLoading} type="submit">{profileLoading ? "Đang lưu..." : "Lưu thông tin"}</button>
      </form>

      <section className="tam-card grid gap-5 p-6 sm:p-7">
        <SectionHeading icon={LockKeyhole} title="Đổi thông tin tài khoản" description="Chỉ mở nội dung bạn cần thay đổi để tránh thao tác nhầm." />

        {activeChange === null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#cfe8f8] bg-[#f4fbff] p-4 text-left transition hover:border-[#9bd8fb] hover:bg-[#eaf7ff]" onClick={() => setActiveChange("email")} type="button">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[#087dc6]"><Mail className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-black text-[#12335b]">Đổi email</span><span className="mt-1 block text-xs font-semibold text-[#6486a2]">Cập nhật email dùng để đăng nhập</span></span>
              <ChevronRight className="size-5 shrink-0 text-[#6486a2]" />
            </button>
            <button className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#cfe8f8] bg-[#f4fbff] p-4 text-left transition hover:border-[#9bd8fb] hover:bg-[#eaf7ff]" onClick={() => setActiveChange("password")} type="button">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[#3156d3]"><LockKeyhole className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-black text-[#12335b]">Đổi mật khẩu</span><span className="mt-1 block text-xs font-semibold text-[#6486a2]">Yêu cầu mật khẩu hiện tại</span></span>
              <ChevronRight className="size-5 shrink-0 text-[#6486a2]" />
            </button>
          </div>
        ) : null}

        {activeChange === "email" ? (
          <form className="grid gap-5 rounded-[24px] border border-[#d8edf9] bg-[#f8fcff] p-5" onSubmit={updateEmail}>
            <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-black text-[#12335b]">Đổi email đăng nhập</h3><button className="inline-flex items-center gap-1 text-sm font-black text-[#087dc6]" onClick={closeChange} type="button"><ArrowLeft className="size-4" />Quay lại</button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#31597a]">Email hiện tại<input className={inputClasses} disabled value={email} /></label>
              <label className="grid gap-2 text-sm font-black text-[#31597a]">Email mới<input autoComplete="email" className={inputClasses} name="new_email" placeholder="Nhập email mới" required type="email" /></label>
            </div>
            <p className="text-sm font-semibold leading-6 text-[#6486a2]">Email mới chỉ có hiệu lực sau khi bạn xác nhận trong hộp thư.</p>
            <StatusMessage status={emailStatus} />
            <button className="min-h-12 w-full rounded-2xl border border-[#9bd8fb] bg-[#eaf7ff] px-5 text-sm font-black text-[#087dc6] transition hover:border-[#159cfb] hover:bg-[#dff3ff] disabled:opacity-60 sm:w-fit" disabled={emailLoading} type="submit">{emailLoading ? "Đang gửi yêu cầu..." : "Gửi xác nhận đổi email"}</button>
          </form>
        ) : null}

        {activeChange === "password" ? (
          <form className="grid gap-5 rounded-[24px] border border-[#d8edf9] bg-[#f8fcff] p-5" onSubmit={updatePassword}>
            <div className="flex items-center justify-between gap-4"><h3 className="text-lg font-black text-[#12335b]">Đổi mật khẩu</h3><button className="inline-flex items-center gap-1 text-sm font-black text-[#087dc6]" onClick={closeChange} type="button"><ArrowLeft className="size-4" />Quay lại</button></div>
            <label className="grid gap-2 text-sm font-black text-[#31597a]">
              Mật khẩu hiện tại
              <span className="relative"><input autoComplete="current-password" className={`${inputClasses} pr-12`} name="current_password" placeholder="Nhập mật khẩu đang dùng" required type={showPassword ? "text" : "password"} /><button aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#6486a2] hover:text-[#087dc6]" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-[#31597a]">Mật khẩu mới<input autoComplete="new-password" className={inputClasses} minLength={8} name="new_password" placeholder="Tối thiểu 8 ký tự" required type={showPassword ? "text" : "password"} /></label>
              <label className="grid gap-2 text-sm font-black text-[#31597a]">Nhập lại mật khẩu mới<input autoComplete="new-password" className={inputClasses} minLength={8} name="confirm_password" placeholder="Nhập lại để xác nhận" required type={showPassword ? "text" : "password"} /></label>
            </div>
            <StatusMessage status={passwordStatus} />
            <button className="min-h-12 w-full rounded-2xl bg-[#3156d3] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(49,86,211,0.2)] transition hover:bg-[#2445b7] disabled:opacity-60 sm:w-fit" disabled={passwordLoading} type="submit">{passwordLoading ? "Đang đổi mật khẩu..." : "Cập nhật mật khẩu"}</button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
