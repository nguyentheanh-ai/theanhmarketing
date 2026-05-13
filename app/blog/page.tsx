import { BlogList } from "@/components/content/blog-list";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { publicPages } from "@/data/pages";
import { getBlogPosts } from "@/services/blogService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Bài viết về Facebook Ads, AI Marketing, Marketing Online và kinh doanh thực chiến.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const page = publicPages.blog;
  const posts = await getBlogPosts();
  const categories = Array.from(
    new Set([page.categories[0] ?? "Tất cả", ...posts.map((post) => post.category)]),
  );

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
            <p className="text-sm font-semibold text-[#c77b20]">{page.directionTitle}</p>
            <p className="mt-4 text-lg leading-8 text-black/65">
              {page.directionDescription}
            </p>
          </SoftCard>
        </div>
      </section>
      <BlogList posts={posts} categories={categories} />
    </PageShell>
  );
}
