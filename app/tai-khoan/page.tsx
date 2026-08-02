import Link from "next/link";
import type { Metadata } from "next";
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
  return (
    <PageShell>
      <section className="tam-container pb-20 pt-32 sm:pt-40">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="tam-pill w-fit">Tài khoản học viên</p><h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-[var(--tam-ink)] sm:text-6xl">Xin chào, {displayName}</h1></div>
          <div className="flex gap-3"><Link className="tam-button" href="/dashboard">Khóa học của tôi</Link><SignOutButton /></div>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <AccountProfileForm email={email} name={displayName} phone={phone} />
          <div className="grid content-start gap-5">
            <section className="tam-card p-6"><h2 className="text-xl font-black text-[var(--tam-ink)]">Khóa học đã đăng ký</h2><div className="mt-4 grid gap-3">{ownedCourses.length ? ownedCourses.map((course) => <Link className="rounded-2xl bg-[#eef8ff] p-4 font-black text-[var(--tam-ink)]" href="/dashboard" key={course.slug}>{course.title}</Link>) : <p className="text-sm text-[var(--tam-muted)]">Tài khoản chưa có khóa học.</p>}</div></section>
            <section className="tam-card p-6"><h2 className="text-xl font-black text-[var(--tam-ink)]">Bảo mật</h2><Link className="mt-4 inline-flex font-black text-[var(--tam-accent-strong)]" href="/doi-mat-khau?mode=account&next=/tai-khoan">Đổi mật khẩu →</Link></section>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
