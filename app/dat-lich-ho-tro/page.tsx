import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { SupportBookingForm } from "@/components/support-booking/support-booking-form";
import { getCurrentAuth } from "@/lib/auth/session";
import { getVietnamToday } from "@/lib/support-booking/domain";
import { getEligibleSupportCustomer, getSupportAvailability } from "@/services/supportBookingService";

export const metadata: Metadata = {
  title: "Đặt lịch hỗ trợ | The Anh Marketing",
  description: "Đặt lịch hỗ trợ và tư vấn 1:1 cùng Thế Anh. Chọn thời lượng phù hợp, dành cho học viên và người chưa mua khóa học.",
};

export const dynamic = "force-dynamic";

export default async function SupportBookingPage() {
  const { user, isAdmin } = await getCurrentAuth();
  const customer = user?.email ? await getEligibleSupportCustomer(user.email, user.user_metadata, { allowAdminBooking: isAdmin }) : null;
  const today = getVietnamToday();
  const availability = await getSupportAvailability();
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200/70 bg-white"><div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-5"><Link className="flex items-center gap-2 text-sm font-bold" href="/"><BrandMark className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200" /><span>The Anh Marketing</span></Link><Link className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600" href="/huong-dan"><ArrowLeft className="size-4" />Hướng dẫn</Link></div></header>
      <section className="mx-auto max-w-3xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        <div className="mb-6 text-center"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Hỗ trợ và tư vấn 1:1</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Đặt lịch cùng Thế Anh</h1></div>
        <SupportBookingForm key={customer ? "student" : user ? "signed-in-guest" : "guest"} bookableDays={availability.days} customer={customer} isAuthenticated={Boolean(user)} today={today} />
        <p className="mt-5 text-center text-xs leading-5 text-slate-400">Chọn nhu cầu của bạn, cùng Thế Anh tìm hướng giải quyết.</p>
      </section>
    </main>
  );
}
