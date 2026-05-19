import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getCourses } from "@/services/courseService";

export const metadata: Metadata = {
  title: "Đăng ký Growth System",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RegisterPage() {
  const courses = await getCourses();

  return (
    <PageShell>
      <section className="ai-shell grid gap-8 pb-24 pt-32 sm:pt-40 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="ai-kicker">Đăng ký Growth System</p>
          <h1 className="ai-glow-text mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Tạo hồ sơ học viên và lead trong CRM.
          </h1>
          <p className="ai-muted mt-6 text-lg leading-9">
            Flow hiện tại đã có giỏ hàng và thanh toán Sepay tự động. Học viên chỉ cần tạo tài khoản, hệ thống sẽ tạo đơn, ghi nhận lead trong CRM và chuyển sang trang QR thanh toán.
          </p>
          <div className="mt-8 grid gap-4">
            {[
              "Chọn toolkit, workshop hoặc khóa học",
              "Tạo tài khoản học viên",
              "Chuyển khoản qua mã QR Sepay",
              "Hệ thống tự xác nhận và mở quyền học",
            ].map((item, index) => (
              <div key={item} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#159cfb] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <p className="pt-1 font-semibold text-white/70">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <SoftCard>
          <Suspense fallback={null}>
            <RegisterForm courses={courses} />
          </Suspense>
        </SoftCard>
      </section>
    </PageShell>
  );
}
