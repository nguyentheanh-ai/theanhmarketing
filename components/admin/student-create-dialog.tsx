"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import type { Course } from "@/data/courses";
import { AdminDialog } from "@/components/admin/admin-dialog";

const loading = () => <p role="status" className="py-8 text-center text-sm text-slate-500">Đang mở biểu mẫu…</p>;
const StudentProvisioningWizard = dynamic(() => import("@/components/admin/student-provisioning-wizard").then((m) => m.StudentProvisioningWizard), { loading });
const PaymentLinkForm = dynamic(() => import("@/components/admin/payment-link-form").then((m) => m.PaymentLinkForm), { loading });

export function StudentCreateDialog({ courses, defaultOpen = false, resumeOperationId, canReviewEmail = false }: { courses: Pick<Course, "slug" | "title">[]; defaultOpen?: boolean; resumeOperationId?: string; canReviewEmail?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<"student" | "payment">("student");
  const [paymentVisited, setPaymentVisited] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);
  const closeDialog = useCallback(() => { if (!busyRef.current) { setIsOpen(false); setMode("student"); setPaymentVisited(false); } }, []);
  const handleBusyChange = useCallback((busy: boolean) => { busyRef.current = busy; setIsBusy(busy); }, []);
  return <div data-admin-ui="modern">
    <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" onClick={() => setIsOpen(true)} type="button"><Plus className="size-4" />Tạo học viên</button>
    <AdminDialog open={isOpen} onClose={closeDialog} busy={isBusy} title="Tạo học viên" description="Tạo tài khoản, cấp quyền học hoặc gửi đường dẫn thanh toán." wide>
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Chế độ tạo học viên" className="mb-5 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          <button aria-pressed={mode === "student"} className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold disabled:opacity-40 ${mode === "student" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/60"}`} disabled={isBusy} onClick={() => setMode("student")} type="button">Tạo tài khoản & quyền học</button>
          <button aria-pressed={mode === "payment"} className={`min-h-10 flex-1 rounded-lg px-4 text-sm font-semibold disabled:opacity-40 ${mode === "payment" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/60"}`} disabled={isBusy} onClick={() => { setMode("payment"); setPaymentVisited(true); }} type="button">Gửi form thanh toán</button>
        </nav>
        <div hidden={mode !== "student"}><StudentProvisioningWizard canReviewEmail={canReviewEmail} courses={courses} initialOperationId={resumeOperationId} onBusyChange={handleBusyChange} /></div>
        {paymentVisited ? <div hidden={mode !== "payment"}><PaymentLinkForm courses={courses} onBusyChange={handleBusyChange} /></div> : null}
      </div>
    </AdminDialog>
  </div>;
}
