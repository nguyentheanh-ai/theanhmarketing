"use client";

import { useEffect, useState } from "react";
import type { SafeStudentActivity } from "@/lib/admin/student-activity";
import {
  getStudentActivityTimelineView,
  isStudentActivityTimelineRequestCurrent,
  type StudentActivityTimelineState,
} from "@/lib/admin/student-activity-timeline-state";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getActivityGroupLabel(eventType: string) {
  if (eventType.includes("email")) return "Email";
  if (eventType.includes("payment")) return "Thanh toán";
  if (eventType.includes("login") || eventType.includes("learning")) return "Đăng nhập/Học tập";
  if (eventType.includes("password")) return "Mật khẩu";
  if (eventType.includes("access") || eventType.includes("account")) return "Quyền truy cập";
  if (eventType.includes("sheet")) return "Dữ liệu";
  return "Cập nhật";
}

function getActivityStatusClass(status: SafeStudentActivity["status"]) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "failed") return "border-red-200 bg-red-50 text-red-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function StudentActivityTimeline({ studentEmail }: { studentEmail: string | null }) {
  const [timelineState, setTimelineState] = useState<StudentActivityTimelineState>({
    email: studentEmail,
    generation: 0,
    phase: studentEmail ? "loading" : "ready",
    logs: [],
  });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!studentEmail) {
      return;
    }

    const requestEmail = studentEmail;
    const controller = new AbortController();
    const generation = requestVersion;
    let active = true;

    async function loadActivities() {
      await Promise.resolve();
      if (!active || controller.signal.aborted) return;
      setTimelineState({ email: requestEmail, generation, phase: "loading", logs: [] });

      try {
        const response = await fetch("/api/admin/students/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: requestEmail }),
          signal: controller.signal,
        });
        const result = (await response.json()) as { ok?: boolean; logs?: SafeStudentActivity[] };
        if (!response.ok || !result.ok || !Array.isArray(result.logs)) throw new Error("activity request failed");
        if (!active || controller.signal.aborted) return;
        setTimelineState((current) =>
          isStudentActivityTimelineRequestCurrent(current, requestEmail, generation)
            ? { ...current, phase: "ready", logs: result.logs!.slice(0, 20) }
            : current,
        );
      } catch {
        if (!active || controller.signal.aborted) return;
        setTimelineState((current) =>
          isStudentActivityTimelineRequestCurrent(current, requestEmail, generation)
            ? { ...current, phase: "error", logs: [] }
            : current,
        );
      }
    }

    void loadActivities();
    return () => {
      active = false;
      controller.abort();
    };
  }, [studentEmail, requestVersion]);

  if (!studentEmail) {
    return <p className="text-xs leading-5 text-slate-500">Chưa có email để tải lịch sử hoạt động.</p>;
  }

  const view = getStudentActivityTimelineView(timelineState, studentEmail);

  return (
    <section aria-live="polite" aria-label="Lịch sử hoạt động học viên">
      {view.phase === "loading" ? <p className="text-xs text-slate-500">Đang tải hoạt động...</p> : null}
      {view.phase === "error" ? (
        <div className="grid gap-2">
          <p className="text-xs text-red-700" role="status">Không tải được lịch sử hoạt động.</p>
          <button
            className="min-h-11 w-fit rounded-md border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setTimelineState({
                email: studentEmail,
                generation: requestVersion + 1,
                phase: "loading",
                logs: [],
              });
              setRequestVersion((current) => current + 1);
            }}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      {view.phase === "ready" && view.logs.length === 0 ? <p className="text-xs text-slate-500">Chưa có hoạt động</p> : null}
      {view.phase === "ready" && view.logs.length > 0 ? (
        <ol className="grid gap-3">
          {view.logs.map((activity) => (
            <li key={activity.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${getActivityStatusClass(activity.status)}`}>
                  {activity.status}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-600">
                  {getActivityGroupLabel(activity.eventType)}
                </span>
                <span className="text-xs font-semibold text-slate-500">{formatDateTime(activity.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-black text-slate-950">{activity.eventTitle}</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">Người thực hiện: {activity.actorLabel}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
