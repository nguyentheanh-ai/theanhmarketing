"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarClock, LifeBuoy, X } from "lucide-react";

type Context = {
  ok: boolean;
  student: { name: string; email: string };
  nextCourse: { title: string; href: string; progress: number } | null;
  pendingOrders: { code: string; product: string }[];
  support: { booking: string; account: string };
};

// Calm help entry point on student pages. It reads /api/student/context so the
// suggestions match the student's real state; the panel body is the slot the
// customer-care bot will use later.
export function StudentHelpLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<Context | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open || context) return;
    fetch("/api/student/context", { cache: "no-store" })
      .then((response) => response.json() as Promise<Context>)
      .then((body) => { if (body.ok) setContext(body); else setFailed(true); })
      .catch(() => setFailed(true));
  }, [open, context]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lesson pages already show their own floating support prompt.
  const lifted = pathname.startsWith("/learn/");
  const position = `fixed right-4 z-40 ${lifted ? "bottom-24" : "bottom-24 md:bottom-6"}`;

  return (
    <div className={position}>
      {open ? (
        <div role="dialog" aria-label="Hỗ trợ học viên" className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Hỗ trợ học viên</p>
              <h2 className="mt-1 text-base font-semibold text-slate-950">{context ? `Chào ${context.student.name}, cần hỗ trợ gì?` : "Cần hỗ trợ gì?"}</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
          </div>
          {!context && !failed ? <p className="mt-4 text-sm text-slate-500">Đang tải thông tin…</p> : null}
          <ul className="mt-4 space-y-2 text-sm">
            {context?.nextCourse ? (
              <li><Link href={context.nextCourse.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-400">
                <span><span className="block font-medium text-slate-900">Tiếp tục học</span><span className="text-slate-500">{context.nextCourse.title} · {context.nextCourse.progress}%</span></span><ArrowRight size={16} aria-hidden />
              </Link></li>
            ) : null}
            {context?.pendingOrders.length ? (
              <li className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900">Đơn <strong>{context.pendingOrders[0].code}</strong> đang chờ thanh toán. Sau khi chuyển khoản, quyền học được mở tự động.</li>
            ) : null}
            <li><Link href={context?.support.booking ?? "/dat-lich-ho-tro"} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-400">
              <span className="flex items-center gap-2 font-medium text-slate-900"><CalendarClock size={16} aria-hidden />Đặt lịch hỗ trợ 1-1</span><ArrowRight size={16} aria-hidden />
            </Link></li>
            <li><Link href={context?.support.account ?? "/tai-khoan"} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-400">
              <span className="font-medium text-slate-900">Tài khoản & quyền học</span><ArrowRight size={16} aria-hidden />
            </Link></li>
          </ul>
        </div>
      ) : null}
      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Mở hỗ trợ học viên"
          className={`flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 ${lifted ? "hidden md:flex" : ""}`}>
          <LifeBuoy size={18} aria-hidden /><span>Hỗ trợ</span>
        </button>
      </div>
    </div>
  );
}
