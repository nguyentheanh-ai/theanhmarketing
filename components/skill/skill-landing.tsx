"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";
import {
  comparisonRows,
  ctaPills,
  evolution,
  radarData,
  scoreCards,
  skillHero,
  tokenCards,
  versions,
} from "@/data/skill-page";

const sectionReveal = {
  hidden: { opacity: 0, y: 34, filter: "blur(12px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemReveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const cardTone = {
  neutral:
    "border-white/10 bg-white/[0.045] shadow-[0_24px_70px_rgba(2,8,23,0.4)] hover:border-slate-300/35 hover:bg-white/[0.07]",
  warm:
    "border-orange-400/20 bg-gradient-to-b from-orange-500/[0.12] to-red-500/[0.05] shadow-[0_24px_80px_rgba(248,81,37,0.12)] hover:border-orange-300/55 hover:from-orange-500/[0.2]",
  blue:
    "border-sky-400/20 bg-gradient-to-b from-sky-500/[0.13] to-blue-700/[0.05] shadow-[0_24px_80px_rgba(14,165,233,0.13)] hover:border-sky-300/55 hover:from-sky-500/[0.22]",
  violet:
    "border-violet-400/25 bg-gradient-to-b from-violet-500/[0.15] to-fuchsia-700/[0.05] shadow-[0_24px_80px_rgba(139,92,246,0.15)] hover:border-violet-300/60 hover:from-violet-500/[0.24]",
};

const accentText = {
  neutral: "text-slate-200",
  warm: "text-orange-300",
  blue: "text-sky-300",
  violet: "text-violet-300",
};

const scoreTone = {
  slate: "border-slate-300/15 bg-slate-400/[0.06] text-slate-200",
  orange: "border-orange-300/20 bg-orange-500/[0.08] text-orange-300",
  blue: "border-sky-300/20 bg-sky-500/[0.08] text-sky-300",
  violet: "border-violet-300/20 bg-violet-500/[0.09] text-violet-300",
};

const radarSeries = [
  { label: "v1 Original", key: "Original", stroke: "#cbd5e1", fill: "#cbd5e1" },
  { label: "v2 Mở rộng", key: "Mở rộng", stroke: "#fb923c", fill: "#fb923c" },
  { label: "v3 Tối ưu", key: "Tối ưu", stroke: "#38bdf8", fill: "#38bdf8" },
  { label: "v4 Advanced", key: "Advanced", stroke: "#a78bfa", fill: "#a78bfa" },
] as const;

function FadeSection({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={sectionReveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function ShimmerPill({ children }: { children: ReactNode }) {
  return (
    <span className="skill-shimmer relative inline-flex overflow-hidden rounded-full border border-sky-300/20 bg-sky-400/[0.08] px-3 py-1 text-[13px] font-semibold text-sky-200 shadow-[0_0_28px_rgba(14,165,233,0.18)]">
      {children}
    </span>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto flex max-w-[1180px] flex-col items-center justify-center px-5 pb-8 pt-12 text-center sm:min-h-[430px] sm:pt-14">
      <div className="absolute left-1/2 top-32 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/20 blur-[90px]" />
      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full min-w-0 flex-col items-center"
      >
        <Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-bold text-white shadow-[0_10px_34px_rgba(2,8,23,0.32)] backdrop-blur">
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 text-xs font-black text-white">
            TA
          </span>
          <span className="font-bold tracking-normal text-white/90">The Anh Marketing</span>
        </Link>
        <ShimmerPill>{skillHero.badge}</ShimmerPill>
        <h1 className="mt-5 w-full max-w-[300px] break-words text-[25px] font-black leading-[1.1] tracking-normal text-white min-[430px]:max-w-[320px] min-[430px]:text-[30px] sm:max-w-3xl sm:text-balance sm:text-5xl lg:max-w-4xl lg:text-[54px]">
          <span className="hidden sm:inline">{skillHero.title}</span>
          <span className="block sm:hidden">
            4 phiên bản
            <span className="block">kỹ năng</span>
            <span className="block">một lộ trình</span>
            <span className="block">rõ ràng</span>
          </span>
          <span className="mt-1 block bg-gradient-to-r from-sky-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            <span className="hidden sm:inline">{skillHero.gradient}</span>
            <span className="block sm:hidden">
              từ nền tảng
              <span className="block">đến vận hành AI</span>
            </span>
          </span>
        </h1>
        <p className="mt-5 max-w-[300px] text-[14px] leading-7 text-slate-300 sm:max-w-2xl sm:text-base">
          {skillHero.description}
        </p>
      </motion.div>
    </section>
  );
}

function NoticeBanner() {
  return (
    <FadeSection className="mx-auto max-w-[1180px] px-5">
      <div className="skill-pulse-border relative overflow-hidden rounded-[28px] border border-sky-300/20 bg-[#091327]/90 p-[1px] shadow-[0_0_70px_rgba(37,99,235,0.22)]">
        <div className="relative flex min-w-0 flex-col gap-5 rounded-[27px] bg-gradient-to-r from-[#0b1d36] via-[#101937] to-[#11122d] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <span className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-[13px] font-bold text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.18)]">
              Đang mở lộ trình mới
            </span>
            <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-200">
              Bản benchmark kỹ năng 2026 giúp bạn chọn đúng cấp độ học, triển khai AI và đo hiệu quả theo mục tiêu thật của đội ngũ.
            </p>
          </div>
          <a
            href="#compare"
            className="skill-shimmer inline-flex w-full shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-sky-400 to-violet-500 px-5 py-3 text-sm font-extrabold text-white shadow-[0_14px_38px_rgba(37,99,235,0.32)] transition hover:brightness-110 sm:w-auto"
          >
            Xem chỉ số
          </a>
        </div>
      </div>
    </FadeSection>
  );
}

function VersionCards() {
  return (
    <FadeSection className="mx-auto mt-5 max-w-[1180px] px-5 sm:mt-7">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {versions.map((version) => (
          <motion.article
            key={version.label}
            variants={itemReveal}
            transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`min-w-0 rounded-[24px] border p-4 backdrop-blur-xl transition ${cardTone[version.tone as keyof typeof cardTone]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-black ${accentText[version.tone as keyof typeof accentText]}`}>
                {version.label}
              </span>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-bold text-white/55 sm:inline-flex">
                Benchmark
              </span>
            </div>
            <h2 className="mt-4 text-xl font-black tracking-normal text-white">{version.title}</h2>
            <p className="mt-2 min-h-[84px] text-[13px] leading-6 text-slate-300">{version.description}</p>
            <div className="mt-4 grid min-w-0 grid-cols-2 gap-2.5">
              {version.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
                  <div className="text-[11px] font-semibold text-slate-500">{stat.label}</div>
                  <div className="mt-1 text-lg font-black text-white">{stat.value}</div>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-2.5 text-[13px] leading-5 text-slate-300">
              {version.checklist.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1 text-emerald-300">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </motion.div>
    </FadeSection>
  );
}

function EvolutionTimeline() {
  return (
    <FadeSection className="mx-auto mt-9 max-w-[1180px] px-5">
      <div className="rounded-[30px] border border-white/10 bg-[#0a1326]/90 p-5 shadow-[0_28px_90px_rgba(2,8,23,0.42)] sm:p-7">
        <ShimmerPill>Evolution timeline</ShimmerPill>
        <h2 className="mt-4 text-3xl font-black tracking-normal text-white sm:text-4xl">
          4 giai đoạn, mỗi phiên bản thêm một lớp năng lực
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Từ thao tác cá nhân đến hệ điều hành nội dung, trọng tâm là giảm nhiễu và tăng khả năng lặp lại kết quả tốt.
        </p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative mt-8 grid gap-4 lg:grid-cols-4"
        >
          <div className="absolute left-8 right-8 top-8 hidden h-px bg-gradient-to-r from-slate-700 via-sky-400/70 to-violet-400/70 lg:block" />
          {evolution.map((step) => (
            <motion.div
              key={step.version}
              variants={itemReveal}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-3xl border border-white/10 bg-white/[0.045] p-5"
            >
              <div className="mb-4 grid size-12 place-items-center rounded-2xl border border-sky-300/30 bg-sky-400/10 text-sm font-black text-sky-200 shadow-[0_0_28px_rgba(14,165,233,0.18)]">
                {step.version}
              </div>
              <h3 className="text-lg font-black text-white">{step.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {step.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </FadeSection>
  );
}

function ComparisonTable() {
  const columns = ["Chỉ số", "v1", "v2", "v3", "v4"];
  return (
    <FadeSection id="compare" className="mx-auto mt-9 max-w-[1180px] px-5">
      <div className="rounded-[30px] border border-white/10 bg-[#0a1326]/90 p-5 shadow-[0_28px_90px_rgba(2,8,23,0.42)] sm:p-7">
        <ShimmerPill>Detailed comparison</ShimmerPill>
        <h2 className="mt-4 text-3xl font-black tracking-normal text-white sm:text-4xl">
          Bảng chỉ số đặt cạnh nhau
        </h2>
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13px] text-slate-300 sm:text-sm">
            <thead className="sticky top-0 z-10 bg-[#101a31] text-white">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-5 py-4 font-black">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row[0]} className="border-t border-white/[0.06] transition hover:bg-white/[0.04]">
                  {row.map((cell, index) => (
                    <td
                      key={`${row[0]}-${index}`}
                      className={`px-5 py-4 font-semibold ${
                        index === 0
                          ? "text-slate-200"
                          : index === 2
                            ? "text-orange-300"
                            : index === 3
                              ? "text-sky-300"
                              : index === 4
                                ? "text-violet-300"
                                : "text-slate-400"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FadeSection>
  );
}

function TokenCards() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <FadeSection className="mx-auto mt-12 max-w-[1180px] px-5 text-center">
      <ShimmerPill>Token/load chart</ShimmerPill>
      <h2 className="mt-4 text-3xl font-black tracking-normal text-white sm:text-4xl">
        Tải xử lý theo từng loại công việc
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        Các thanh biểu diễn mức độ hệ thống hóa, khả năng tái sử dụng và tốc độ xử lý của từng phiên bản.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tokenCards.map((card) => (
          <div key={card.title} className="rounded-[26px] border border-white/10 bg-[#0b152a]/90 p-5 text-left shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <h3 className="font-black text-white">{card.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{card.subtitle}</p>
            <div className="mt-5 space-y-3">
              {card.bars.map((bar) => (
                <div key={bar.label} className="grid grid-cols-[34px_1fr_42px] items-center gap-3 text-[13px] font-bold text-slate-400">
                  <span>{bar.label}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: prefersReducedMotion ? `${bar.value}%` : `${bar.value}%` }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                    />
                  </div>
                  <span className="text-right text-slate-300">{bar.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

function EffectivenessSection() {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [enabledSeries, setEnabledSeries] = useState<Record<string, boolean>>({
    Original: true,
    "Mở rộng": true,
    "Tối ưu": true,
    Advanced: true,
  });

  useEffect(() => {
    const node = chartRef.current;
    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setChartSize({
        width: Math.max(280, Math.round(rect.width)),
        height: Math.max(320, Math.round(rect.height)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <FadeSection className="mx-auto mt-9 max-w-[1180px] px-5">
      <div className="rounded-[32px] border border-white/10 bg-[#0a1326]/90 p-5 shadow-[0_28px_90px_rgba(2,8,23,0.42)] sm:p-7">
        <div className="text-center">
          <ShimmerPill>Effectiveness radar</ShimmerPill>
          <h2 className="mt-4 text-3xl font-black tracking-normal text-white sm:text-4xl">
            Đo lường hiệu quả thực tế 6 chiều
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Radar cho thấy độ cân bằng giữa tốc độ, chất lượng, khả năng theo ngành và mức tiết kiệm nguồn lực.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="min-w-0 h-[360px] rounded-[28px] border border-white/[0.08] bg-black/15 p-2 sm:h-[430px]"
          >
            {chartSize.width > 0 && chartSize.height > 0 ? (
                <RadarChart
                  width={chartSize.width}
                  height={chartSize.height}
                  data={radarData}
                  outerRadius="74%"
                >
                  <PolarGrid stroke="rgba(148,163,184,0.22)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#081225",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 16,
                      color: "#fff",
                    }}
                  />
                  {radarSeries.map((series) =>
                    enabledSeries[series.key] ? (
                      <Radar
                        key={series.key}
                        name={series.label}
                        dataKey={series.key}
                        stroke={series.stroke}
                        fill={series.fill}
                        fillOpacity={0.15}
                        isAnimationActive
                      />
                    ) : null,
                  )}
                </RadarChart>
            ) : null}
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {scoreCards.map((card) => (
              <motion.div
                key={card.name}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`rounded-[26px] border p-5 ${scoreTone[card.tone as keyof typeof scoreTone]}`}
              >
                <div className="text-sm font-black">{card.name}</div>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-5xl font-black leading-none">{card.score}</span>
                  <span className="pb-1 text-sm font-bold text-slate-500">/100</span>
                </div>
                <div className="mt-5 space-y-3">
                  {card.values.map((value, index) => (
                    <div key={index} className="grid grid-cols-[58px_1fr_28px] items-center gap-3 text-[12px] font-bold text-slate-400">
                      <span>{["Chất", "Tốc", "Hook", "Fit"][index]}</span>
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-current" style={{ width: `${value}%` }} />
                      </div>
                      <span className="text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {radarSeries.map((series) => (
            <button
              key={series.key}
              type="button"
              onClick={() =>
                setEnabledSeries((current) => ({
                  ...current,
                  [series.key]: !current[series.key],
                }))
              }
              className={`rounded-full border px-3 py-2 text-[13px] font-bold transition ${
                enabledSeries[series.key]
                  ? "border-white/[0.18] bg-white/[0.1] text-white"
                  : "border-white/[0.08] bg-transparent text-slate-500"
              }`}
            >
              <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: series.stroke }} />
              {series.label}
            </button>
          ))}
        </div>
      </div>
    </FadeSection>
  );
}

function FinalCTA() {
  return (
    <FadeSection className="mx-auto max-w-[1180px] px-5 pb-20 pt-9">
      <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-6 py-12 text-center shadow-[0_35px_110px_rgba(59,130,246,0.28)] sm:px-10 sm:py-16">
        <div className="absolute inset-x-10 -bottom-24 h-48 rounded-full bg-white/20 blur-[70px]" />
        <div className="relative mx-auto max-w-3xl">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-black text-white">Gợi ý chọn phiên bản</span>
          <h2 className="mt-5 text-3xl font-black leading-tight tracking-normal text-white sm:text-5xl">
            Chọn v4 nếu cần hệ thống theo ngành, v3 nếu cần tối ưu nhanh bằng AI.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-medium leading-7 text-white/85 sm:text-base">
            Bắt đầu bằng cấp độ phù hợp với đội ngũ hiện tại, sau đó nâng cấp dần sang workflow có dữ liệu, preset và nhịp review rõ ràng.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {ctaPills.map((pill) => (
              <span key={pill} className="rounded-2xl border border-white/[0.18] bg-white/[0.14] px-4 py-3 text-sm font-black text-white backdrop-blur">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </FadeSection>
  );
}

export function SkillLanding() {
  return (
    <main className="skill-page relative min-h-screen max-w-[100vw] overflow-x-hidden bg-[#050914] text-white">
      <div className="skill-blob skill-blob-one" />
      <div className="skill-blob skill-blob-two" />
      <div className="skill-blob skill-blob-three" />
      <Hero />
      <NoticeBanner />
      <VersionCards />
      <EvolutionTimeline />
      <ComparisonTable />
      <TokenCards />
      <EffectivenessSection />
      <FinalCTA />
    </main>
  );
}
