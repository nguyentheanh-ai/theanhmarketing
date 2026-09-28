"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUPPORT_PRICE_LABEL } from "@/lib/support-booking/constants";
import styles from "./support-booking-prompt.module.css";

const SHOWN_KEY = "tam-support-prompt-shown";
const STUDY_KEY = "tam-support-prompt-study";
const DELAY_MS = 3 * 60_000;
const COOLDOWN_MS = 24 * 60 * 60_000;

// Kept in memory too, so blocked browser storage does not repeat the prompt on every lesson.
let studyMs = 0;
let lastShown = 0;

export function SupportBookingPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const readNumber = (storage: Storage, key: string) => {
      const value = Number(storage.getItem(key));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    };
    try {
      studyMs = Math.max(studyMs, readNumber(window.sessionStorage, STUDY_KEY));
      lastShown = Math.max(lastShown, readNumber(window.localStorage, SHOWN_KEY));
    } catch { /* Use memory when storage is unavailable. */ }
    let previousTick = Date.now();
    let wasVisible = document.visibilityState === "visible";
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const now = Date.now();
      const active = document.visibilityState === "visible";
      const elapsed = Math.max(0, Math.min(now - previousTick, 15_000));
      previousTick = now;
      try { lastShown = Math.max(lastShown, readNumber(window.localStorage, SHOWN_KEY)); } catch { /* Memory fallback. */ }
      if (lastShown && now - lastShown < COOLDOWN_MS) {
        wasVisible = active;
        return;
      }
      if (active && wasVisible) studyMs += elapsed;
      wasVisible = active;
      try { window.sessionStorage.setItem(STUDY_KEY, String(studyMs)); } catch { /* Memory fallback. */ }
      if (!active || document.fullscreenElement || studyMs < DELAY_MS) return;
      // Mark before rendering to keep lesson changes and other tabs within the cooldown.
      lastShown = now;
      studyMs = 0;
      try {
        window.localStorage.setItem(SHOWN_KEY, String(now));
        window.sessionStorage.setItem(STUDY_KEY, "0");
      } catch { /* Memory fallback. */ }
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 45_000);
    };
    const timer = setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
      document.removeEventListener("visibilitychange", tick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!visible) return null;

  return (
    <aside aria-label="Gợi ý hỗ trợ học tập" className={styles.prompt}>
      <button type="button" aria-label="Đóng gợi ý hỗ trợ" onClick={() => setVisible(false)} className={styles.close}>×</button>
      <p className={styles.title}>Bạn gặp vấn đề chưa thể giải quyết?</p>
      <p className={styles.description}>Trao đổi trực tiếp cùng Thế Anh · {SUPPORT_PRICE_LABEL}/buổi.</p>
      <Link href="/dat-lich-ho-tro" target="_blank" rel="noopener noreferrer" prefetch={false} onClick={() => setVisible(false)} className={styles.cta}>
        Đặt lịch hỗ trợ 1 kèm 1 ngay <span className="sr-only">(mở trong tab mới)</span>
      </Link>
    </aside>
  );
}
