import type { CSSProperties, ReactNode } from "react";

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`tam-reveal ${className}`.trim()}
      style={{ "--tam-reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
