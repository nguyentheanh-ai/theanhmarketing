import { BarChart3, Check, Layers3, MousePointerClick, Workflow } from "lucide-react";

const engines = [
  { label: "Nội dung & AI", progress: 82 },
  { label: "Performance Ads", progress: 68 },
  { label: "Funnel", progress: 74 },
  { label: "CRM / Data", progress: 58 },
];

export function GrowthDashboardVisual() {
  return (
    <div className="relative mx-auto mt-12 max-w-5xl px-1 sm:px-6" aria-label="Mô hình AI Growth System của The Anh Marketing">
      <div className="tam-card overflow-hidden border-white/80 bg-white/92 p-3 shadow-[0_28px_80px_rgba(18,73,113,0.18)] sm:p-5">
        <div className="flex items-center justify-between border-b border-[var(--tam-line)] px-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#ff6b6b]" />
            <span className="size-2 rounded-full bg-[#ffca54]" />
            <span className="size-2 rounded-full bg-[#38d596]" />
          </div>
          <span className="rounded-full bg-[var(--tam-accent-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--tam-accent-strong)] sm:text-xs">
            Growth Command Center
          </span>
        </div>

        <div className="grid gap-3 pt-3 md:grid-cols-[0.8fr_1.45fr_0.75fr]">
          <div className="rounded-2xl bg-[#f5f9fc] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">5 engine kết nối</p>
            <div className="mt-4 grid gap-3">
              {engines.map((engine) => (
                <div key={engine.label}>
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--tam-ink)]">
                    <span>{engine.label}</span>
                    <span className="text-[var(--tam-accent-strong)]">{engine.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#159cfb] to-[#31cdf3]" style={{ width: `${engine.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#159cfb]/12 bg-gradient-to-br from-[#f9fcff] to-[#eef8ff] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--tam-accent-strong)]">Hệ thống tuần này</p>
                <p className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--tam-ink)] sm:text-2xl">Từ insight đến dữ liệu vận hành</p>
              </div>
              <BarChart3 className="text-[var(--tam-accent)]" aria-hidden="true" />
            </div>
            <div className="mt-5 grid grid-cols-4 items-end gap-2" aria-hidden="true">
              {[46, 70, 57, 86, 68, 92, 76, 98].map((height, index) => (
                <div className="flex h-24 items-end sm:h-32" key={`${height}-${index}`}>
                  <span className="w-full rounded-t-lg bg-gradient-to-t from-[#159cfb] to-[#65d9f7]" style={{ height: `${height}%`, opacity: 0.55 + index * 0.05 }} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white p-3 text-xs font-bold text-[var(--tam-muted)] shadow-sm">
              <Workflow className="text-[var(--tam-accent)]" size={17} aria-hidden="true" />
              Content → Ads → Funnel → Automation → CRM/Data
            </div>
          </div>

          <div className="grid gap-3">
            {[
              { icon: MousePointerClick, label: "Việc ưu tiên", value: "Chẩn đoán offer" },
              { icon: Layers3, label: "Lộ trình", value: "Theo từng engine" },
              { icon: Check, label: "Trạng thái", value: "Sẵn sàng áp dụng" },
            ].map((item) => (
              <div className="rounded-2xl border border-[var(--tam-line)] bg-white p-4" key={item.label}>
                <item.icon className="text-[var(--tam-accent)]" size={19} aria-hidden="true" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-black text-[var(--tam-ink)]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tam-float-chip absolute -left-1 top-[42%] hidden items-center gap-2 rounded-full border border-[#159cfb]/15 bg-white px-4 py-2 text-xs font-black text-[var(--tam-ink)] shadow-[var(--tam-shadow)] sm:flex">
        <span className="grid size-6 place-items-center rounded-full bg-[#e9f7ff] text-[var(--tam-accent)]">✓</span>
        Một hệ thống, không còn rời rạc
      </div>
      <div className="tam-float-chip tam-float-chip-late absolute -right-2 top-10 hidden rounded-full border border-[#159cfb]/15 bg-white px-4 py-2 text-xs font-black text-[var(--tam-ink)] shadow-[var(--tam-shadow)] md:block">
        AI + Marketing + Data
      </div>
    </div>
  );
}
