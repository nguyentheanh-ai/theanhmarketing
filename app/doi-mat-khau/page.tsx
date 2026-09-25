import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageShell } from "@/components/site/page-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getCurrentAuth } from "@/lib/auth/session";
import { shouldRequirePasswordChange } from "@/lib/auth/student-account";
import { getSafeNextPath } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Đổi mật khẩu",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params?.next, "/dashboard");
  const isPasswordResetMode = params?.mode === "reset";
  const isAccountMode = params?.mode === "account";
  const { user } = await getCurrentAuth();

  if (!user && !isPasswordResetMode) {
    const returnPath = `/doi-mat-khau?next=${encodeURIComponent(nextPath)}${isAccountMode ? "&mode=account" : ""}`;
    redirect(`/dang-nhap?next=${encodeURIComponent(returnPath)}`);
  }

  if (user && !isPasswordResetMode && !isAccountMode && !shouldRequirePasswordChange(user)) {
    redirect(nextPath);
  }

  return (
    <PageShell>
      <section className="ai-shell grid gap-8 pb-24 pt-32 sm:pt-40 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="ai-kicker">Bảo mật tài khoản</p>
          <h1 className="ai-glow-text mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            {isPasswordResetMode ? "Đặt lại mật khẩu." : isAccountMode ? "Đổi mật khẩu." : "Đổi mật khẩu lần đầu."}
          </h1>
          <p className="ai-muted mt-6 text-lg leading-9">
            Chọn mật khẩu riêng để bảo vệ tài khoản. Sau khi lưu, bạn sẽ được đưa về trang đang muốn truy cập.
          </p>
        </div>
        <SoftCard>
          <Suspense fallback={null}>
            <ChangePasswordForm />
          </Suspense>
        </SoftCard>
      </section>
    </PageShell>
  );
}

// Keep student data round trips in the database region (Supabase ap-southeast-2).
export const preferredRegion = "syd1";
