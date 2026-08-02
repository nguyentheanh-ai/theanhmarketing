import { ArrowUpRight, CircleCheck } from "lucide-react";
import Link from "next/link";

export function ProblemSelector({ items }: { items: Array<{ description: string; href: string; points: string[]; title: string }> }) {
  return (
    <div className="tam-stagger mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link className="tam-card tam-lift group flex min-h-64 flex-col p-6" href={item.href} key={item.title}>
          <div className="flex items-start justify-between gap-4">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--tam-accent-soft)] text-[var(--tam-accent)]">
              <CircleCheck size={19} aria-hidden="true" />
            </span>
            <ArrowUpRight className="text-slate-300 transition group-hover:text-[var(--tam-accent)]" size={19} aria-hidden="true" />
          </div>
          <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-[var(--tam-ink)]">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--tam-muted)]">{item.description}</p>
          <ul className="mt-5 grid gap-2 text-xs font-bold text-slate-600">
            {item.points.map((point) => <li className="flex gap-2" key={point}><span className="text-[var(--tam-accent)]">✓</span>{point}</li>)}
          </ul>
        </Link>
      ))}
    </div>
  );
}
