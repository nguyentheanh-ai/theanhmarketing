"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminRole } from "@/lib/auth/session";

const adminNavGroups = [
  {
    label: "Quản lý tập trung",
    items: [
      { label: "Học viên", href: "/admin/hoc-vien", shortcut: "01", allowedRoles: ["owner"] },
      { label: "Lead", href: "/admin/leads", shortcut: "02", allowedRoles: ["owner"] },
      { label: "Ads & doanh thu", href: "/admin/facebook-ads", shortcut: "03", allowedRoles: ["owner"] },
      { label: "Khóa học", href: "/admin/khoa-hoc", shortcut: "04", allowedRoles: ["owner", "editor"] },
      { label: "Thành viên admin", href: "/admin/thanh-vien-admin", shortcut: "05", allowedRoles: ["owner"] },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; shortcut: string; allowedRoles: AdminRole[] }>;
}>;

function canShowItem(item: { allowedRoles?: AdminRole[] }, adminRole: AdminRole) {
  return !item.allowedRoles || item.allowedRoles.includes(adminRole);
}

function normalizeModuleSearch(value: string) {
  return value.trim().toLowerCase();
}

const quickActions = [
  { label: "Thêm học viên", href: "/admin/hoc-vien", allowedRoles: ["owner"] },
  { label: "Thêm lead", href: "/admin/leads", allowedRoles: ["owner"] },
  { label: "Báo cáo ads", href: "/admin/facebook-ads", allowedRoles: ["owner"] },
] satisfies Array<{ label: string; href: string; allowedRoles: AdminRole[] }>;

export function AdminShell({ children, adminRole }: { children: ReactNode; adminRole: AdminRole }) {
  const pathname = usePathname();
  const [moduleSearch, setModuleSearch] = useState("");
  const { adminNav, visibleNavGroups, visibleQuickActions } = useMemo(() => {
    const keyword = normalizeModuleSearch(moduleSearch);
    const matchesModuleSearch = (item: { label: string; href: string }) => {
      if (!keyword) {
        return true;
      }

      return `${item.label} ${item.href}`.toLowerCase().includes(keyword);
    };
    const visibleNavGroups = adminNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canShowItem(item, adminRole) && matchesModuleSearch(item)),
      }))
      .filter((group) => group.items.length > 0);

    return {
      adminNav: visibleNavGroups.flatMap((group) => group.items),
      visibleNavGroups,
      visibleQuickActions: quickActions.filter((item) => canShowItem(item, adminRole) && matchesModuleSearch(item)),
    };
  }, [adminRole, moduleSearch]);

  return (
    <main data-admin-theme="light" className="min-h-screen overflow-x-hidden bg-[#f7f8fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 text-slate-950 lg:flex">
        <Link
          href={adminRole === "editor" ? "/admin/khoa-hoc" : "/admin/facebook-ads"}
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
              {adminRole === "editor" ? "Quản lý khóa học" : "Quản lý tập trung"}
            </span>
          </span>
        </Link>

        <label className="mt-4 flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Tìm module admin"
            className="w-full bg-transparent outline-none placeholder:text-slate-500"
            placeholder="Tìm module..."
            type="search"
            value={moduleSearch}
            onChange={(event) => setModuleSearch(event.target.value)}
          />
        </label>

        <nav className="mt-6 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1">
          {visibleNavGroups.length > 0 ? (
            visibleNavGroups.map((group) => (
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
            ))
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-500">
              Không có module phù hợp.
            </p>
          )}
        </nav>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Realtime</p>
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            {adminRole === "editor"
              ? "Biên tập và cập nhật nội dung khóa học."
              : "Học viên, lead, ads, doanh thu, khóa học và quyền admin."}
          </p>
          <SignOutButton
            mode="admin"
            className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 text-slate-950 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href={adminRole === "editor" ? "/admin/khoa-hoc" : "/admin/facebook-ads"} className="flex min-w-0 items-center gap-2 font-bold">
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
            <span className="truncate">Admin CRM</span>
          </Link>
          <SignOutButton mode="admin" className="hidden shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 sm:inline-block" />
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
                  aria-label="Tìm module admin"
                  className="w-full bg-transparent outline-none placeholder:text-slate-500"
                  placeholder="Tìm module quản lý..."
                  type="search"
                  value={moduleSearch}
                  onChange={(event) => setModuleSearch(event.target.value)}
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
