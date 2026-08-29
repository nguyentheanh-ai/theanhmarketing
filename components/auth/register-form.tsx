"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/courses";
import { clearCart, readCart, subscribeCart, type CartItem } from "@/lib/cart";
import { getSafeNextPath } from "@/lib/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientAttribution } from "@/lib/tracking/client-attribution";
import { trackMarketingEvent } from "@/lib/tracking/events";
import { InvoiceRequestFields } from "@/components/payment/invoice-request-fields";
import { invoiceInputFromFormData } from "@/lib/orders/invoice";

export function RegisterForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get("next"), "/dashboard");
  const selectedCourseParam = searchParams.get("course") ?? "";
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const loginHref =
    cartItems.length > 0
      ? `/dang-nhap?next=${encodeURIComponent("/gio-hang")}`
      : `/dang-nhap?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    const update = () => setCartItems(readCart());
    update();
    return subscribeCart(update);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const password = String(formData.get("password") ?? "");
    const courseSlug = String(formData.get("course") ?? "");
    const selectedCourse = courses.find((course) => course.slug === courseSlug);
    const selectedCartSlugs = cartItems.map((item) => item.slug);
    const orderCourseSlugs = selectedCartSlugs.length > 0 ? selectedCartSlugs : [courseSlug];
    const interestedCourse = selectedCartSlugs.length > 0
      ? cartItems.map((item) => item.title).join(", ")
      : selectedCourse?.title ?? courseSlug;
    const attribution = getClientAttribution();
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          interested_course: interestedCourse,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const leadResponse = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: fullName,
        phone,
        email,
        message: `Đăng ký Growth Hub: ${interestedCourse}`,
        source: "signup",
        attribution,
      }),
    });
    const leadData = (await leadResponse.json()) as {
      ok?: boolean;
      lead?: { id?: string };
      message?: string;
    };

    if (!leadResponse.ok || !leadData.ok) {
      setMessage(leadData.message ?? "Đã tạo tài khoản nhưng chưa lưu được lead vào CRM.");
      setIsSubmitting(false);
      return;
    }

    trackMarketingEvent("Lead", {
      event_id: leadData.lead?.id,
      content_name: interestedCourse,
      content_type: "product",
      method: "email",
      source: "signup",
      ...attribution,
    });

    const orderResponse = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentName: fullName,
        email,
        phone,
        courseSlug,
        courseSlugs: orderCourseSlugs,
        leadId: leadData.lead?.id,
        invoice: invoiceInputFromFormData(formData),
        ...attribution,
      }),
    });
    const orderData = (await orderResponse.json()) as {
      ok?: boolean;
      order?: { orderCode: string; amount?: number; currency?: string };
      message?: string;
    };

    if (!orderResponse.ok || !orderData.order) {
      setMessage(orderData.message ?? "Đã tạo hồ sơ nhưng chưa tạo được đơn thanh toán.");
      setIsSubmitting(false);
      return;
    }

    clearCart();
    const completeRegistrationValue = Number(orderData.order.amount);

    if (completeRegistrationValue > 0) {
      trackMarketingEvent("CompleteRegistration", {
        event_id: orderData.order.orderCode,
        order_id: orderData.order.orderCode,
        content_ids: orderCourseSlugs,
        content_name: interestedCourse,
        content_type: "product",
        method: "email",
        value: completeRegistrationValue,
        currency: orderData.order.currency || "VND",
      });
    } else {
      console.warn("[tracking] Skipped CompleteRegistration without valid value", {
        orderCode: orderData.order.orderCode,
      });
    }

    router.push(`/thanh-toan/${orderData.order.orderCode}`);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-bold text-slate-900">Họ và tên</label>
          <input
            className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            name="name"
            placeholder="Nhập họ tên"
            required
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold text-slate-900">Email</label>
          <input
            className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            name="email"
            placeholder="email@example.com"
            required
            type="email"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold text-slate-900">Mật khẩu</label>
          <input
            className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            minLength={6}
            name="password"
            placeholder="Tối thiểu 6 ký tự"
            required
            type="password"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-bold text-slate-900">Số điện thoại/Zalo</label>
          <input
            className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
            name="phone"
            placeholder="090..."
            required
          />
        </div>

        {cartItems.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-bold text-slate-900">Chương trình bạn chọn</p>
            <p className="mt-1">{cartItems.map((item) => item.title).join(", ")}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <label className="text-sm font-bold text-slate-900">Chương trình quan tâm</label>
            <select
              className="auth-readable-input min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
              defaultValue={selectedCourseParam || undefined}
              name="course"
            >
              {courses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex gap-3 text-sm leading-6 text-slate-700">
          <input className="mt-1" required type="checkbox" />
          Tôi đồng ý để The Anh Marketing liên hệ tư vấn và tạo hồ sơ Growth Hub cho chương trình đã chọn.
        </label>
        {message ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">
            {message}
          </p>
        ) : null}
        <Button isLoading={isSubmitting} loadingLabel="Đang tạo đơn thanh toán..." type="submit">
          Tạo Growth Hub
        </Button>
        <InvoiceRequestFields />
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Đã có tài khoản?{" "}
        <Link className="font-bold text-sky-700 hover:text-sky-800" href={loginHref}>
          Đăng nhập
        </Link>
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        Học viên đã có tài khoản:{" "}
        <Link href="/dang-nhap" className="font-bold text-sky-700 hover:text-sky-800">
          đăng nhập
        </Link>
      </div>
    </>
  );
}
