import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const toneStyles: Record<Tone, string> = {
  success: "bg-[#e9f7ef] text-[#1f7a4d] border-[#bfe6cf]",
  warning: "bg-[#fff5df] text-[#9a6418] border-[#f0d394]",
  danger: "bg-[#fff0ed] text-[#b23b2f] border-[#f0b9b1]",
  neutral: "bg-[#f1f2f4] text-black/55 border-black/10",
  info: "bg-[#edf4ff] text-[#285f9f] border-[#c8dcf8]",
};

export function AdminPanel({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={`rounded-lg border border-black/10 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.04)] ${className}`}
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
    <div className="flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8f6124]">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#111315] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/58">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-black/15 bg-[#fafafa] p-5 text-sm">
      <p className="font-black text-black/75">{title}</p>
      <p className="mt-2 leading-6 text-black/50">{description}</p>
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-black text-black/60 transition hover:text-black">
      {children}
    </Link>
  );
}
