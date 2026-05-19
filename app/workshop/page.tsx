import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getCourses } from "@/services/courseService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workshop AI Marketing",
  description:
    "Lịch workshop, masterclass và buổi live triển khai AI Marketing của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const countdown = [
  ["04", "days"],
  ["18", "hours"],
  ["25", "minutes"],
  ["10", "seconds"],
];

const sessions = [
  "AI-Driven Marketing Strategies",
  "Generative AI cho Content & Ads",
  "AI Ethics & Policy Workshop",
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
            <Link href="/workshop">Workshops</Link>
            <Link href="/he-sinh-thai">Ecosystem</Link>
            <Link href="/hoc-vien">Community</Link>
          </nav>
          <div className="text-center">
            <p className="ai-kicker">Live AI Workshops & Events</p>
            <h1>Live AI Workshops & Events</h1>
            <p>Buổi live giúp bạn triển khai prompt, content engine, quảng cáo và automation theo tình huống thực tế.</p>
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
            <p className="ai-kicker">Upcoming Live Masterclasses</p>
            <div className="mt-5 grid gap-4">
              {sessions.map((session, index) => (
                <article key={session} className={`event-ticket ${index === 1 ? "violet" : index === 2 ? "green" : ""}`}>
                  <div>
                    <span>Digital Pass</span>
                    <h2>{session}</h2>
                    <p>Thứ 6 hằng tuần, 20:00 GMT+7 · Instructor: The Anh</p>
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
            <p className="ai-kicker">Past Masterclasses Gallery</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">Xem lại các buổi đã diễn ra</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {["Intro to Generative AI", "Machine Learning Basics", "AI Prompt System", "Workflow Automation"].map((item) => (
                <Link key={item} href="/blog#tai-lieu" className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[#77d7ff]/35">
                  <span className="text-xs font-black text-[#8bdcff]">Replay</span>
                  <p className="mt-2 text-lg font-black">{item}</p>
                  <p className="mt-2 text-sm text-white/55">Tài liệu, checklist và replay nằm trong thư viện học viên.</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

