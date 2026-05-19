import { AnimatedNumber } from "@/components/ui/animated-number";

type Stat = {
  value: string;
  label: string;
};

function parseStatValue(value: string) {
  const match = value.match(/^([\d.,]+)(.*)$/);

  if (!match) {
    return null;
  }

  const rawNumber = match[1];
  const normalized = rawNumber.includes(",")
    ? rawNumber.replace(/\./g, "").replace(",", ".")
    : rawNumber.replace(/\./g, "");
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return {
    decimals: rawNumber.includes(",") ? rawNumber.split(",")[1]?.length ?? 0 : 0,
    suffix: match[2] ?? "",
    value: numericValue,
  };
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-4">
      {stats.map((item) => (
        <div key={item.label} className="motion-card rounded-xl border border-white/10 bg-white/7 p-3 text-center">
          <p className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            {parseStatValue(item.value) ? (
              <AnimatedNumber {...parseStatValue(item.value)!} />
            ) : (
              item.value
            )}
          </p>
          <p className="mt-1 text-sm text-white/60">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
