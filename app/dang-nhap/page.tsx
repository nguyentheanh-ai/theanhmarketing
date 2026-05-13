import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <PageShell>
      <section className="mx-auto grid max-w-5xl gap-8 px-5 pb-24 pt-40 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold text-[#c77b20]">Học viên</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Đăng nhập hệ thống.
          </h1>
          <p className="mt-6 text-lg leading-9 text-black/65">
            Truy cập dashboard để xem khóa học, tiến độ, bài học tiếp theo và
            tài liệu đi kèm.
          </p>
        </div>
        <SoftCard>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </SoftCard>
      </section>
    </PageShell>
  );
}
