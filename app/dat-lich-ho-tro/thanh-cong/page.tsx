import Link from "next/link";
import { BadgeCheck, Clock3, MessageCircleMore } from "lucide-react";

export default async function SupportBookingSuccessPage({ searchParams }: { searchParams?: Promise<{ order?: string }> }) {
  const order = (await searchParams)?.order?.slice(0, 80) || "";
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8fb] px-5 py-16 text-slate-950">
      <section className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-7 text-center shadow-[0_28px_90px_rgba(15,23,42,0.1)] sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><BadgeCheck className="size-9" /></span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Thanh toán đã xác nhận</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Lịch hỗ trợ đã được ghi nhận</h1>
        <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-8 text-slate-600">Hệ thống đã khóa khung giờ 30 phút của bạn và gửi thông báo Telegram cho The Anh. Anh sẽ xem trước ghi chú để chuẩn bị đúng nội dung.</p>
        <div className="mt-7 grid gap-3 text-left sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><Clock3 className="size-5 text-blue-600" /><p className="mt-2 text-xs font-black uppercase text-slate-400">Mã đơn</p><p className="mt-1 break-all font-black">{order || "Đang cập nhật"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><MessageCircleMore className="size-5 text-blue-600" /><p className="mt-2 text-xs font-black uppercase text-slate-400">Chuẩn bị</p><p className="mt-1 font-black">Sẵn tài khoản và dữ liệu cần kiểm tra</p></div></div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-black text-white" href="/dashboard">Về khu học viên</Link><Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-black text-slate-800" href="/huong-dan">Xem hướng dẫn sử dụng</Link></div>
      </section>
    </main>
  );
}
