import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const toneStyles: Record<Tone, string> = {
  success: "bg-emerald-300/10 text-emerald-100 border-emerald-300/25",
  warning: "bg-amber-300/10 text-amber-100 border-amber-300/25",
  danger: "bg-red-300/10 text-red-100 border-red-300/25",
  neutral: "bg-white/8 text-white/55 border-white/10",
  info: "bg-[#159cfb]/15 text-sky-100 border-[#77d7ff]/25",
};

export function AdminPanel({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={`ai-panel ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-black ${toneStyles[tone]}`}>
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
    <div className="flex flex-col gap-4 border-b border-[#77d7ff]/15 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="ai-kicker">{eyebrow}</p>
        <h1 className="ai-glow-text mt-3 text-3xl font-black tracking-[-0.035em] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="ai-muted mt-3 max-w-3xl text-sm leading-6">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#77d7ff]/20 bg-white/5 p-5 text-sm">
      <p className="font-black text-white/75">{title}</p>
      <p className="mt-2 leading-6 text-white/50">{description}</p>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-black text-white/60 transition hover:text-white">
      {children}
    </Link>
  );
}
