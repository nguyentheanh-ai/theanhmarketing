import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, ChevronRight, FileText, Headphones, Home, LayoutDashboard, Settings } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/site/brand-mark";
import styles from "./student-dashboard.module.css";

export function StudentAreaShell({ children, title = "Tổng quan", active = "overview", ownedCount, studentName = "", studentEmail = "" }: {
  children: ReactNode; title?: string; active?: "overview" | "agents"; ownedCount?: number; studentName?: string; studentEmail?: string;
}) {
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}><BrandMark className={styles.brandMark} /><span>The Anh<span className={styles.brandSub}>KHÔNG GIAN HỌC TẬP</span></span></Link>
      <p className={styles.navLabel}>HỌC TẬP</p>
      <nav aria-label="Điều hướng học viên" className={styles.nav}>
        <Link href="/dashboard" aria-current={active === "overview" ? "page" : undefined}><LayoutDashboard size={19} />Tổng quan</Link>
        <Link href="/dashboard#khoa-hoc"><BookOpen size={19} />Khóa học của tôi{ownedCount !== undefined ? <span>{ownedCount}</span> : null}</Link>
        <Link href="/dashboard#tai-lieu"><FileText size={19} />Tài liệu</Link>
        <Link href="/dashboard#ho-tro"><Headphones size={19} />Hỗ trợ</Link>
        <Link href="/tai-khoan"><Settings size={19} />Tài khoản</Link>
        <Link href="/dashboard/agents" aria-current={active === "agents" ? "page" : undefined}><BookOpen size={19} />Nhân viên AI</Link>
      </nav>
      <div className={styles.sidebarBottom}>
        <Link href="/" className={styles.backHome}><Home size={17} /> Về trang chủ</Link>
        {studentName ? <div className={styles.identity}><span className={styles.avatar}>{(studentName || "HV").slice(0, 1).toUpperCase()}</span><div><strong>{studentName || "Học viên"}</strong><span>{studentEmail}</span></div></div> : null}
        <SignOutButton className={styles.signOut} />
      </div>
    </aside>
    <div className={styles.main}>
      <header className={styles.topbar}><span>Khu vực học viên <ChevronRight size={14} /> <strong>{title}</strong></span><Link href="/tai-khoan" className={styles.account}>Tài khoản <Settings size={17} /></Link></header>
      <main className={styles.content}>
        {children}
        <footer className={styles.footer}>The Anh Marketing <span>Học kiến thức. Xây năng lực.</span></footer>
      </main>
    </div>
    <nav className={styles.mobileNav} aria-label="Điều hướng học viên trên điện thoại"><Link href="/dashboard#khoa-hoc"><BookOpen size={20} />Khóa học</Link><Link href="/dashboard#tai-lieu"><FileText size={20} />Tài liệu</Link><Link href="/dashboard#ho-tro"><Headphones size={20} />Hỗ trợ</Link><Link href="/tai-khoan"><Settings size={20} />Tài khoản</Link></nav>
  </div>;
}
