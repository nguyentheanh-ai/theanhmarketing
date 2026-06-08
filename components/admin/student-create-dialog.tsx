"use client";

import { useState } from "react";
import type { Course } from "@/data/courses";
import { PaymentLinkForm } from "@/components/admin/payment-link-form";
import { StudentIntakeForm } from "@/components/admin/student-intake-form";

export function StudentCreateDialog({ courses, defaultOpen = false }: { courses: Course[]; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<"student" | "payment">("student");

  return (
    <>
      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Thêm học viên
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/35 px-4 py-8">
          <button
            aria-label="Đóng thêm học viên"
            className="fixed inset-0 cursor-default"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <section className="relative mx-auto w-full max-w-5xl rounded-[18px] bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">Preview trước khi lưu</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">Thêm học viên</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
                  <button
                    className={`h-9 rounded px-3 text-sm font-black transition ${
                      mode === "student" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
                    }`}
                    onClick={() => setMode("student")}
                    type="button"
                  >
                    Cấp quyền học
                  </button>
                  <button
                    className={`h-9 rounded px-3 text-sm font-black transition ${
                      mode === "payment" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
                    }`}
                    onClick={() => setMode("payment")}
                    type="button"
                  >
                    Form thanh toán
                  </button>
                </div>
                <button
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="px-5 py-5">
              {mode === "student" ? (
                <div>
                  <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    Khi bấm thêm, hệ thống lưu database thật, tạo/cập nhật tài khoản học viên và gửi email thật tới email học viên.
                  </p>
                  <StudentIntakeForm courses={courses} onSuccess={() => setIsOpen(false)} />
                </div>
              ) : (
                <div>
                  <p className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                    Chế độ này tạo đơn thanh toán thật và gửi email form thanh toán UTF-8 tới khách.
                  </p>
                  <PaymentLinkForm courses={courses} />
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
