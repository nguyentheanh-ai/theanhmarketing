type Stat = {
  value: string;
  label: string;
};

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-4">
      {stats.map((item) => (
        <div key={item.label} className="text-center">
          <p className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {item.value}
          </p>
          <p className="mt-1 text-sm text-black/60">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
