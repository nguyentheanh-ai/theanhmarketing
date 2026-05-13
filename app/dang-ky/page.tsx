import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getCourses } from "@/services/courseService";

export const metadata: Metadata = {
  title: "Đăng ký học",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RegisterPage() {
  const courses = await getCourses();

  return (
    <PageShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 pt-40 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-semibold text-[#c77b20]">Đăng ký học</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Tạo hồ sơ học viên.
          </h1>
          <p className="mt-6 text-lg leading-9 text-black/65">
            Bản hiện tại đã kết nối Supabase Auth. Khi admin xác nhận thanh
            toán, học viên sẽ được gắn khóa học và mở quyền học trong dashboard.
          </p>
          <div className="mt-8 grid gap-4">
            {[
              "Tạo tài khoản học viên",
              "Chọn khóa học",
              "Admin xác nhận thanh toán",
              "Mở quyền học trong dashboard",
            ].map((item, index) => (
              <div key={item} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="pt-1 font-semibold text-black/70">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <SoftCard>
          <RegisterForm courses={courses} />
        </SoftCard>
      </section>
    </PageShell>
  );
}
