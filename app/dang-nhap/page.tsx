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
      <section className="ai-shell grid gap-8 pb-24 pt-32 sm:pt-40 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="ai-kicker">Học viên</p>
          <h1 className="ai-glow-text mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Đăng nhập hệ thống.
          </h1>
          <p className="ai-muted mt-6 text-lg leading-9">
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
