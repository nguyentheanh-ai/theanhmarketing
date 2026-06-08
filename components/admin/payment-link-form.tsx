"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/courses";

const inputClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const labelClass = "text-xs font-bold text-slate-700";

type PaymentLinkResult = {
  ok: boolean;
  message?: string;
  paymentUrl?: string;
  order?: {
    orderCode: string;
    amountLabel: string;
  };
};

export function PaymentLinkForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const defaultCourseSlug = useMemo(() => courses[0]?.slug ?? "", [courses]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPaymentUrl("");
    setIsSending(true);

    const formData = new FormData(event.currentTarget);
    const paymentPlan = String(formData.get("paymentPlan") ?? "");
    const response = await fetch("/api/admin/payment-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName: String(formData.get("studentName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        courseSlug: String(formData.get("courseSlug") ?? ""),
        paymentPlan: paymentPlan === "default" ? "" : paymentPlan,
      }),
    });
    const result = (await response.json()) as PaymentLinkResult;

    setIsSending(false);
    setMessage(result.message ?? "Đã xử lý yêu cầu gửi form thanh toán.");

    if (response.ok && result.ok) {
      setPaymentUrl(result.paymentUrl ?? "");
      event.currentTarget.reset();
      router.refresh();
    }
  }

  return (
    <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="grid gap-1.5">
          <span className={labelClass}>Họ tên khách</span>
          <input className={inputClass} name="studentName" required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Số điện thoại</span>
          <input className={inputClass} name="phone" required />
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Email nhận form</span>
          <input className={inputClass} name="email" required type="email" />
        </label>
        <label className="grid gap-1.5 lg:col-span-2">
          <span className={labelClass}>Khóa học / sản phẩm</span>
          <select className={inputClass} defaultValue={defaultCourseSlug} name="courseSlug" required>
            {courses.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={labelClass}>Gói thanh toán</span>
          <select className={inputClass} defaultValue="default" name="paymentPlan">
            <option value="default">Theo giá khóa học</option>
            <option value="video">Facebook Ads 399K</option>
            <option value="zoom-kit">Facebook Ads 799K</option>
            <option value="agent-kit-ads-359">Agent Kit private 359K</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          className="h-10 w-fit rounded-md bg-slate-950 px-5 text-sm shadow-none hover:bg-slate-800"
          isLoading={isSending}
          loadingLabel="Đang gửi..."
          type="submit"
        >
          Gửi form thanh toán
        </Button>
        {paymentUrl ? (
          <a
            className="w-fit rounded-md border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-slate-50"
            href={paymentUrl}
            rel="noreferrer"
            target="_blank"
          >
            Mở trang thanh toán
          </a>
        ) : null}
      </div>

      {message ? <p className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">{message}</p> : null}
    </form>
  );
}
