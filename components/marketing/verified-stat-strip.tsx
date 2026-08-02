export function VerifiedStatStrip({ stats }: { stats: Array<{ label: string; value: string }> }) {
  return (
    <div className="tam-container">
      <div className="grid divide-y divide-[var(--tam-line)] border-y border-[var(--tam-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((stat) => (
          <div className="px-5 py-6 text-center" key={stat.label}>
            <p className="text-2xl font-black tracking-[-0.04em] text-[var(--tam-ink)] sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--tam-muted)]">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
