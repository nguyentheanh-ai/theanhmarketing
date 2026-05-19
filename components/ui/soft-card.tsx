import type { ComponentPropsWithoutRef, ReactNode } from "react";

type SoftCardProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

export function SoftCard({ children, className = "", ...props }: SoftCardProps) {
  return (
    <div
      {...props}
      className={`surface-motion ai-panel p-6 text-white ${className}`}
    >
      {children}
    </div>
  );
}
