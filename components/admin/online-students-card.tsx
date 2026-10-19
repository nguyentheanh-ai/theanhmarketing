"use client";

import { useEffect, useState } from "react";

type Online = { online: number; activeLast24h: number; windowMinutes: number; students: { email: string; name: string | null; path: string; lastSeenAt: string; sessionStartedAt: string }[] };

const pageLabel = (path: string) => path.startsWith("/learn/") ? "Đang học bài" : path.startsWith("/dashboard") ? "Tổng quan học viên" : path.startsWith("/thu-vien") ? "Thư viện" : path.startsWith("/tai-khoan") ? "Tài khoản" : path;
const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));

// Live "students online now" card (refreshes every 30 s).
export function OnlineStudentsCard() {
  const [data, setData] = useState<Online | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/online", { cache: "no-store" });
        const body = (await response.json()) as Online & { ok: boolean; message?: string };
        if (!active) return;
        if (body.ok) { setData(body); setError(""); } else setError(body.message ?? "Chưa đọc được trạng thái online.");
      } catch { if (active) setError("Chưa đọc được trạng thái online."); }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <section aria-labelledby="online-students-title" className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`inline-block size-2.5 rounded-full ${data?.online ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" : "bg-slate-300"}`} />
          <h2 id="online-students-title" className="text-base font-semibold text-slate-900">Học viên đang online</h2>
        </div>
        <p className="text-sm text-slate-500">{data ? `${data.activeLast24h} học viên hoạt động trong 24 giờ` : "Đang tải…"}</p>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-slate-600">{error}</p> : null}
      {data ? (
        <>
          <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950" aria-live="polite">{data.online}</p>
          <p className="text-sm text-slate-500">trong {data.windowMinutes} phút gần nhất</p>
          {data.students.length ? (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {data.students.slice(0, 8).map((student) => (
                <li key={student.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate"><strong className="font-medium text-slate-900">{student.name || student.email}</strong>{student.name ? <span className="ml-2 text-slate-500">{student.email}</span> : null}</span>
                  <span className="text-slate-500">{pageLabel(student.path)} · {minutesAgo(student.lastSeenAt) === 0 ? "vừa xong" : `${minutesAgo(student.lastSeenAt)} phút trước`}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
