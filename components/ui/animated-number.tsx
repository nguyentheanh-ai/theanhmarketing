"use client";

import { useEffect, useMemo, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
};

export function AnimatedNumber({
  value,
  suffix = "",
  duration = 1600,
  className,
  decimals = 0,
}: AnimatedNumberProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setCurrent(value * eased);

      if (progress >= 1) {
        window.clearInterval(interval);
      }
    }, 32);

    return () => window.clearInterval(interval);
  }, [duration, value]);

  const formatted = useMemo(
    () =>
      new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(current),
    [current, decimals],
  );

  return (
    <span className={className}>
      {formatted}
      {suffix}
    </span>
  );
}
