import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageShell } from "@/components/site/page-shell";
import { publicPages } from "@/data/pages";
import { getCourses } from "@/services/courseService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khóa học",
  description:
    "Danh sách khóa học Marketing, AI ứng dụng, Growth, Content, Data và vận hành Marketing thực chiến của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const previewLabels = [
  "AI Fullstack Marketing System",
  "Marketing Data Analytics",
  "Content Traffic Engine",
  "Founder Marketing Blueprint",
  "AI Content & Automation Workflow",
  "Marketing Operation Management",
];

export default async function CoursesPage() {
  const page = publicPages.courses;
  const courses = await getCourses();

  return (
    <PageShell>
      <section className="ai-shell pb-16 pt-32 text-center sm:pt-40">
        <p className="ai-kicker">{page.eyebrow}</p>
        <h1 className="ai-glow-text mx-auto mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
          Transformation & Product Modules
        </h1>
        <p className="ai-muted mx-auto mt-5 max-w-3xl text-lg leading-8">
          Khám phá hệ sinh thái các module AI tự động hóa để tăng hiệu suất làm việc.
        </p>
      </section>

      <section className="ai-shell pb-20">
        <div className="grid gap-5 lg:grid-cols-3">
          {courses.map((course, index) => (
            <article key={course.slug} className="ai-panel grid min-h-[230px] gap-4 p-4 md:grid-cols-[168px_1fr]">
              <Link
                href={`/khoa-hoc/${course.slug}`}
                className="relative grid min-h-40 place-items-center overflow-hidden rounded-lg bg-white text-black"
              >
                <span className="absolute top-3 rounded-full bg-black px-5 py-1.5 text-[11px] font-black text-white">
                  Workflow Preview
                </span>
                <div className="grid w-24 gap-2">
                  <span className="h-2 rounded-full bg-[#159cfb]" />
                  <span className="h-2 rounded-full bg-black/20" />
                  <span className="h-2 rounded-full bg-black/20" />
                  <span className="h-12 rounded-lg border border-black/10 bg-[#eaf4ff]" />
                </div>
              </Link>
              <div>
                <Link href={`/khoa-hoc/${course.slug}`} className="text-xl font-black leading-tight hover:text-[#8bdcff]">
                  {previewLabels[index] ?? course.title}
                </Link>
                <p className="mt-4 text-xs font-black text-white">Module Timeline</p>
                <ol className="mt-2 space-y-1 text-xs leading-5 text-white/72">
                  <li>1. Foundation Setup</li>
                  <li>2. AI Integration</li>
                  <li>3. Deployment & Scaling</li>
                </ol>
                <p className="mt-4 text-xs font-black text-white">Included AI Tools</p>
                <p className="mt-1 text-sm text-white/62">n8n · GPT · Analytics · CRM</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-lg font-black text-white">{index % 2 === 0 ? "8X" : "10X"} Efficiency</span>
                  <AddToCartButton slug={course.slug} title={course.title} price={course.price} label="Thêm" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
