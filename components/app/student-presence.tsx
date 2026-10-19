"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const INTERVAL_MS = 60_000;

// Invisible heartbeat for the admin "online now" view: sent while the tab is
// visible, about once a minute, with the current path only (no query/hash).
export function StudentPresence() {
  const pathname = usePathname();
  useEffect(() => {
    let stopped = false;
    const beat = () => {
      if (stopped || document.visibilityState !== "visible") return;
      void fetch("/api/student/presence", { method: "POST", credentials: "same-origin", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: pathname }) }).catch(() => undefined);
    };
    beat();
    const timer = window.setInterval(beat, INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [pathname]);
  return null;
}
