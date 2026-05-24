"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  trend: number;
  tone: "blue" | "gold" | "emerald" | "red" | "graphite";
  icon: LucideIcon;
  sparkline: number[];
};

const toneClasses: Record<KpiCardProps["tone"], string> = {
  blue: "text-sky-300 bg-sky-400/10 border-sky-400/20",
  gold: "text-amber-200 bg-amber-300/10 border-amber-300/20",
  emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  red: "text-red-300 bg-red-400/10 border-red-400/20",
  graphite: "text-zinc-200 bg-zinc-400/10 border-zinc-400/20",
};

export function KpiCard({ label, value, trend, tone, icon: Icon, sparkline }: KpiCardProps) {
  const max = Math.max(...sparkline);
  const min = Math.min(...sparkline);
  const points = sparkline
    .map((point, index) => {
      const x = (index / Math.max(sparkline.length - 1, 1)) * 100;
      const y = 34 - ((point - min) / Math.max(max - min, 1)) * 26;
      return `${x},${y}`;
    })
    .join(" ");
  const TrendIcon = trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
      <Card className="border-white/8 bg-card/78 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="font-mono text-2xl font-semibold tracking-normal text-foreground">{value}</p>
              </div>
            </div>
            <div className={cn("rounded-lg border p-2", toneClasses[tone])}>
              <Icon className="size-4" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
            <svg aria-hidden="true" className="h-10 w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <polyline fill="none" points={points} stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" />
              <polyline fill="none" points={points} stroke="currentColor" strokeWidth="1" />
            </svg>
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium",
                trend >= 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300",
              )}
            >
              <TrendIcon className="size-3" />
              {Math.abs(trend)}%
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
