import type { ReactNode } from "react";

export function PublicSectionHeading({
  action,
  align = "center",
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  align?: "center" | "left";
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="tam-eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-[1.1] tracking-[-0.045em] text-[var(--tam-ink)] sm:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--tam-muted)] sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
