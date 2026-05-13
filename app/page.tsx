import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { StatGrid } from "@/components/ui/stat-grid";
import { homePage } from "@/data/home";
import { faqs, platformStats } from "@/data/site";
import { getBlogPosts } from "@/services/blogService";
import { getBrandSettings } from "@/services/brandService";
import { getCourses } from "@/services/courseService";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [brand, courses, resources, testimonials, blogPosts] = await Promise.all([
    getBrandSettings(),
    getCourses(),
    getResources(),
    getTestimonials(),
    getBlogPosts(),
  ]);
  const featuredCourse = courses[0];

  return (
    <PageShell>
      <section className="flex min-h-screen items-center justify-center px-5 pb-20 pt-40 sm:px-8 lg:pt-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black/60 shadow-[0_12px_40px_rgba(0,0,0,0.04)] sm:text-sm">
            <span className="text-[#f2a23a]" aria-hidden="true">
              ✨
            </span>
            {homePage.hero.badge}
          </div>

          <h1 className="hero-title mt-10 max-w-5xl text-[clamp(3.25rem,10vw,6.6rem)] font-black leading-[0.98] tracking-[-0.045em] text-black">
            <span className="block">{homePage.hero.titleLines[0]}</span>
            <span className="block font-light italic tracking-[-0.045em]">
              {homePage.hero.titleLines[1]}
            </span>
            <span className="relative inline-block">
              {homePage.hero.titleLines[2]}
              <span
                aria-hidden="true"
                className="hero-underline absolute bottom-[0.06em] left-1/2 -z-0 h-[0.18em] w-[104%] -translate-x-1/2 rounded-full bg-[#ffd39d]"
              />
            </span>
          </h1>

          <p className="hero-copy mt-8 max-w-3xl text-base leading-8 text-black/70 sm:text-xl sm:leading-9">
            {homePage.hero.description}
          </p>

          <div className="hero-actions mt-9 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <ButtonLink href={homePage.hero.primaryCta.href} className="w-full sm:w-auto">
              {homePage.hero.primaryCta.label}
              <span aria-hidden="true">→</span>
            </ButtonLink>
            <ButtonLink href={homePage.hero.secondaryCta.href} variant="secondary" className="w-full sm:w-auto">
              <span className="grid size-5 place-items-center rounded-full border border-black/30 text-[10px]">
                ▶
              </span>
              {homePage.hero.secondaryCta.label}
            </ButtonLink>
          </div>

          <div className="hero-stats mt-14">
            <StatGrid stats={platformStats} />
          </div>

          {brand.heroVideoUrl || brand.heroImageUrl ? (
            <div className="mt-12 w-full overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
              {brand.heroVideoUrl ? (
                <video
                  className="aspect-video w-full object-cover"
                  controls
                  muted
                  playsInline
                  poster={brand.heroImageUrl || undefined}
                  src={brand.heroVideoUrl}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={brand.name}
                  className="aspect-video w-full object-cover"
                  src={brand.heroImageUrl}
                />
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeading
          eyebrow={homePage.problem.eyebrow}
          title={homePage.problem.title}
          description={homePage.problem.description}
        />
        <div className="grid gap-4">
          {homePage.problem.items.map((item) => (
            <SoftCard key={item} className="text-lg leading-8 text-black/70">
              {item}
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="grid gap-10 rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.05)] sm:p-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow={homePage.ecosystem.eyebrow}
            title={homePage.ecosystem.title}
          />
          <p className="text-lg leading-9 text-black/65">
            {homePage.ecosystem.description}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow={homePage.featuredCourses.eyebrow} title={homePage.featuredCourses.title} />
          <ButtonLink href={homePage.featuredCourses.cta.href} variant="secondary">
            {homePage.featuredCourses.cta.label}
          </ButtonLink>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <SoftCard
              key={course.slug}
              className="h-full"
            >
              <Link href={`/khoa-hoc/${course.slug}`} className="block">
                <p className="text-sm font-semibold text-[#c77b20]">{course.eyebrow}</p>
                <h3 className="mt-4 text-3xl font-black tracking-[-0.05em]">
                  {course.title}
                </h3>
                <p className="mt-4 text-base leading-8 text-black/65">
                  {course.description}
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {course.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-[#f2eadf] px-3 py-1 text-xs font-semibold text-black/70"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </Link>
              <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                <ButtonLink
                  href={`/khoa-hoc/${course.slug}#giao-trinh`}
                  className="w-full sm:w-auto"
                >
                  Học thử miễn phí
                </ButtonLink>
                <ButtonLink
                  href={`/khoa-hoc/${course.slug}`}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Chi tiết
                </ButtonLink>
              </div>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <SectionHeading
          eyebrow={homePage.learningPath.eyebrow}
          title={homePage.learningPath.title}
        />
        <div className="mt-10 grid gap-4">
          {homePage.learningPath.items.map((item, index) => (
            <SoftCard
              key={item}
              className="grid gap-4 text-lg leading-8 text-black/70 sm:grid-cols-[72px_1fr]"
            >
              <span className="text-3xl font-black tracking-[-0.05em] text-black">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{item}</span>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="rounded-[2rem] bg-[#f2eadf] p-8 sm:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow={homePage.resources.eyebrow}
              title={homePage.resources.title}
            />
            <ButtonLink href={homePage.resources.cta.href} variant="secondary">
              {homePage.resources.cta.label}
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {resources.map((item) => (
              <div key={item.title} className="rounded-3xl bg-white/80 p-6">
                <p className="text-sm font-semibold text-[#c77b20]">
                  {item.type} · {item.access}
                </p>
                <h3 className="mt-3 text-xl font-bold tracking-[-0.03em]">
                  {item.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <SectionHeading
          eyebrow={homePage.testimonials.eyebrow}
          title={homePage.testimonials.title}
          align="center"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <SoftCard key={item.name}>
              <p className="text-lg leading-8 text-black/70">“{item.quote}”</p>
              <p className="mt-6 font-bold">{item.name}</p>
              <p className="mt-1 text-sm text-black/50">{item.title}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow={homePage.blog.eyebrow} title={homePage.blog.title} />
          <ButtonLink href={homePage.blog.cta.href} variant="secondary">
            {homePage.blog.cta.label}
          </ButtonLink>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <SoftCard className="h-full">
                <p className="text-sm font-semibold text-[#c77b20]">
                  {post.category}
                </p>
                <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                  {post.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-black/60">
                  {post.excerpt}
                </p>
              </SoftCard>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <SectionHeading eyebrow={homePage.faq.eyebrow} title={homePage.faq.title} />
        <div className="mt-10 grid gap-4">
          {faqs.map((item) => (
            <SoftCard key={item.question}>
              <h3 className="text-xl font-bold tracking-[-0.03em]">
                {item.question}
              </h3>
              <p className="mt-3 text-base leading-8 text-black/65">
                {item.answer}
              </p>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold text-[#c77b20]">
            {featuredCourse.statusLabel}
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            {homePage.finalCta.titlePrefix} {featuredCourse.title}.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/65">
            Học phí hiện tại {featuredCourse.price}. {homePage.finalCta.description}
          </p>
          <ButtonLink href={homePage.finalCta.cta.href} className="mt-9">
            {homePage.finalCta.cta.label}
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
