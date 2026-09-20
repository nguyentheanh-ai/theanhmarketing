"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import styles from "@/app/home.module.css";

export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const configure = () => {
      observer?.disconnect();
      if (preference.matches) {
        delete element.dataset.enhanced;
        return;
      }
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.revealed = "true";
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.08 });
      element.querySelectorAll<HTMLElement>("[data-reveal]").forEach(target => {
        if (target.getBoundingClientRect().top < window.innerHeight) target.dataset.revealed = "true";
        observer?.observe(target);
      });
      element.dataset.enhanced = "true";
    };
    const visibility = () => { element.dataset.hidden = String(document.hidden); };
    configure();
    preference.addEventListener("change", configure);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer?.disconnect(); preference.removeEventListener("change", configure); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <div ref={root} className={styles.experience} data-paused={paused}>
    <button type="button" className={styles.motionToggle} onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? "Tiếp tục hiệu ứng chuyển động" : "Tạm dừng hiệu ứng chuyển động"} title={paused ? "Tiếp tục hiệu ứng" : "Tạm dừng hiệu ứng"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
    {children}
  </div>;
}
