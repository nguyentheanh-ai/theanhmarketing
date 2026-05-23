import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const toneStyles: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
};

export function AdminPanel({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={`rounded-2xl border border-slate-200/80 bg-white text-slate-950 shadow-[0_20px_55px_rgba(15,23,42,0.07)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.03em] ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
      <p className="font-black text-slate-800">{title}</p>
      <p className="mt-2 leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-black text-[#159cfb] transition hover:text-[#0f6fb4]">
      {children}
    </Link>
  );
}
