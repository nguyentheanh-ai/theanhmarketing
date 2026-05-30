"use client";

import { useEffect, useMemo, useState } from "react";

function formatTimeParts(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const days = Math.floor(safe / 86400)
    .toString()
    .padStart(2, "0");
  const hours = Math.floor((safe % 86400) / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");

  return [
    ["ngày", days],
    ["giờ", hours],
    ["phút", minutes],
    ["giây", seconds],
  ] as const;
}

export function PaymentOfferCountdown({
  deadline,
  label = "Tăng giá sau:",
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
    <div className="payment-countdown-card rounded-[26px] border border-blue-100 bg-white/95 p-4 text-left shadow-[0_22px_70px_rgba(0,97,255,0.12)] backdrop-blur-2xl sm:rounded-[30px] sm:p-6">
      <p className="inline-flex rounded-full bg-red-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-red-500 sm:px-5 sm:text-xs">
        Chỉ còn hôm nay
      </p>

      <h3 className="mt-5 max-w-2xl text-[1.8rem] font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-4xl sm:tracking-[-0.055em]">
        Giữ giá <span className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">359K</span> hôm nay.
      </h3>

      <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600 sm:text-base sm:leading-7">
        Sau thời gian này, ưu đãi có thể quay về <strong className="text-slate-950">799K</strong>.
      </p>

      <p className="mt-6 inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-orange-600 sm:px-5">
        {label}
      </p>

      <div className="payment-countdown-grid mt-4 grid grid-cols-4 gap-2 sm:gap-4">
        {timeParts.map(([partLabel, value]) => (
          <span
            className="grid min-h-[76px] min-w-0 place-items-center rounded-2xl bg-white px-1 py-3 text-center shadow-[0_16px_46px_rgba(15,23,42,0.07)] ring-1 ring-blue-50 sm:min-h-[92px] sm:px-3"
            key={partLabel}
          >
            <span className="font-mono text-2xl font-black leading-none tracking-[-0.05em] text-blue-500 sm:text-4xl sm:tracking-[-0.07em]">{value}</span>
            <span className="mt-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[11px]">{partLabel}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
