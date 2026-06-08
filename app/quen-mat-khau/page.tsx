import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";

export const metadata: Metadata = {
  title: "Quên mật khẩu",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return (
    <PageShell>
      <section className="ai-shell grid gap-8 pb-24 pt-32 sm:pt-40 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="ai-kicker">Tài khoản</p>
          <h1 className="ai-glow-text mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Đặt lại mật khẩu.
          </h1>
          <p className="ai-muted mt-6 text-lg leading-9">
            Nhập email tài khoản để nhận hướng dẫn đặt lại mật khẩu qua email.
          </p>
        </div>
        <SoftCard>
          <ForgotPasswordForm />
        </SoftCard>
      </section>
    </PageShell>
  );
}
