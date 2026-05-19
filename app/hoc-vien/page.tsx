import { PageShell } from "@/components/site/page-shell";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { publicPages } from "@/data/pages";
import { getTestimonials } from "@/services/testimonialService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Học viên",
  description:
    "Feedback, case study và câu chuyện học viên của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const page = publicPages.students;
  const testimonials = await getTestimonials();
  const first = testimonials[0];

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-32 sm:pt-40">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <p className="ai-kicker">{page.eyebrow}</p>
            <h1 className="ai-glow-text mt-5 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
              Feedback và case study của học viên.
            </h1>
            <p className="ai-muted mt-6 max-w-3xl text-lg leading-8">{page.description}</p>
          </div>
          {first ? (
            <div className="ai-panel-strong max-w-md p-7">
              <p className="text-lg leading-8 text-white/72">&ldquo;{first.quote}&rdquo;</p>
              <p className="mt-7 font-black">{first.name}</p>
              <p className="mt-1 text-sm text-white/45">{first.title}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="grid gap-5 md:grid-cols-2">
          <MediaPlaceholder label={page.mediaLabel} note={page.mediaNote} />
          <div className="ai-panel-strong p-8">
            <p className="ai-kicker">Case study</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
              {page.caseStudyTitle}
            </h2>
            <p className="ai-muted mt-5 leading-8">{page.caseStudyDescription}</p>
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="ai-panel p-6">
              <p className="text-base leading-7 text-white/70">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-6 font-black">{item.name}</p>
              <p className="mt-1 text-sm text-white/45">{item.title}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
