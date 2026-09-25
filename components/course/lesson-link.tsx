"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import styles from "./learning-room.module.css";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return pending ? <span className={styles.pending} role="status">Đang mở bài…</span> : null;
}

export function LessonLink({ children, className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={`${className ?? ""} ${styles.lessonLink}`}>
    {children}
    <NavigationStatus />
  </Link>;
}
