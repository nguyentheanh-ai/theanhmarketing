import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";

export function HomeDemoPanel() {
  return (
    <div className="tam-card mx-auto mt-10 max-w-4xl overflow-hidden p-3 sm:p-5">
      <div className="relative grid min-h-[280px] place-items-center overflow-hidden rounded-2xl border border-[#159cfb]/12 bg-[#f1f8fd] sm:min-h-[410px]">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(21,156,251,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(21,156,251,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="relative max-w-xl px-6 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--tam-accent)] text-white shadow-[0_16px_38px_rgba(21,156,251,.32)]">
            <Play fill="currentColor" size={24} aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.14em] text-[var(--tam-accent-strong)]">Xem hệ thống vận hành</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--tam-ink)] sm:text-4xl">Từ một mục tiêu kinh doanh đến workflow có thể thực thi</h3>
          <p className="mt-4 text-sm leading-7 text-[var(--tam-muted)]">Khám phá cách nội dung, quảng cáo, funnel, automation và dữ liệu được nối thành một lộ trình học và áp dụng rõ ràng.</p>
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--tam-accent-strong)]" href="/he-sinh-thai">
            Xem bản đồ hệ thống <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <Sparkles className="absolute right-[8%] top-[12%] text-[#56c8f6]" aria-hidden="true" />
      </div>
    </div>
  );
}
