"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const adminNav = [
  { label: "Tổng quan", href: "/admin/dashboard" },
  { label: "CMS", href: "/admin/cms" },
  { label: "Database", href: "/admin/database" },
  { label: "Khóa học", href: "/admin/khoa-hoc" },
  { label: "Học viên", href: "/admin/hoc-vien" },
  { label: "Đơn hàng", href: "/admin/don-hang" },
  { label: "Bài viết", href: "/admin/bai-viet" },
  { label: "Tài liệu", href: "/admin/tai-lieu" },
  { label: "Feedback", href: "/admin/feedback" },
  { label: "Leads", href: "/admin/leads" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#0b0b0c]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-black/10 bg-[#101010] p-6 text-white lg:block">
        <Link href="/" className="text-lg font-black tracking-[-0.04em]">
          Admin · Thế Anh
        </Link>
        <nav className="mt-10 grid gap-2">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-black"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SignOutButton mode="admin" className="mt-8 rounded-full border border-white/15 px-4 py-3 text-left text-sm font-semibold text-white/60 transition hover:bg-white hover:text-black disabled:opacity-50" />
      </aside>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f6f4ef]/90 px-5 py-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="font-black tracking-[-0.04em]">
          Admin · Thế Anh
        </Link>
        <nav className="mt-4 flex gap-2 overflow-x-auto">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  isActive ? "bg-black text-white" : "bg-white text-black/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <SignOutButton mode="admin" className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" />
        </nav>
      </header>
      <section className="px-5 py-8 lg:ml-72 lg:px-10">{children}</section>
    </main>
  );
}
