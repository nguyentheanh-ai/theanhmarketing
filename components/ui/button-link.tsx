import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md" | "lg";
  className?: string;
  target?: string;
  rel?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "lg",
  className = "",
  target,
  rel,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant, size, className })}
      target={target}
      rel={rel}
    >
      {children}
    </Link>
  );
}
