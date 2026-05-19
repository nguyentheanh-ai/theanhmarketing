import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { getCourses } from "@/services/courseService";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

const osNodes = [
  "AI Marketing",
  "CRM",
  "Templates",
  "Community",
  "Workflow Automation",
  "Data Analytics",
];

function DashboardPreview() {
  return (
    <div className="ai-panel-strong relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-sm font-black text-white">AI Content Engine & Workflows</p>
          <p className="mt-1 text-xs font-semibold text-white/42">Analytics · Workflow · Research · Settings</p>
        </div>
        <span className="rounded-lg border border-[#77d7ff]/25 bg-[#159cfb]/15 px-3 py-1.5 text-xs font-black text-[#8bdcff]">
          AI Seeded
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-white/45">
            <span>Content Performance</span>
            <span className="text-emerald-200">+ green</span>
          </div>
          <div className="mt-8 h-32">
            <div className="relative h-full overflow-hidden rounded-lg border border-white/8 bg-[#081422]">
              <div className="absolute inset-x-0 bottom-0 h-[72%] bg-[linear-gradient(180deg,rgba(56,189,248,0.52),rgba(56,189,248,0.03))]" />
              <div className="absolute left-[7%] top-[58%] h-1 w-[18%] rotate-[-18deg] rounded-full bg-[#77d7ff] shadow-[0_0_18px_rgba(56,189,248,0.8)]" />
              <div className="absolute left-[24%] top-[46%] h-1 w-[20%] rotate-[-8deg] rounded-full bg-[#77d7ff] shadow-[0_0_18px_rgba(56,189,248,0.8)]" />
              <div className="absolute left-[43%] top-[35%] h-1 w-[20%] rotate-[18deg] rounded-full bg-[#77d7ff] shadow-[0_0_18px_rgba(56,189,248,0.8)]" />
              <div className="absolute left-[61%] top-[30%] h-1 w-[28%] rotate-[-20deg] rounded-full bg-[#77d7ff] shadow-[0_0_18px_rgba(56,189,248,0.8)]" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-white/45">
            <span>Audience Engagement</span>
            <span>•••</span>
          </div>
          <div className="mt-8 flex h-32 items-end gap-2">
            {[42, 68, 55, 82, 38, 74, 91, 64].map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="flex-1 rounded-t bg-gradient-to-t from-[#3654ff] to-[#77d7ff] shadow-[0_0_16px_rgba(56,189,248,0.35)]"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-xs font-bold text-white/45">Node Based</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {["Market Trends", "AI Ideation", "Content Creation", "Automated Outreach", "Performance"].map((item, index) => (
            <div key={item} className="rounded-lg border border-[#77d7ff]/25 bg-[#102033] p-3 text-center shadow-[0_0_24px_rgba(56,189,248,0.1)]">
              <span className="mx-auto grid size-8 place-items-center rounded-md bg-[#159cfb]/18 text-xs font-black text-[#8bdcff]">
                {index + 1}
              </span>
              <p className="mt-2 text-[11px] font-bold leading-4 text-white/70">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EcosystemMap() {
  return (
    <div className="ai-panel-strong relative overflow-hidden px-4 py-12 sm:px-8">
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(rgba(56,189,248,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.14)_1px,transparent_1px)] bg-[length:48px_48px] opacity-55 [transform:perspective(520px)_rotateX(58deg)]" />
      <div className="relative mx-auto grid size-40 place-items-center rounded-full border border-[#77d7ff]/35 bg-[#0d1825]/90 text-center shadow-[0_0_90px_rgba(56,189,248,0.34)]">
        <span className="ai-orb absolute -right-2 top-4 size-5" />
        <p className="text-2xl font-black leading-tight">THE ANH<br />OS</p>
      </div>
      <div className="relative mt-10 grid gap-4 md:grid-cols-3">
        {osNodes.map((node) => (
          <Link key={node} href="/khoa-hoc" className="rounded-xl border border-[#77d7ff]/18 bg-white/[0.07] p-5 backdrop-blur transition hover:border-[#77d7ff]/45 hover:bg-white/[0.1]">
            <span className="ai-orb block size-9" />
            <p className="mt-5 text-lg font-black">{node}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const [courses, resources, testimonials] = await Promise.all([
    getCourses(),
    getResources(),
    getTestimonials(),
  ]);
  const featuredCourses = courses.slice(0, 6);
  const featuredResources = resources.slice(0, 3);
  const featuredTestimonials = testimonials.slice(0, 4);

  return (
    <PageShell>
      <section className="ai-shell pt-32 pb-20 sm:pt-40">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="ai-kicker">AI Operating System</p>
            <h1 className="ai-glow-text mt-6 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.05em] sm:text-7xl">
              The Operating System for Modern Marketers
            </h1>
            <p className="ai-muted mt-6 max-w-2xl text-lg leading-8">
              Build, automate, and scale your AI-powered business with The Anh&apos;s integrated marketing ecosystem.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/khoa-hoc">Explore Ecosystem</ButtonLink>
              <ButtonLink href="/tai-lieu" variant="secondary">Watch the film</ButtonLink>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="ai-shell py-16 text-center">
        <p className="ai-kicker">AI Operating System</p>
        <h2 className="ai-glow-text mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
          Sticky-scroll behavior of the modem.
        </h2>
        <div className="mt-10">
          <EcosystemMap />
        </div>
      </section>

      <section className="ai-shell py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Product modules"
            title="Transformation & Product Modules"
            description="Khám phá hệ sinh thái các module AI tự động hóa để tăng hiệu suất làm việc."
          />
          <ButtonLink href="/khoa-hoc" variant="secondary">Xem tất cả</ButtonLink>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {featuredCourses.map((course, index) => (
            <article key={course.slug} className="ai-panel grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
              <Link href={`/khoa-hoc/${course.slug}`} className="grid min-h-36 place-items-center rounded-lg bg-white text-black">
                <span className="rounded-full bg-black px-5 py-2 text-xs font-black text-white">Workflow Preview</span>
              </Link>
              <div>
                <Link href={`/khoa-hoc/${course.slug}`} className="text-xl font-black leading-tight hover:text-[#8bdcff]">
                  {course.title}
                </Link>
                <p className="mt-3 text-xs font-bold text-white/55">Module Timeline</p>
                <ol className="mt-2 space-y-1 text-xs leading-5 text-white/65">
                  <li>1. Foundation Setup</li>
                  <li>2. AI Integration</li>
                  <li>3. Deployment & Scaling</li>
                </ol>
                <p className="mt-3 text-sm font-black text-[#8bdcff]">
                  {index % 2 === 0 ? "8X Content Output" : "10X Insights"}
                </p>
                <div className="mt-4">
                  <AddToCartButton slug={course.slug} title={course.title} price={course.price} label="Thêm khóa học" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-shell py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              eyebrow="Proof content hub"
              title="Social Proof & Media Ecosystem"
              description="Niềm tin, nội dung, case study và tài nguyên được đóng gói thành một proof hub."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {featuredTestimonials.map((item) => (
                <SoftCard key={`${item.name}-${item.quote}`} className="p-5">
                  <p className="text-sm leading-6 text-white/70">&ldquo;{item.quote}&rdquo;</p>
                  <p className="mt-4 font-black">{item.name}</p>
                  <p className="text-xs text-white/45">{item.title}</p>
                </SoftCard>
              ))}
            </div>
          </div>
          <div className="ai-panel-strong p-5">
            <p className="ai-kicker">Media hub</p>
            <h3 className="mt-3 text-3xl font-black">AI Workflows in Action</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {featuredResources.map((item) => (
                <Link key={item.slug} href="/tai-lieu" className="rounded-xl border border-white/10 bg-white/7 p-4 transition hover:border-[#77d7ff]/35">
                  <div className="grid aspect-[9/13] place-items-center rounded-lg bg-black/35">
                    <span className="grid size-12 place-items-center rounded-full bg-[#159cfb] text-xl">▶</span>
                  </div>
                  <p className="mt-4 font-black">{item.title}</p>
                  <p className="mt-1 text-xs text-white/45">{item.type}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20 pt-10">
        <div className="ai-panel-strong overflow-hidden p-8 sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="ai-kicker">Final CTA</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-6xl">
              Build your AI marketing operating system.
            </h2>
            <p className="ai-muted mt-5 max-w-2xl leading-8">
              Bắt đầu bằng khóa học, tài liệu hoặc dashboard học viên hiện có. Logic tài khoản và quyền học vẫn được giữ nguyên.
            </p>
          </div>
          <ButtonLink href="/dang-ky" className="mt-8 lg:mt-0">Bắt đầu</ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
