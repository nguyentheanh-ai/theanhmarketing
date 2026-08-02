import { Bot, ChartNoAxesCombined, Database, Megaphone } from "lucide-react";

const icons = [Megaphone, Bot, ChartNoAxesCombined, Database];

export function GrowthEngineGrid({ engines }: { engines: Array<{ description: string; eyebrow: string; title: string }> }) {
  return (
    <div className="tam-stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {engines.map((engine, index) => {
        const Icon = icons[index] ?? Database;
        return (
          <article className="tam-card tam-lift p-6" key={engine.title}>
            <Icon className="text-[var(--tam-accent)]" size={25} aria-hidden="true" />
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--tam-accent-strong)]">{engine.eyebrow}</p>
            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-[var(--tam-ink)]">{engine.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--tam-muted)]">{engine.description}</p>
          </article>
        );
      })}
    </div>
  );
}
