import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "tap-motion inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-xl text-center font-bold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[#77d7ff]/35 bg-[#159cfb] text-white shadow-[0_0_28px_rgba(56,189,248,0.34)] hover:bg-[#37b6ff]",
  secondary:
    "border border-white/14 bg-white/8 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] hover:border-[#77d7ff]/35 hover:bg-white/12",
  ghost: "bg-transparent text-white/68 hover:bg-white/[0.08] hover:text-white",
  danger:
    "border border-red-300/30 bg-red-500/12 text-red-100 hover:border-red-300/50 hover:bg-red-500/20",
  quiet:
    "border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-xs",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-sm",
};

export function buttonClasses({
  variant = "primary",
  size = "lg",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingLabel?: string;
};

export function Button({
  children,
  className = "",
  disabled,
  isLoading = false,
  loadingLabel,
  size = "lg",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? loadingLabel ?? "Đang xử lý..." : children}
    </button>
  );
}
