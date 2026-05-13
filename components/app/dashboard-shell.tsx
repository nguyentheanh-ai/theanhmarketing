import Link from "next/link";
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
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#0b0b0c]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-black/10 bg-white/70 p-6 backdrop-blur-xl lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-black text-sm font-bold text-white">
            {siteConfig.logoMark}
          </span>
          <span className="font-bold tracking-[-0.03em]">{siteConfig.name}</span>
        </Link>
        <nav className="mt-10 grid gap-2">
          {studentNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-3 text-sm font-semibold text-black/60 transition hover:bg-black hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton className="mt-8 rounded-full border border-black/10 px-4 py-3 text-left text-sm font-semibold text-black/50 transition hover:bg-black hover:text-white disabled:opacity-50" />
      </aside>
      <section className="px-5 py-8 lg:ml-72 lg:px-10">{children}</section>
    </main>
  );
}
