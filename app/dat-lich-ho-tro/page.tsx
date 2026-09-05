import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarClock, MessageSquareText } from "lucide-react";
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
  const { user } = await getCurrentAuth();
  const customer = user?.email ? await getEligibleSupportCustomer(user.email, user.user_metadata) : null;
  const today = getVietnamToday();
  const availability = await getSupportAvailability();
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5"><Link className="flex items-center gap-3 font-black" href="/"><BrandMark className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-200" /><span>The Anh Marketing</span></Link><Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600" href="/huong-dan"><ArrowLeft className="size-4" />Xem hướng dẫn</Link></div></header>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Hỗ trợ và tư vấn 1:1</p><h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Đặt lịch cùng Thế Anh</h1><p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600">Cùng kiểm tra quảng cáo, lên quảng cáo mẫu hoặc trao đổi cách xây dựng hệ thống bán hàng. Bạn có thể đặt lịch ngay cả khi chưa mua khóa học.</p></div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Hỗ trợ học viên</h2><p className="mt-2 text-xl font-black text-blue-600">30 phút · 1.000.000đ</p><p className="mt-2 text-sm leading-6 text-slate-600">Thêm 30 phút: 500.000đ. Dành cho học viên đã mua khóa học.</p>{!customer ? <Link className="mt-3 inline-block text-sm font-bold text-blue-600" href="/dang-nhap?next=%2Fdat-lich-ho-tro">Đăng nhập để dùng mức giá học viên →</Link> : null}</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Tư vấn cho người chưa mua khóa học</h2><p className="mt-2 text-xl font-black text-blue-600">60 phút · 2.000.000đ</p><p className="mt-2 text-sm leading-6 text-slate-600">Thêm 30 phút: 700.000đ. Điền thông tin và chọn lịch bên dưới.</p></div>
        </div>
        <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3">{[[CalendarClock,"Chọn thời lượng phù hợp"],[MessageSquareText,"Ghi rõ nội dung cần hỗ trợ"],[BadgeCheck,"Xác nhận sau thanh toán"]].map(([Icon,label]) => { const Component = Icon as typeof CalendarClock; return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700" key={String(label)}><Component className="size-5 text-blue-600" />{String(label)}</div>; })}</div>
        <div className="mx-auto mt-8 max-w-5xl"><SupportBookingForm key={customer ? "student" : "consultation"} bookableDays={availability.days} customer={customer} today={today} /></div>
      </section>
    </main>
  );
}
