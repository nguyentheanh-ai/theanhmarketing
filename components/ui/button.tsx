import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "tap-motion inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-full text-center font-bold leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2a23a] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-black text-white shadow-[0_16px_36px_rgba(0,0,0,0.14)] hover:bg-black/86",
  secondary:
    "border border-black/10 bg-white text-black shadow-[0_10px_28px_rgba(0,0,0,0.05)] hover:border-black/25",
  ghost: "bg-transparent text-black/62 hover:bg-black/[0.05] hover:text-black",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
  quiet:
    "border border-black/10 bg-[#f7f3ec] text-black/70 hover:border-black/20 hover:bg-white hover:text-black",
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
