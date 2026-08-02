import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, BookOpenCheck, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageShell } from "@/components/site/page-shell";
import { requireStudentAuth } from "@/lib/auth/session";
import { getStudentPortalSnapshot } from "@/services/studentPortalService";

export const metadata: Metadata = { title: "Tài khoản", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireStudentAuth("/tai-khoan");
  const { displayName, email, phone, ownedCourses } = await getStudentPortalSnapshot();
  const initial = displayName.trim().charAt(0).toUpperCase() || "T";

  return (
    <PageShell>
      <section className="tam-container pb-20 pt-28 sm:pt-36">
        <div className="rounded-[32px] border border-[#cfe8f8] bg-[linear-gradient(135deg,#eef9ff_0%,#ffffff_52%,#eef4ff_100%)] p-6 shadow-[0_24px_80px_rgba(36,111,166,0.12)] sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <span className="grid size-16 shrink-0 place-items-center rounded-[22px] bg-[#159cfb] text-2xl font-black text-white shadow-[0_14px_36px_rgba(21,156,251,0.28)]">{initial}</span>
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#087dc6]"><BadgeCheck className="size-4" />Tài khoản học viên</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#12335b] sm:text-5xl">Xin chào, {displayName}</h1>
                <p className="mt-2 break-all text-sm font-bold text-[#6486a2] sm:break-normal">{email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#159cfb] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(21,156,251,0.22)]" href="/dashboard"><GraduationCap className="size-5" />Khóa học của tôi</Link>
              <SignOutButton />
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4"><BookOpenCheck className="size-5 text-[#159cfb]" /><div><p className="text-2xl font-black text-[#12335b]">{ownedCourses.length}</p><p className="text-xs font-bold text-[#6486a2]">Khóa học được cấp</p></div></div>
            <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4"><ShieldCheck className="size-5 text-emerald-500" /><div><p className="font-black text-[#12335b]">Đã xác thực</p><p className="text-xs font-bold text-[#6486a2]">Email đăng nhập</p></div></div>
            <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4"><UserRound className="size-5 text-[#3156d3]" /><div><p className="font-black text-[#12335b]">Tự quản lý</p><p className="text-xs font-bold text-[#6486a2]">Thông tin và bảo mật</p></div></div>
          </div>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="tam-pill w-fit">Thiết lập tài khoản</p>
            <p className="mb-5 mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#6486a2]">Mỗi thay đổi được tách thành một khu vực riêng để bạn dễ kiểm tra và không cập nhật nhầm.</p>
            <AccountProfileForm email={email} name={displayName} phone={phone} />
          </div>

          <aside className="h-fit lg:sticky lg:top-28">
            <section className="tam-card p-6">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#eaf7ff] text-[#087dc6]"><GraduationCap className="size-5" /></span><div><h2 className="text-lg font-black text-[#12335b]">Khóa học đã đăng ký</h2><p className="text-xs font-bold text-[#6486a2]">{ownedCourses.length} khóa trong tài khoản</p></div></div>
              <div className="mt-5 grid gap-3">
                {ownedCourses.length ? ownedCourses.map((course) => (
                  <Link className="rounded-2xl border border-[#d8edf9] bg-[#f4fbff] p-4 text-sm font-black leading-5 text-[#12335b] transition hover:border-[#9bd8fb] hover:bg-[#eaf7ff]" href="/dashboard" key={course.slug}>{course.title}</Link>
                )) : <p className="rounded-2xl bg-[#f4fbff] p-4 text-sm font-semibold text-[#6486a2]">Tài khoản chưa có khóa học.</p>}
              </div>
            </section>
            <section className="mt-5 rounded-[26px] border border-[#bfe6fb] bg-[#eaf7ff] p-6">
              <p className="text-sm font-black text-[#087dc6]">Cần hỗ trợ?</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#31597a]">Sau khi cập nhật số điện thoại, học viên đủ điều kiện có thể xem và đặt lịch hỗ trợ 1:1.</p>
              <Link className="mt-4 inline-flex font-black text-[#087dc6]" href="/dat-lich-ho-tro">Xem lịch hỗ trợ →</Link>
            </section>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}
