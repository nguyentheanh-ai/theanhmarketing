import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarClock, MessageSquareText } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { SupportBookingForm } from "@/components/support-booking/support-booking-form";
import { getCurrentAuth, requireStudentAuth } from "@/lib/auth/session";
import { getVietnamToday } from "@/lib/support-booking/domain";
import { SUPPORT_PRICE_LABEL } from "@/lib/support-booking/constants";
import { getEligibleSupportCustomer, getSupportAvailability } from "@/services/supportBookingService";

export const metadata: Metadata = {
  title: "Đặt lịch hỗ trợ | The Anh Marketing",
  description: "Đặt lịch hỗ trợ 1:1 trong 30 phút cùng The Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function SupportBookingPage() {
  await requireStudentAuth("/dat-lich-ho-tro");
  const { user, isAdmin } = await getCurrentAuth();
  const customer = await getEligibleSupportCustomer(user?.email ?? "", user?.user_metadata, {
    allowOwnerPreview: isAdmin,
  });
  const today = getVietnamToday();
  if (!customer) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8fb] px-5 text-slate-950">
        <section className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl">
          <BadgeCheck className="mx-auto size-12 text-slate-300" />
          <h1 className="mt-5 text-3xl font-black">Dành cho học viên đã mua khóa học</h1>
          <p className="mt-4 leading-7 text-slate-600">Tài khoản hiện tại chưa có đơn khóa học đã thanh toán nên chưa thể đặt lịch hỗ trợ.</p>
          <Link className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white" href="/khoa-hoc">Xem các khóa học</Link>
        </section>
      </main>
    );
  }
  const availability = await getSupportAvailability();
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5"><Link className="flex items-center gap-3 font-black" href="/"><BrandMark className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200" /><span>The Anh Marketing</span></Link><Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600" href="/huong-dan"><ArrowLeft className="size-4" />Xem hướng dẫn</Link></div></header>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Hỗ trợ triển khai 1:1</p><h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Đặt lịch hỗ trợ</h1><p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600">Chọn một khung giờ 30 phút để cùng kiểm tra quảng cáo, lên quảng cáo mẫu hoặc tư vấn xây dựng hệ thống. Mỗi buổi {SUPPORT_PRICE_LABEL}.</p></div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">{[[CalendarClock,"30 phút tập trung"],[MessageSquareText,"Ghi rõ nội dung cần hỗ trợ"],[BadgeCheck,"Chỉ xác nhận sau thanh toán"]].map(([Icon,label]) => { const Component = Icon as typeof CalendarClock; return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700" key={String(label)}><Component className="size-5 text-blue-600" />{String(label)}</div>; })}</div>
        <div className="mx-auto mt-8 max-w-5xl"><SupportBookingForm bookableDays={availability.days} customer={customer} today={today} /></div>
      </section>
    </main>
  );
}
