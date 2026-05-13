import { PageShell } from "@/components/site/page-shell";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { publicPages } from "@/data/pages";
import { getTestimonials } from "@/services/testimonialService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Học viên",
  description:
    "Feedback, case study và câu chuyện học viên của Thế Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const page = publicPages.students;
  const testimonials = await getTestimonials();

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-36 sm:px-8">
        <SectionHeading
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
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

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          <MediaPlaceholder
            label={page.mediaLabel}
            note={page.mediaNote}
          />
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Case study</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              {page.caseStudyTitle}
            </h2>
            <p className="mt-4 leading-8 text-black/65">
              {page.caseStudyDescription}
            </p>
          </SoftCard>
        </div>
      </section>
    </PageShell>
  );
}
