"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";

const adminNavGroups = [
  {
    label: "Vận hành",
    items: [
      { label: "Tổng quan", href: "/admin/dashboard", shortcut: "01" },
      { label: "Leads", href: "/admin/leads", shortcut: "02" },
      { label: "Đơn hàng", href: "/admin/don-hang", shortcut: "03" },
      { label: "Remarketing", href: "/admin/remarketing", shortcut: "04" },
      { label: "Học viên", href: "/admin/hoc-vien", shortcut: "05" },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { label: "CMS", href: "/admin/cms", shortcut: "06" },
      { label: "Khóa học", href: "/admin/khoa-hoc", shortcut: "07" },
      { label: "Bài viết", href: "/admin/bai-viet", shortcut: "08" },
      { label: "Tài liệu", href: "/admin/tai-lieu", shortcut: "09" },
      { label: "Feedback", href: "/admin/feedback", shortcut: "10" },
    ],
  },
  {
    label: "Cấu hình",
    items: [{ label: "SEO/Tracking", href: "/admin/seo", shortcut: "11" }],
  },
];

const adminNav = adminNavGroups.flatMap((group) => group.items);

const quickActions = [
  { label: "Thêm lead", href: "/admin/leads" },
  { label: "Tạo học viên", href: "/admin/hoc-vien" },
  { label: "Tạo khóa học", href: "/admin/khoa-hoc" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="admin-crm-shell ai-os-bg min-h-screen text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#77d7ff]/15 bg-[#05080d]/88 p-5 text-white backdrop-blur-2xl lg:block">
        <Link href="/admin/dashboard" className="block rounded-lg border border-[#77d7ff]/18 bg-white/[0.04] p-4">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            CRM Admin
          </span>
          <span className="mt-2 block text-lg font-black tracking-[-0.03em]">
            The Anh Marketing
          </span>
        </Link>
        <nav className="mt-6 grid gap-6">
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                {group.label}
              </p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.12)]"
                          : "text-white/62 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[11px] font-black ${isActive ? "text-black/35" : "text-white/25"}`}>
                        {item.shortcut}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-lg border border-[#77d7ff]/15 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Phiên làm việc
          </p>
          <SignOutButton mode="admin" className="mt-3 w-full rounded-md border border-white/15 px-3 py-2 text-left text-sm font-semibold text-white/65 transition hover:bg-white hover:text-black disabled:opacity-50" />
        </div>
      </aside>
      <header className="sticky top-0 z-40 border-b border-[#77d7ff]/15 bg-[#05080d]/88 px-5 py-4 backdrop-blur-xl lg:hidden">
        <Link href="/admin/dashboard" className="font-black tracking-[-0.03em]">
          CRM Admin · The Anh
        </Link>
        <nav className="mobile-nav-scroll mt-4 flex gap-2 overflow-x-auto">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold ${
                  isActive ? "bg-[#159cfb] text-white" : "bg-white/8 text-white/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <SignOutButton mode="admin" className="shrink-0 rounded-md bg-white/8 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" />
        </nav>
      </header>
      <section className="lg:ml-72">
        <div className="sticky top-0 z-30 hidden border-b border-[#77d7ff]/15 bg-[#05080d]/72 px-8 py-3 backdrop-blur-xl lg:block">
          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-full max-w-xl items-center rounded-lg border border-[#77d7ff]/15 bg-white/8 px-4 text-sm font-medium text-white/45">
                Tìm lead, đơn hàng, học viên hoặc khóa học
              </div>
              <span className="shrink-0 rounded-lg border border-[#77d7ff]/15 bg-white/8 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white/45">
                30 ngày
              </span>
            </div>
            <div className="flex items-center gap-2">
              {quickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-[#77d7ff]/15 bg-white/8 px-3 py-2 text-sm font-bold text-white/65 transition hover:border-[#77d7ff]/35 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-6 lg:px-8">{children}</div>
      </section>
    </main>
  );
}
