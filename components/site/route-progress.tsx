"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => {
      setWidth(100);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setActive(false);
        setWidth(0);
      }, 220);
    };

    if (active) {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const tick = () => {
      setWidth((current) => {
        if (!active) {
          return 0;
        }

        if (current >= 92) {
          return current;
        }

        const next = current + (100 - current) * 0.08;
        return Math.min(next, 92);
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };

    if (active && rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
        return;
      }

      setActive(true);
      setWidth(12);
    };

    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <div
      className={`route-progress ${active ? "route-progress--active" : ""}`}
      style={{ width: `${width}%` }}
      aria-hidden="true"
    />
  );
}
