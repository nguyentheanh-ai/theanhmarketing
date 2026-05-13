import { ResourceCard } from "@/components/content/resource-card";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { publicPages } from "@/data/pages";
import { getResources } from "@/services/resourceService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tài liệu",
  description:
    "Thư viện ebook, checklist, template và tài liệu Marketing thực chiến của Thế Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const page = publicPages.resources;
  const resources = await getResources();

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-36 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <SectionHeading
            eyebrow={page.eyebrow}
            title={page.title}
            description={page.description}
          />
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">{page.noteTitle}</p>
            <p className="mt-4 text-lg leading-8 text-black/65">
              {page.noteDescription}
            </p>
          </SoftCard>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard key={resource.slug} resource={resource} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
