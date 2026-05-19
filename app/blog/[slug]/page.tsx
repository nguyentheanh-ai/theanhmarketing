import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleJsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/site/page-shell";
import { ArticleInsightPanel } from "@/components/site/socialtrack-chart-visuals";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import {
  getBlogPostBySlug,
  getBlogPosts,
  getBlogStaticParams,
} from "@/services/blogService";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return getBlogStaticParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const posts = await getBlogPosts();
  const relatedPosts = posts.filter((item) => item.slug !== post.slug).slice(0, 2);

  return (
    <PageShell>
      <ArticleJsonLd
        author={post.author}
        description={post.excerpt}
        slug={post.slug}
        title={post.title}
      />
      <article className="mx-auto max-w-4xl px-5 pb-20 pt-36 sm:px-8">
        <p className="text-sm font-semibold text-[#c77b20]">
          {post.category} - {post.readTime}
        </p>
        <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-7xl">
          {post.title}
        </h1>
        <p className="mt-7 text-lg leading-9 text-black/65">{post.excerpt}</p>
        <div className="mt-5 text-sm font-semibold text-black/45">
          Tác giả: {post.author}
        </div>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">Mục lục</p>
          <ol className="mt-4 grid gap-3 text-sm font-semibold text-black/65">
            <li>1. Vấn đề trong Growth System</li>
            <li>2. Khung A.G.S nên dùng</li>
            <li>3. Hành động tiếp theo</li>
          </ol>
        </SoftCard>

        <ArticleInsightPanel />

        <div
          className="blog-content mt-10"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-10 rounded-[2rem] bg-[#f2eadf] p-8">
          <SectionHeading
            eyebrow="CTA"
            title="Muốn biến nội dung này thành workflow?"
            description="Xem Facebook Ads 2026 trong AI Ads Engine hoặc mở thư viện toolkit để bắt đầu từ Growth System."
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/khoa-hoc/facebook-ads-2026">Xem AI Ads Engine</ButtonLink>
            <ButtonLink href="/blog#tai-lieu" variant="secondary">
              Xem toolkit
            </ButtonLink>
          </div>
        </div>
      </article>

      <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Liên quan" title="Bài viết liên quan" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {relatedPosts.map((item) => (
            <SoftCard key={item.slug}>
              <p className="text-sm font-semibold text-[#c77b20]">
                {item.category}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">
                {item.title}
              </h2>
            </SoftCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
