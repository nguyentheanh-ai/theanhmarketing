"use client";

import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps } from "react";
import styles from "./learning-room.module.css";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <span className={styles.pending} data-pending={pending || undefined} role="status" aria-live="polite">
    {pending ? <><span className={styles.spinner} aria-hidden="true" />Đang mở bài…</> : null}
  </span>;
}

export function LessonLink({ children, className, prefetch = false, onMouseEnter, onFocus, onNavigate, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} prefetch={intent || prefetch} scroll={false}
    onMouseEnter={(event) => { setIntent(true); onMouseEnter?.(event); }}
    onNavigate={(event) => {
      onNavigate?.(event);
      void fetch("/api/student/activity", { method: "POST", keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "student_entered_learning", title: "Học viên chuyển bài", metadata: { route: String(props.href) } }),
      }).catch(() => {});
    }}
    onFocus={(event) => { setIntent(true); onFocus?.(event); }}
    className={`${className ?? ""} ${styles.lessonLink}`}>
    {children}
    <NavigationStatus />
  </Link>;
}
