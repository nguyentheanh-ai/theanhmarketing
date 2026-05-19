import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { publicPages } from "@/data/pages";
import { getResources } from "@/services/resourceService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tài liệu",
  description:
    "Thư viện ebook, checklist, template và tài liệu Marketing thực chiến của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const page = publicPages.resources;
  const resources = await getResources();

  return (
    <PageShell>
      <section className="ai-shell pb-16 pt-32 sm:pt-40">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="ai-kicker">{page.eyebrow}</p>
            <h1 className="ai-glow-text mt-4 text-3xl font-black leading-[1.08] tracking-[-0.03em] sm:text-5xl sm:tracking-[-0.05em] lg:text-6xl">
              AI Documentation & Knowledge Hub
            </h1>
            <p className="ai-muted mt-5 text-base leading-8 sm:mt-6 sm:text-lg">{page.description}</p>
          </div>
          <div className="ai-panel-strong p-5">
            <p className="ai-kicker">Knowledge base</p>
            <div className="mt-5 grid gap-3">
              {["Prompt Library", "Checklist System", "Automation SOP"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/7 px-4 py-3">
                  <span className="font-black">{item}</span>
                  <span className="text-sm text-[#8bdcff]">Open</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="mb-8 flex items-end justify-between gap-5">
          <div>
            <p className="ai-kicker">Workflow library</p>
            <h2 className="ai-glow-text mt-3 text-4xl font-black tracking-[-0.04em]">Reusable AI workflows</h2>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource, index) => (
            <Link
              key={resource.slug}
              href={"fileUrl" in resource && resource.fileUrl ? resource.fileUrl : "/tai-lieu"}
              className="ai-panel group min-h-[240px] p-5 transition hover:border-[#77d7ff]/45"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-[#77d7ff]/20 bg-[#159cfb]/12 px-3 py-1 text-xs font-black text-[#8bdcff]">
                  {resource.type}
                </span>
                <span className="text-xs font-bold text-white/42">0{(index % 6) + 1}</span>
              </div>
              <h3 className="mt-7 text-2xl font-black leading-tight group-hover:text-[#8bdcff]">
                {resource.title}
              </h3>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/62">{resource.description}</p>
              <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-4 text-sm font-bold text-white/55">
                <span>{resource.access}</span>
                <span>Download →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
