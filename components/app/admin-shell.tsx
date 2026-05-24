"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminRole } from "@/lib/auth/session";

const adminNavGroups = [
  {
    label: "Vận hành",
    items: [
      { label: "Tổng quan", href: "/admin/dashboard", shortcut: "01", allowedRoles: ["owner"] },
      { label: "Lead CRM", href: "/admin/leads", shortcut: "02", allowedRoles: ["owner"] },
      { label: "Đơn hàng", href: "/admin/don-hang", shortcut: "03", allowedRoles: ["owner"] },
      { label: "Remarketing", href: "/admin/remarketing", shortcut: "04", allowedRoles: ["owner"] },
      { label: "Học viên", href: "/admin/hoc-vien", shortcut: "05", allowedRoles: ["owner"] },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { label: "CMS", href: "/admin/cms", shortcut: "06", allowedRoles: ["owner", "editor"] },
      { label: "Khóa học", href: "/admin/khoa-hoc", shortcut: "07", allowedRoles: ["owner", "editor"] },
      { label: "Bài viết", href: "/admin/bai-viet", shortcut: "08", allowedRoles: ["owner", "editor"] },
      { label: "Tài liệu", href: "/admin/tai-lieu", shortcut: "09", allowedRoles: ["owner", "editor"] },
      { label: "Feedback", href: "/admin/feedback", shortcut: "10", allowedRoles: ["owner", "editor"] },
    ],
  },
  {
    label: "Cấu hình",
    items: [{ label: "SEO/Tracking", href: "/admin/seo", shortcut: "11", allowedRoles: ["owner"] }],
  },
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; shortcut: string; allowedRoles: AdminRole[] }>;
}>;

function canShowItem(item: { allowedRoles?: AdminRole[] }, adminRole: AdminRole) {
  return !item.allowedRoles || item.allowedRoles.includes(adminRole);
}

const quickActions = [
  { label: "Thêm lead", href: "/admin/leads", allowedRoles: ["owner"] },
  { label: "Tạo học viên", href: "/admin/hoc-vien", allowedRoles: ["owner"] },
  { label: "Tạo khóa học", href: "/admin/khoa-hoc", allowedRoles: ["owner", "editor"] },
] satisfies Array<{ label: string; href: string; allowedRoles: AdminRole[] }>;

export function AdminShell({ children, adminRole }: { children: ReactNode; adminRole: AdminRole }) {
  const pathname = usePathname();
  const visibleNavGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canShowItem(item, adminRole)),
    }))
    .filter((group) => group.items.length > 0);
  const adminNav = visibleNavGroups.flatMap((group) => group.items);
  const visibleQuickActions = quickActions.filter((item) => canShowItem(item, adminRole));

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-[#080c14] p-4 text-white shadow-[18px_0_55px_rgba(0,0,0,0.24)] lg:flex">
        <Link
          href={adminRole === "editor" ? "/admin/cms" : "/admin/dashboard"}
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-sky-300/30 hover:bg-white/[0.07]"
        >
          <span className="grid size-11 place-items-center overflow-hidden rounded-md bg-white p-1.5">
            <Image
              alt="The Anh Marketing"
              className="size-full object-contain"
              height={72}
              priority
              src="/brand/ta-logo.svg"
              unoptimized
              width={72}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-4">The Anh Marketing</span>
            <span className="mt-0.5 block text-xs font-medium text-slate-400">
              {adminRole === "editor" ? "Editor Workspace" : "AI Growth OS"}
            </span>
          </span>
        </Link>

        <label className="mt-4 flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-400">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Global search"
            className="w-full bg-transparent outline-none placeholder:text-slate-500"
            placeholder="Tìm module..."
            type="search"
          />
        </label>

        <nav className="mt-6 grid min-h-0 flex-1 gap-6 overflow-y-auto pr-1">
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-bold uppercase text-slate-500">{group.label}</p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "border border-sky-300/22 bg-sky-400/12 text-white shadow-[0_0_28px_rgba(56,189,248,0.14)]"
                          : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[11px] font-bold ${isActive ? "text-sky-200" : "text-slate-600"}`}>
                        {item.shortcut}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase text-slate-500">Realtime</p>
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.75)]" />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {adminRole === "editor"
              ? "Biên tập nội dung website, khóa học, bài viết và tài liệu."
              : "Lead, thanh toán và quyền học đồng bộ từ hệ thống chính."}
          </p>
          <SignOutButton mode="admin" className="mt-3 w-full rounded-md border border-white/12 px-3 py-2 text-left text-sm font-semibold text-slate-300 transition hover:bg-white hover:text-slate-950 disabled:opacity-50" />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0f19]/92 px-4 py-3 text-white backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href={adminRole === "editor" ? "/admin/cms" : "/admin/dashboard"} className="flex items-center gap-2 font-bold">
            <span className="grid size-9 place-items-center overflow-hidden rounded-md bg-white p-1">
              <Image
                alt="The Anh Marketing"
                className="size-full object-contain"
                height={64}
                priority
                src="/brand/ta-logo.svg"
                unoptimized
                width={64}
              />
            </span>
            <span>AI Growth OS</span>
          </Link>
          <SignOutButton mode="admin" className="rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-slate-300 disabled:opacity-50" />
        </div>
        <nav className="mobile-nav-scroll mt-3 flex gap-2 overflow-x-auto">
          {adminNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive ? "bg-sky-400 text-slate-950" : "bg-white/[0.07] text-slate-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="lg:ml-72">
        <div className="sticky top-0 z-30 hidden border-b border-white/10 bg-[#0b0f19]/88 px-8 py-4 backdrop-blur-xl xl:px-10 lg:block">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label className="flex h-10 w-full max-w-xl items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm text-slate-400">
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="Global search"
                  className="w-full bg-transparent outline-none placeholder:text-slate-500"
                  placeholder="Tìm lead, đơn hàng, học viên hoặc khóa học..."
                  type="search"
                />
              </label>
              <span className="shrink-0 rounded-md border border-amber-200/18 bg-amber-200/8 px-3 py-2 text-xs font-bold uppercase text-amber-100">
                Realtime
              </span>
            </div>
            <div className="flex items-center gap-2">
              {visibleQuickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-sky-300/30 hover:bg-sky-400/12 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:px-10">{children}</div>
      </section>
    </main>
  );
}
