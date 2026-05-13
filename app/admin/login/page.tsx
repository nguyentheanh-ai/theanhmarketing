import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { SoftCard } from "@/components/ui/soft-card";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf7] px-5 py-16 text-[#0b0b0c] sm:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
          <h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-7xl">
            Đăng nhập quản trị
          </h1>
          <p className="mt-6 text-lg leading-9 text-black/65">
            Khu vực dành riêng cho quản trị viên Thế Anh Marketing để quản lý
            khóa học, nội dung, học viên và dữ liệu vận hành.
          </p>
        </div>
        <SoftCard>
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
        </SoftCard>
      </section>
    </main>
  );
}
