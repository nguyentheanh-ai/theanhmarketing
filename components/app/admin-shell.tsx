"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
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
  const { adminNav, visibleNavGroups, visibleQuickActions } = useMemo(() => {
    const visibleNavGroups = adminNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canShowItem(item, adminRole)),
      }))
      .filter((group) => group.items.length > 0);

    return {
      adminNav: visibleNavGroups.flatMap((group) => group.items),
      visibleNavGroups,
      visibleQuickActions: quickActions.filter((item) => canShowItem(item, adminRole)),
    };
  }, [adminRole]);

  return (
    <main data-admin-theme="light" className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 text-slate-950 lg:flex">
        <Link
          href={adminRole === "editor" ? "/admin/cms" : "/admin/dashboard"}
          className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3 hover:bg-slate-50"
        >
          <span className="grid size-10 place-items-center overflow-hidden rounded-md bg-slate-50 p-1.5 ring-1 ring-slate-200">
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
            <span className="block text-sm font-black leading-4">The Anh Marketing</span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-500">
              {adminRole === "editor" ? "Editor Workspace" : "AI Growth OS"}
            </span>
          </span>
        </Link>

        <label className="mt-4 flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Global search"
            className="w-full bg-transparent outline-none placeholder:text-slate-500"
            placeholder="Tìm module..."
            type="search"
          />
        </label>

        <nav className="mt-6 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1">
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-black uppercase text-slate-400">{group.label}</p>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-bold ${
                        isActive
                          ? "border border-blue-200 bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[11px] font-black ${isActive ? "text-blue-500" : "text-slate-400"}`}>
                        {item.shortcut}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Realtime</p>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            {adminRole === "editor"
              ? "Biên tập nội dung website, khóa học, bài viết và tài liệu."
              : "Lead, thanh toán và quyền học đồng bộ từ hệ thống chính."}
          </p>
          <SignOutButton
            mode="admin"
            className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 text-slate-950 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href={adminRole === "editor" ? "/admin/cms" : "/admin/dashboard"} className="flex items-center gap-2 font-bold">
            <span className="grid size-9 place-items-center overflow-hidden rounded-md bg-slate-50 p-1 ring-1 ring-slate-200">
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
          <SignOutButton mode="admin" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" />
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
                  isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="lg:ml-64">
        <div className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white px-8 py-4 xl:px-10 lg:block">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <label className="flex h-10 w-full max-w-xl items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="Global search"
                  className="w-full bg-transparent outline-none placeholder:text-slate-500"
                  placeholder="Tìm lead, đơn hàng, học viên hoặc khóa học..."
                  type="search"
                />
              </label>
              <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-700">
                Realtime
              </span>
            </div>
            <div className="flex items-center gap-2">
              {visibleQuickActions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
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
