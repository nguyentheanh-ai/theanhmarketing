"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { siteConfig } from "@/data/site";

const studentNav = [
  { label: "Tổng quan", href: "/dashboard" },
  { label: "Khóa học của tôi", href: "/dashboard#khoa-hoc" },
  { label: "Tài liệu", href: "/dashboard#tai-lieu" },
  { label: "Thông báo", href: "/dashboard#thong-bao" },
  { label: "Hồ sơ", href: "/dashboard#ho-so" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="ai-os-bg ai-grid min-h-screen text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-[#77d7ff]/15 bg-[#07111d]/82 p-6 backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg border border-[#77d7ff]/20 bg-white/8 text-sm font-bold text-white">
            {siteConfig.logoMark}
          </span>
          <span className="font-bold tracking-[-0.03em] text-white">{siteConfig.name}</span>
        </Link>
        <nav className="mt-10 grid gap-2">
          {studentNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                pathname === item.href
                  ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                  : "text-white/62 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton className="mt-8 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white/62 transition hover:bg-white/10 hover:text-white disabled:opacity-50" />
      </aside>
      <section className="relative z-10 px-5 py-8 lg:ml-72 lg:px-10">{children}</section>
    </main>
  );
}
