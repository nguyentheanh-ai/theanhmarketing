import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { homePage } from "@/data/home";
import { getCourseLessonCount, type Course } from "@/data/courses";
import { faqs, platformStats } from "@/data/site";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";
import { getBlogPosts } from "@/services/blogService";
import { getBrandSettings } from "@/services/brandService";
import { getCourses } from "@/services/courseService";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

export const dynamic = "force-dynamic";

function getCourseImage(course: Course) {
  return (
    course.thumbnailImageUrl ||
    course.bannerImageUrl ||
    toYouTubeThumbnailUrl(course.videoPreviewUrl)
  );
}

function getCourseMeta(course: Course) {
  return [
    `${course.modules.length} module`,
    `${getCourseLessonCount(course)} bai hoc`,
    course.level,
  ];
}

function MediaPanel({
  brand,
  course,
}: {
  brand: Awaited<ReturnType<typeof getBrandSettings>>;
  course: Course;
}) {
  const courseImage = getCourseImage(course);
  const backgroundImage = brand.heroImageUrl || courseImage;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-[#111113] text-white shadow-[0_34px_90px_rgba(0,0,0,0.2)] ring-1 ring-white/10">
      <div
        className="min-h-[330px] bg-[#161719] bg-cover bg-center sm:min-h-[470px]"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      >
        {brand.heroVideoUrl ? (
          <video
            className="h-full min-h-[330px] w-full object-cover sm:min-h-[470px]"
            controls
            muted
            playsInline
            poster={backgroundImage || undefined}
            src={brand.heroVideoUrl}
          />
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/72 p-5 backdrop-blur-md sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ad57]">
          Dang mo dang ky
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-4xl">{course.title}</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/72">
          {course.shortDescription || course.description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {getCourseMeta(course).map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-bold text-white/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeStatStrip() {
  return (
    <div className="grid gap-3 rounded-[1.5rem] border border-black/8 bg-white p-3 shadow-[0_22px_70px_rgba(0,0,0,0.06)] sm:grid-cols-3">
      {platformStats.map((item) => (
        <div key={item.label} className="rounded-[1.1rem] bg-[#f7f3ec] px-5 py-4">
          <p className="text-3xl font-black text-[#111113]">{item.value}</p>
          <p className="mt-1 text-sm font-bold text-black/54">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export default async function Home() {
  const [brand, courses, resources, testimonials, blogPosts] = await Promise.all([
    getBrandSettings(),
    getCourses(),
    getResources(),
    getTestimonials(),
    getBlogPosts(),
  ]);
  const featuredCourse = courses[0];
  const highlightedCourses = courses.slice(0, 4);
  const featuredResources = resources.slice(0, 3);
  const featuredTestimonials = testimonials.slice(0, 3);
  const featuredPosts = blogPosts.slice(0, 3);

  if (!featuredCourse) {
    return (
      <PageShell>
        <section className="px-5 py-32 sm:px-8">
          <div className="mx-auto max-w-[1440px]">
            <SectionHeading
              eyebrow="The Anh Marketing"
              title="Homepage dang cho du lieu khoa hoc."
              description="Hay them khoa hoc trong admin de hien thi day du trang chu."
            />
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="bg-[#f6f0e4] px-5 pb-20 pt-36 sm:px-8 lg:pt-32">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-black/58 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
              {homePage.hero.badge}
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-none text-[#101012] sm:text-6xl lg:text-7xl">
              <span className="block">{homePage.hero.titleLines[0]}</span>
              <span className="block text-[#2f8f62]">{homePage.hero.titleLines[1]}</span>
              <span className="block">{homePage.hero.titleLines[2]}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-black/68">
              {homePage.hero.description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={homePage.hero.primaryCta.href} className="w-full sm:w-auto">
                {homePage.hero.primaryCta.label}
                <span aria-hidden="true">-&gt;</span>
              </ButtonLink>
              <ButtonLink href={homePage.hero.secondaryCta.href} variant="secondary" className="w-full sm:w-auto">
                {homePage.hero.secondaryCta.label}
              </ButtonLink>
            </div>
            <div className="mt-10">
              <HomeStatStrip />
            </div>
          </div>

          <MediaPanel brand={brand} course={featuredCourse} />
        </div>
      </section>

      <section className="border-y border-black/8 bg-[#111113] px-5 py-16 text-white sm:px-8">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8ad57]">
              {homePage.ecosystem.eyebrow}
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              {homePage.ecosystem.title}
            </h2>
          </div>
          <div>
            <p className="text-lg font-medium leading-9 text-white/68">
              {homePage.ecosystem.description}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Course catalog", "Mini LMS", "CMS van hanh"].map((item) => (
                <div key={item} className="rounded-[1.1rem] border border-white/10 bg-white/6 p-4">
                  <p className="text-sm font-black text-white">{item}</p>
                  <div className="mt-4 h-1.5 rounded-full bg-[#2f8f62]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeading
          eyebrow={homePage.problem.eyebrow}
          title={homePage.problem.title}
          description={homePage.problem.description}
        />
        <div className="grid gap-4">
          {homePage.problem.items.map((item, index) => (
            <div
              key={item}
              className="grid gap-4 rounded-[1.25rem] border border-black/8 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.045)] sm:grid-cols-[56px_1fr]"
            >
              <span className="grid size-12 place-items-center rounded-full bg-[#111113] text-sm font-black text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-lg font-semibold leading-8 text-black/68">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow={homePage.featuredCourses.eyebrow} title={homePage.featuredCourses.title} />
            <ButtonLink href={homePage.featuredCourses.cta.href} variant="secondary">
              {homePage.featuredCourses.cta.label}
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {highlightedCourses.map((course, index) => {
              const imageUrl = getCourseImage(course);

              return (
                <article
                  key={course.slug}
                  className={index === 0 ? "overflow-hidden rounded-[1.5rem] bg-[#111113] text-white shadow-[0_30px_90px_rgba(0,0,0,0.16)] lg:col-span-2" : "overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#fbfaf7] shadow-[0_20px_65px_rgba(0,0,0,0.055)]"}
                >
                  <Link href={`/khoa-hoc/${course.slug}`} className="block">
                    <div
                      className="min-h-[230px] bg-[#ebe2d4] bg-cover bg-center"
                      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
                    />
                    <div className="p-6">
                      <p className={index === 0 ? "text-xs font-black uppercase tracking-[0.16em] text-[#d8ad57]" : "text-xs font-black uppercase tracking-[0.16em] text-[#b86f1e]"}>
                        {course.statusLabel}
                      </p>
                      <h3 className="mt-3 text-3xl font-black leading-tight">{course.title}</h3>
                      <p className={index === 0 ? "mt-4 line-clamp-3 text-sm font-semibold leading-7 text-white/68" : "mt-4 line-clamp-3 text-sm font-semibold leading-7 text-black/60"}>
                        {course.shortDescription || course.description}
                      </p>
                      <div className="mt-6 flex items-center justify-between gap-4 text-sm font-black">
                        <span className={index === 0 ? "text-white" : "text-[#a76218]"}>{course.price}</span>
                        <span className={index === 0 ? "text-white/58" : "text-black/48"}>{getCourseLessonCount(course)} bai</span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <SectionHeading
            eyebrow={homePage.learningPath.eyebrow}
            title={homePage.learningPath.title}
          />
          <div className="grid gap-4">
            {homePage.learningPath.items.map((item, index) => (
              <div key={item} className="rounded-[1.25rem] border border-black/8 bg-white p-6">
                <p className="text-sm font-black text-[#2f8f62]">Buoc {index + 1}</p>
                <p className="mt-3 text-lg font-bold leading-8 text-black/70">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#ebe2d4] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow={homePage.resources.eyebrow}
              title={homePage.resources.title}
            />
            <ButtonLink href={homePage.resources.cta.href} variant="secondary">
              {homePage.resources.cta.label}
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredResources.map((item) => (
              <SoftCard key={item.title} className="h-full rounded-[1.25rem]">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#b86f1e]">
                  {item.type} / {item.access}
                </p>
                <h3 className="mt-4 text-2xl font-black leading-tight">{item.title}</h3>
                <p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-black/58">
                  {item.description}
                </p>
              </SoftCard>
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
          {featuredTestimonials.map((item) => (
            <SoftCard key={item.name} className="h-full rounded-[1.25rem]">
              <p className="text-lg font-semibold leading-8 text-black/70">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-7 font-black">{item.name}</p>
              <p className="mt-1 text-sm font-semibold text-black/45">{item.title}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading eyebrow={homePage.blog.eyebrow} title={homePage.blog.title} />
            <ButtonLink href={homePage.blog.cta.href} variant="secondary">
              {homePage.blog.cta.label}
            </ButtonLink>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="h-full rounded-[1.25rem] border border-black/8 bg-[#fbfaf7] p-6 transition hover:border-[#2f8f62] hover:bg-white">
                  <p className="text-sm font-black text-[#b86f1e]">{post.category}</p>
                  <h3 className="mt-4 text-2xl font-black leading-tight group-hover:text-[#2f6f4d]">
                    {post.title}
                  </h3>
                  <p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-black/58">
                    {post.excerpt}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr]">
        <SectionHeading eyebrow={homePage.faq.eyebrow} title={homePage.faq.title} />
        <div className="grid gap-4">
          {faqs.map((item) => (
            <div key={item.question} className="rounded-[1.25rem] border border-black/8 bg-white p-6">
              <h3 className="text-xl font-black leading-tight">{item.question}</h3>
              <p className="mt-3 text-base font-medium leading-8 text-black/62">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[1.75rem] bg-[#111113] p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.14)] sm:p-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#d8ad57]">
              {featuredCourse.statusLabel}
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
              {homePage.finalCta.titlePrefix} {featuredCourse.title}.
            </h2>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/68">
              Hoc phi hien tai {featuredCourse.price}. {homePage.finalCta.description}
            </p>
          </div>
          <ButtonLink href={homePage.finalCta.cta.href} className="mt-9 bg-white text-black hover:bg-white/88 lg:mt-0">
            {homePage.finalCta.cta.label}
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
