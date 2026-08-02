import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";
import { getResources } from "@/services/resourceService";

export const metadata: Metadata = { title: "Tài liệu Marketing và AI" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const resources = await getResources();
  return (
    <PageShell>
      <section className="tam-container pb-20 pt-32 sm:pt-40">
        <p className="tam-pill w-fit">Tài liệu thực hành</p>
        <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.05em] text-[var(--tam-ink)] sm:text-6xl">Tài liệu Marketing và AI</h1>
        <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[var(--tam-muted)]">Checklist, template và hướng dẫn ngắn để bạn áp dụng vào công việc.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const fileUrl = "fileUrl" in resource ? resource.fileUrl : "";
            return (
            <article className="tam-card tam-lift p-6" key={resource.slug}>
              <FileText className="text-[var(--tam-accent-strong)]" aria-hidden="true" />
              <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-[var(--tam-accent-strong)]">{resource.type} · {resource.access}</p>
              <h2 className="mt-3 text-xl font-black text-[var(--tam-ink)]">{resource.title}</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-[var(--tam-muted)]">{resource.description}</p>
              {fileUrl ? <a className="mt-5 inline-flex font-black text-[var(--tam-accent-strong)]" href={fileUrl}>Mở tài liệu →</a> : null}
            </article>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
