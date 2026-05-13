"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import type { Course } from "@/data/courses";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RegisterForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const password = String(formData.get("password") ?? "");
    const course = String(formData.get("course") ?? "");
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          interested_course: course,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.from("leads").insert({
      name: fullName,
      phone,
      email,
      message: `Đăng ký học: ${course}`,
      source: "signup",
    });

    setMessage(
      "Đã tạo hồ sơ. Nếu Supabase đang bật xác nhận email, học viên cần xác nhận email. Để cho đăng nhập ngay, tắt Confirm email trong Supabase Auth settings.",
    );
    setIsSubmitting(false);
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
        redirectTo: `${window.location.origin}/dashboard`,
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
          Đăng ký / đăng nhập với Google
        </Button>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-black/35">
          <span className="h-px flex-1 bg-black/10" />
          hoặc tạo bằng email
          <span className="h-px flex-1 bg-black/10" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-black/60">Họ và tên</label>
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none transition focus:border-black/30"
            name="name"
            placeholder="Nhập họ tên"
            required
          />
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
            minLength={6}
            name="password"
            placeholder="Tối thiểu 6 ký tự"
            required
            type="password"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-black/60">
            Số điện thoại/Zalo
          </label>
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4 outline-none transition focus:border-black/30"
            name="phone"
            placeholder="090..."
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-black/60">
            Khóa học quan tâm
          </label>
          <select
            className="min-h-12 rounded-2xl border border-black/10 bg-white px-4 outline-none transition focus:border-black/30"
            name="course"
          >
            {courses.map((course) => (
              <option key={course.slug}>{course.title}</option>
            ))}
          </select>
        </div>
        <label className="flex gap-3 text-sm leading-6 text-black/60">
          <input className="mt-1" required type="checkbox" />
          Tôi đồng ý để Thế Anh Marketing liên hệ tư vấn và tạo hồ sơ học viên
          cho khóa học đã chọn.
        </label>
        {message ? (
          <p className="rounded-2xl bg-[#f2eadf] p-4 text-sm font-semibold text-black/70">
            {message}
          </p>
        ) : null}
        <Button isLoading={isSubmitting} loadingLabel="Đang tạo hồ sơ..." type="submit">
          Tạo tài khoản học viên
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-black/55">
        Đã có tài khoản?{" "}
        <Link className="font-bold text-black" href="/dang-nhap">
          Đăng nhập
        </Link>
      </p>
      <div className="mt-6 rounded-2xl bg-[#f2eadf] p-4 text-sm leading-6 text-black/60">
        Demo quản trị:{" "}
        <ButtonLink href="/admin" variant="ghost" className="min-h-0 px-0">
          vào admin
        </ButtonLink>
      </div>
    </>
  );
}
