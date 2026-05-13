import type { ComponentPropsWithoutRef, ReactNode } from "react";

type SoftCardProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

export function SoftCard({ children, className = "", ...props }: SoftCardProps) {
  return (
    <div
      {...props}
      className={`rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}
