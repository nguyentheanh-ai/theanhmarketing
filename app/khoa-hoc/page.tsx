import type { Metadata } from "next";
import Link from "next/link";
import { CourseCatalogBrowser } from "@/components/marketing/course-catalog-browser";
import { PageShell } from "@/components/site/page-shell";
import { publicPages } from "@/data/pages";
import { getCourses } from "@/services/courseService";

export const metadata: Metadata = {
  title: "Khóa học",
  description:
    "Danh sách chương trình trong AI Growth System: Facebook Ads 2026, AI Ads Engine, Funnel-driven Ads và Marketing nền tảng.",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const page = publicPages.courses;
  const courses = await getCourses();

  return (
    <PageShell>
      <section className="tam-grid-bg pb-14 pt-28 sm:pb-18 sm:pt-36">
        <div className="tam-container">
          <nav className="flex items-center gap-2 text-xs font-bold text-slate-400" aria-label="Breadcrumb">
            <Link className="hover:text-[var(--tam-accent-strong)]" href="/">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--tam-muted)]">Khóa học</span>
          </nav>
          <p className="tam-eyebrow mt-8">{page.eyebrow}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.05em] text-[var(--tam-ink)] sm:text-6xl">
            Chọn chương trình đúng với <span className="text-[var(--tam-accent)]">nút thắt hiện tại</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--tam-muted)] sm:text-lg">
            Tìm theo vấn đề, chủ đề hoặc cấp độ. Mọi thông tin sản phẩm và mức giá đều lấy từ hệ thống hiện có của The Anh Marketing.
          </p>
        </div>
      </section>

      <section className="tam-container pb-24">
        <CourseCatalogBrowser courses={courses} />
      </section>
    </PageShell>
  );
}
