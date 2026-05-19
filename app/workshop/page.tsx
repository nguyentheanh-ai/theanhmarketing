import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getCourses } from "@/services/courseService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workshop AI Growth System",
  description:
    "Workshop live chẩn đoán Growth System, AI Ads Engine, Funnel và Automation của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const countdown = [
  ["04", "ngày"],
  ["18", "giờ"],
  ["25", "phút"],
  ["10", "giây"],
];

const sessions = [
  "Chẩn đoán AI Growth System cho SME",
  "Facebook Ads 2026: chạy theo funnel và đọc dữ liệu",
  "Automation workflow cho founder và team nhỏ",
];

export default async function WorkshopPage() {
  const courses = await getCourses();
  const featuredCourse = courses[0];

  return (
    <PageShell>
      <section className="ai-shell pb-14 pt-28 sm:pt-32">
        <div className="live-workshop-hero">
          <nav>
            <span>The Anh Marketing</span>
            <Link href="/workshop">Workshop</Link>
            <Link href="/he-sinh-thai">Growth System</Link>
            <Link href="/hoc-vien">Operator Hub</Link>
          </nav>
          <div className="text-center">
            <p className="ai-kicker">Live workshop</p>
            <h1>Workshop chẩn đoán Growth System và AI Ads Engine</h1>
            <p>Các buổi live giúp bạn nhìn ra điểm nghẽn ở content, ads, funnel, automation và CRM rồi chọn việc cần xử lý trước.</p>
            <div className="workshop-countdown">
              {countdown.map(([value, label]) => (
                <span key={label}>
                  <strong>{value}</strong>
                  <small>{label}</small>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="ai-kicker">Lịch live sắp tới</p>
            <div className="mt-5 grid gap-4">
              {sessions.map((session, index) => (
                <article key={session} className={`event-ticket ${index === 1 ? "violet" : index === 2 ? "green" : ""}`}>
                  <div>
                    <span>Digital pass</span>
                    <h2>{session}</h2>
                    <p>Thứ 6 hằng tuần, 20:00 GMT+7 - Instructor: The Anh</p>
                    {featuredCourse ? (
                      <AddToCartButton
                        slug={featuredCourse.slug}
                        title={`${featuredCourse.title} + Workshop Pass`}
                        price={featuredCourse.price}
                        label="Giữ chỗ"
                      />
                    ) : (
                      <ButtonLink href="/dang-ky">Giữ chỗ</ButtonLink>
                    )}
                  </div>
                  <i aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>

          <div className="ai-panel-strong p-7">
            <p className="ai-kicker">Replay & toolkit</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">Xem lại các buổi đã diễn ra</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {["AI Growth System Diagnosis", "Facebook Ads trong funnel", "AI Content Engine", "Workflow automation"].map((item) => (
                <Link key={item} href="/blog#tai-lieu" className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[#77d7ff]/35">
                  <span className="text-xs font-black text-[#8bdcff]">Replay</span>
                  <p className="mt-2 text-lg font-black">{item}</p>
                  <p className="mt-2 text-sm text-white/55">Toolkit, checklist và replay nằm trong thư viện học viên.</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
