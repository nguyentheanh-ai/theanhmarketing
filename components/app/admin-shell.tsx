"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminRole } from "@/lib/auth/session";

type ShellIconName = "home" | "lead" | "book" | "student" | "shield" | "settings";

const adminNavGroups = [
  {
    label: "Admin Panel",
    items: [
      { label: "Tổng quan", href: "/admin/dashboard", icon: "home", allowedRoles: ["owner"] },
      { label: "Quản lý Lead", href: "/admin/leads", icon: "lead", allowedRoles: ["owner"] },
      { label: "Khóa học", href: "/admin/khoa-hoc", icon: "book", allowedRoles: ["owner", "editor"] },
      { label: "Học viên", href: "/admin/hoc-vien", icon: "student", allowedRoles: ["owner", "editor"] },
      { label: "Thành viên admin", href: "/admin/thanh-vien-admin", icon: "shield", allowedRoles: ["owner"] },
      { label: "Cài đặt", href: "/admin/thanh-vien-admin", icon: "settings", allowedRoles: ["owner"] },
    ],
  },
] satisfies Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: ShellIconName; allowedRoles: AdminRole[] }>;
}>;

function canShowItem(item: { allowedRoles?: AdminRole[] }, adminRole: AdminRole) {
  return !item.allowedRoles || item.allowedRoles.includes(adminRole);
}

function ShellIcon({ name }: { name: ShellIconName }) {
  const baseProps = {
    className: "size-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "home") {
    return (
      <svg aria-hidden="true" {...baseProps}>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }

  if (name === "lead") {
    return (
      <svg aria-hidden="true" {...baseProps}>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }

  if (name === "book") {
    return (
      <svg aria-hidden="true" {...baseProps}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" />
      </svg>
    );
  }

  if (name === "student") {
    return (
      <svg aria-hidden="true" {...baseProps}>
        <path d="m22 10-10-5-10 5 10 5 10-5z" />
        <path d="M6 12v5c3 2 9 2 12 0v-5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg aria-hidden="true" {...baseProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...baseProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 19.1 2.1-2.1" />
      <path d="m17 7 2.1-2.1" />
    </svg>
  );
}

export function AdminShell({ children, adminRole }: { children: ReactNode; adminRole: AdminRole }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => pathname.startsWith("/admin/leads"));
  const { adminNav, visibleNavGroups } = useMemo(() => {
    const visibleNavGroups = adminNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canShowItem(item, adminRole)),
      }))
      .filter((group) => group.items.length > 0);

    return {
      adminNav: visibleNavGroups.flatMap((group) => group.items),
      visibleNavGroups,
    };
  }, [adminRole]);

  return (
    <main data-admin-theme="light" className="min-h-screen overflow-x-hidden bg-[#f7f8fb] text-slate-950">
      <button
        aria-label={isSidebarCollapsed ? "Mở menu quản trị" : "Ẩn menu quản trị"}
        className={`fixed top-4 z-50 hidden size-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:grid ${
          isSidebarCollapsed ? "left-4" : "left-[252px]"
        }`}
        onClick={() => setIsSidebarCollapsed((current) => !current)}
        title={isSidebarCollapsed ? "Mở menu quản trị" : "Ẩn menu quản trị"}
        type="button"
      >
        <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24">
          <path d={isSidebarCollapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
          <path d="M4 4h16v16H4z" />
        </svg>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 w-[244px] flex-col border-r border-slate-200 bg-white p-4 text-slate-950 ${
          isSidebarCollapsed ? "hidden" : "hidden lg:flex"
        }`}
      >
        <Link href={adminRole === "editor" ? "/admin/khoa-hoc" : "/admin/dashboard"} className="flex items-center gap-3 rounded-md bg-white p-1">
          <span className="grid size-11 place-items-center overflow-hidden rounded-md bg-blue-50 p-1.5 ring-1 ring-blue-100">
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
            <span className="mt-0.5 block text-xs font-semibold text-slate-500">Admin Panel</span>
          </span>
        </Link>

        <nav className="mt-8 grid min-h-0 flex-1 gap-5 overflow-y-auto pr-1">
          {visibleNavGroups.length > 0 ? (
            visibleNavGroups.map((group) => (
              <div key={group.label}>
                <div className="grid gap-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${
                          isActive
                            ? "border border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        <span className="grid size-5 place-items-center">
                          <ShellIcon name={item.icon} />
                        </span>
                        <span>{item.label}</span>
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
              : "Học viên, lead, khóa học và quyền admin."}
          </p>
          <SignOutButton
            mode="admin"
            className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 text-slate-950 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href={adminRole === "editor" ? "/admin/khoa-hoc" : "/admin/dashboard"} className="flex min-w-0 items-center gap-2 font-bold">
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

      <section className={isSidebarCollapsed ? "lg:ml-0" : "lg:ml-[244px]"}>
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-6 xl:px-10">{children}</div>
      </section>
    </main>
  );
}
