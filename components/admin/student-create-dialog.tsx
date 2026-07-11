"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Course } from "@/data/courses";
import { PaymentLinkForm } from "@/components/admin/payment-link-form";
import { StudentProvisioningWizard } from "@/components/admin/student-provisioning-wizard";

export function StudentCreateDialog({ courses, defaultOpen = false, resumeOperationId, canReviewEmail = false }: { courses: Course[]; defaultOpen?: boolean; resumeOperationId?: string; canReviewEmail?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<"student" | "payment">("student");
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const closeDialog = useCallback(() => {
    if (busyRef.current) return;
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const handleBusyChange = useCallback((busy: boolean) => {
    busyRef.current = busy;
    setIsBusy(busy);
  }, []);

  useEffect(() => { busyRef.current = isBusy; }, [isBusy]);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, isOpen]);

  return (
    <>
      <button ref={triggerRef} className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white" onClick={() => setIsOpen(true)} type="button">Tạo học viên</button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 sm:p-5">
          <button aria-label="Đóng tạo học viên" className="fixed inset-0 cursor-default disabled:cursor-not-allowed" disabled={isBusy} onClick={closeDialog} type="button" />
          <section ref={dialogRef} aria-busy={isBusy} aria-labelledby="student-create-title" aria-modal="true" className="relative ml-auto min-h-dvh w-full bg-white shadow-2xl sm:min-h-0 sm:max-w-3xl sm:rounded-3xl" role="dialog">
            <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:rounded-t-3xl sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Thao tác có kiểm soát</p><h2 className="mt-1 text-2xl font-black text-slate-950" id="student-create-title">Tạo học viên</h2></div>
                <button aria-label="Đóng" className="grid size-11 place-items-center rounded-full border border-slate-200 text-xl font-black text-slate-700 disabled:opacity-40" disabled={isBusy} onClick={closeDialog} type="button">×</button>
              </div>
              <nav aria-label="Chế độ tạo học viên" className="flex flex-wrap gap-2">
                <button aria-pressed={mode === "student"} className={`min-h-10 rounded-full px-4 text-sm font-black disabled:opacity-40 ${mode === "student" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`} disabled={isBusy} onClick={() => setMode("student")} type="button">Tạo tài khoản & quyền học</button>
                <button aria-pressed={mode === "payment"} className={`min-h-10 rounded-full px-4 text-sm font-black disabled:opacity-40 ${mode === "payment" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`} disabled={isBusy} onClick={() => setMode("payment")} type="button">Gửi form thanh toán</button>
              </nav>
            </header>
            <div className="px-5 py-6 sm:px-7">{mode === "student" ? <StudentProvisioningWizard canReviewEmail={canReviewEmail} courses={courses} initialOperationId={resumeOperationId} onBusyChange={handleBusyChange} /> : <PaymentLinkForm courses={courses} />}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
