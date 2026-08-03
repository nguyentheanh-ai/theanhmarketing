"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { HeaderMobileActions } from "@/components/site/header-auth-actions";

export function MobileMenu({ items }: { items: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="relative lg:hidden">
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={open ? "Đóng menu" : "Mở menu"}
        className="grid size-10 place-items-center rounded-full border border-[var(--tam-line)] bg-white text-[var(--tam-ink)] shadow-sm"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-12 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-[var(--tam-line)] bg-white p-3 shadow-[var(--tam-shadow-hover)]"
          id={menuId}
        >
          <nav aria-label="Điều hướng điện thoại" className="grid gap-1">
            {items.map((item) => (
              <Link
                className="rounded-xl px-4 py-3 text-sm font-bold text-[var(--tam-ink)] transition hover:bg-[var(--tam-accent-soft)] hover:text-[var(--tam-accent-strong)]"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-[var(--tam-line)]" />
            <div className="grid gap-1 rounded-xl bg-[var(--tam-accent-soft)] px-4 py-3 text-sm font-black text-[var(--tam-ink)]" onClick={() => setOpen(false)}>
              <HeaderMobileActions />
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
