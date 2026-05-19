import { BlogList } from "@/components/content/blog-list";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { publicPages } from "@/data/pages";
import { getBlogPosts } from "@/services/blogService";
import { getResources } from "@/services/resourceService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Bài viết về Facebook Ads, AI Marketing, Marketing Online và kinh doanh thực chiến.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const page = publicPages.blog;
  const [posts, resources] = await Promise.all([getBlogPosts(), getResources()]);
  const categories = Array.from(
    new Set([page.categories[0] ?? "Tất cả", ...posts.map((post) => post.category)]),
  );

  return (
    <PageShell>
      <section className="ai-shell pb-16 pt-32 sm:pt-40">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <SectionHeading
            eyebrow={page.eyebrow}
            title={page.title}
            description={page.description}
          />
          <SoftCard>
            <p className="ai-kicker">{page.directionTitle}</p>
            <p className="ai-muted mt-4 text-lg leading-8">
              {page.directionDescription}
            </p>
          </SoftCard>
        </div>
      </section>
      <BlogList posts={posts} categories={categories} />

      <section id="tai-lieu" className="ai-shell scroll-mt-28 pb-20">
        <div className="workflow-library-head">
          <p className="ai-kicker">Tài liệu & Workflow</p>
          <h2>Prompt, checklist và tài nguyên triển khai</h2>
          <div>
            {["Prompt", "Checklist", "Template", "SOP"].map((item, index) => (
              <span key={item} className={index === 0 ? "active" : ""}>{item}</span>
            ))}
          </div>
        </div>

        <p className="workflow-section-label">Resource Library</p>
        <div className="workflow-resource-grid">
          {resources.map((resource, index) => {
            const resourceHref =
              "fileUrl" in resource && typeof resource.fileUrl === "string" && resource.fileUrl
                ? resource.fileUrl
                : `/blog#${resource.slug}`;

            return (
            <a
              key={resource.slug}
              href={resourceHref}
              className="workflow-resource-card"
            >
              <div className="workflow-card-top">
                <span>{resource.type}</span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </div>
              <h3>{resource.title}</h3>
              <div className="workflow-mini-diagram" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <p>{resource.description}</p>
              <div className="workflow-stack-row">
                {["Prompt", "Checklist", "AI Workflow"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="workflow-card-score">
                <span>{resource.access}</span>
                <strong>{[98, 95, 92, 90][index % 4]}/100</strong>
              </div>
            </a>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
