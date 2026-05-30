"use client";

import { useEffect, useMemo, useState } from "react";

function formatTimeParts(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");

  return [
    ["giờ", hours],
    ["phút", minutes],
    ["giây", seconds],
  ] as const;
}

export function PaymentOfferCountdown({
  deadline,
  label = "Trước khi quay về giá cũ",
}: {
  deadline: string;
  label?: string;
}) {
  const targetTime = useMemo(() => Date.parse(deadline), [deadline]);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    function update() {
      const safeTarget = Number.isNaN(targetTime) ? Date.now() : targetTime;
      setSecondsLeft(Math.max(0, Math.ceil((safeTarget - Date.now()) / 1000)));
    }

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [targetTime]);

  const timeParts = formatTimeParts(secondsLeft);

  return (
    <div className="payment-countdown-card rounded-[24px] border border-blue-100 bg-white/92 p-3 text-center shadow-[0_18px_60px_rgba(0,97,255,0.12)] backdrop-blur-2xl sm:rounded-[28px] sm:p-5">
      <div className="mx-auto max-w-2xl">
        <p className="mx-auto mb-3 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-orange-600 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.14em]">
          Chỉ còn 4 suất ưu đãi
        </p>
        <p className="text-[11px] font-black uppercase tracking-[0.13em] text-blue-600 sm:text-xs sm:tracking-[0.16em]">{label}</p>
        <p className="mt-1 text-xs font-bold leading-5 text-slate-600 sm:text-sm sm:leading-6">
          Hoàn tất trước khi đồng hồ về 00:00:00 để giữ giá 359K. Sau thời gian này, ưu đãi có thể quay về giá cũ.
        </p>
      </div>
      <div className="payment-countdown-timer mx-auto mt-4 grid w-full max-w-[224px] grid-cols-3 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-3 py-3 text-white shadow-[0_14px_34px_rgba(0,97,255,0.22)] sm:max-w-[260px] sm:gap-3 sm:px-5">
        {timeParts.map(([partLabel, value]) => (
          <span className="grid min-w-0 justify-items-center" key={partLabel}>
            <span className="font-mono text-2xl font-black leading-none tracking-[-0.04em] sm:text-3xl sm:tracking-[-0.06em]">{value}</span>
            <span className="mt-1 text-[9px] font-black uppercase tracking-[0.08em] text-white/76 sm:text-[10px] sm:tracking-[0.12em]">{partLabel}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
