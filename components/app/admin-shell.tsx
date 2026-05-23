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
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-[#080b12] p-5 text-white shadow-[18px_0_55px_rgba(15,23,42,0.18)] lg:flex">
        <Link href="/admin/dashboard" className="block rounded-2xl border border-white/12 bg-white/[0.05] p-4">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            CRM Admin
          </span>
          <span className="mt-2 block text-lg font-black tracking-[-0.03em]">
            The Anh Marketing
          </span>
        </Link>

        <nav className="mt-6 grid min-h-0 flex-1 gap-6 overflow-y-auto pr-1">
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
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-white text-slate-950 shadow-[0_12px_32px_rgba(255,255,255,0.14)]"
                          : "text-white/62 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[11px] font-black ${isActive ? "text-slate-500" : "text-white/25"}`}>
                        {item.shortcut}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.05] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Phiên làm việc
          </p>
          <SignOutButton mode="admin" className="mt-3 w-full rounded-xl border border-white/15 px-3 py-2 text-left text-sm font-semibold text-white/65 transition hover:bg-white hover:text-slate-950 disabled:opacity-50" />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-5 py-4 text-slate-950 backdrop-blur-xl lg:hidden">
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
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${
                  isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <SignOutButton mode="admin" className="shrink-0 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" />
        </nav>
      </header>

      <section className="lg:ml-72">
        <div className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white/78 px-8 py-3 backdrop-blur-xl lg:block">
          <div className="flex items-center justify-between gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-full max-w-xl items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-400">
                Tìm lead, đơn hàng, học viên hoặc khóa học
              </div>
              <span className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                30 ngày
              </span>
            </div>
            <div className="flex items-center gap-2">
              {quickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
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
