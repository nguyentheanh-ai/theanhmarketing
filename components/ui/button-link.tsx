import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

const variants = {
  primary:
    "bg-black text-white shadow-[0_18px_40px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(0,0,0,0.2)]",
  secondary:
    "border border-black/10 bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:border-black/20",
  ghost: "text-black/60 hover:bg-black/[0.04] hover:text-black",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-bold leading-none transition-all duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2a23a] active:scale-[0.98] ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
