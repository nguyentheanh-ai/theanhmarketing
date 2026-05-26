import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

const blogCtas: Record<
  string,
  {
    title: string;
    description: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref: string;
    secondaryLabel: string;
  }
> = {
  "software-3-0-context-prompt-ai-agent": {
    title: "Muốn biến prompt, context và agent thành workflow thật?",
    description:
      "Bắt đầu từ cách thiết kế AI Agent có vai trò, dữ liệu, tiêu chuẩn kiểm tra và đầu ra dùng được trong công việc.",
    primaryHref: "/khoa-hoc/ai-agent-master-2026",
    primaryLabel: "Xem AI Agent Master",
    secondaryHref: "/khoa-hoc/ai-master-x10-hieu-suat",
    secondaryLabel: "Xem AI Master X10",
  },
  "quan-ly-ai-agent-nhu-nhan-su-so": {
    title: "Muốn tạo AI Agent cá nhân để giao việc mỗi ngày?",
    description:
      "Học cách biến AI từ một cửa sổ chat thành trợ lý có nhiệm vụ, checklist và tiêu chuẩn duyệt rõ ràng.",
    primaryHref: "/khoa-hoc/tao-ai-agent-ca-nhan-x10-hieu-suat",
    primaryLabel: "Tạo AI Agent cá nhân",
    secondaryHref: "/khoa-hoc/ai-marketing-x5-hieu-suat-cong-viec",
    secondaryLabel: "Xem AI Marketing x5",
  },
  "agentic-era-chon-ai-model-app-harness": {
    title: "Muốn xây hệ làm việc AI thay vì chỉ đổi tool?",
    description:
      "AI Master X10 giúp các bạn nối model, app, prompt, tài liệu và workflow thành một hệ điều hành công việc.",
    primaryHref: "/khoa-hoc/ai-master-x10-hieu-suat",
    primaryLabel: "Xem AI Master X10",
    secondaryHref: "/blog#tai-lieu",
    secondaryLabel: "Xem toolkit",
  },
  "multi-agent-research-thi-truong-content": {
    title: "Muốn dùng AI để research thị trường và tạo content có chiến lược?",
    description:
      "Bắt đầu từ workflow nghiên cứu insight, phản biện offer và biến dữ liệu khách hàng thành content bán hàng.",
    primaryHref: "/khoa-hoc/ai-marketing-x5-hieu-suat-cong-viec",
    primaryLabel: "Xem AI Marketing x5",
    secondaryHref: "/khoa-hoc/bien-tri-thuc-thanh-tien",
    secondaryLabel: "Biến tri thức thành tiền",
  },
  "ai-agent-lam-viec-that-nguoi-ban-tri-thuc": {
    title: "Muốn đóng gói chuyên môn thành sản phẩm có thể bán?",
    description:
      "Học cách chọn vấn đề, đóng gói offer, viết landing page và xây phễu bán sản phẩm tri thức bằng AI.",
    primaryHref: "/khoa-hoc/bien-tri-thuc-thanh-tien",
    primaryLabel: "Biến tri thức thành tiền",
    secondaryHref: "/khoa-hoc/marketing-gioi-phai-kiem-duoc-tien",
    secondaryLabel: "Xem flagship program",
  },
  "agent-native-business-tai-lieu-cho-ai-doc": {
    title: "Muốn hệ thống tài liệu, website và SOP dễ nhân bản bằng AI?",
    description:
      "Chuẩn hóa tài sản tri thức thành workflow, checklist và agent kit để người và AI cùng sử dụng được.",
    primaryHref: "/khoa-hoc/ai-master-x10-hieu-suat",
    primaryLabel: "Xem AI Master X10",
    secondaryHref: "/khoa-hoc/bo-agent-kit-x10-hieu-suat-cong-viec",
    secondaryLabel: "Xem Bộ Agent Kit",
  },
  "jagged-intelligence-dung-ai-khong-ao-tuong": {
    title: "Muốn dùng AI nhanh hơn nhưng vẫn kiểm soát chất lượng?",
    description:
      "Học cách tạo workflow AI có tiêu chuẩn duyệt, dữ liệu đầu vào và vòng phản hồi để tránh output đẹp nhưng sai.",
    primaryHref: "/khoa-hoc/ai-marketing-x5-hieu-suat-cong-viec",
    primaryLabel: "Xem AI Marketing x5",
    secondaryHref: "/khoa-hoc/ai-agent-master-2026",
    secondaryLabel: "Xem AI Agent Master",
  },
  "bao-mat-ai-agent-marketing-du-lieu-khach-hang": {
    title: "Muốn triển khai AI Agent có guardrail cho marketing?",
    description:
      "Xây agent đúng vai trò, đúng quyền, đúng dữ liệu và có điểm duyệt tay trước khi chạm tới khách hàng.",
    primaryHref: "/khoa-hoc/ai-agent-master-2026",
    primaryLabel: "Xem AI Agent Master",
    secondaryHref: "/khoa-hoc/marketing-gioi-phai-kiem-duoc-tien",
    secondaryLabel: "Xem Growth System",
  },
};

function getBlogCta(slug: string, category: string) {
  if (blogCtas[slug]) {
    return blogCtas[slug];
  }

  if (category === "AI Growth System") {
    return {
      title: "Muốn biến nội dung này thành workflow tăng trưởng?",
      description:
        "Xem toolkit hoặc chương trình Growth System để nối content, ads, funnel, automation và CRM/Data.",
      primaryHref: "/khoa-hoc/marketing-gioi-phai-kiem-duoc-tien",
      primaryLabel: "Xem Growth System",
      secondaryHref: "/blog#tai-lieu",
      secondaryLabel: "Xem toolkit",
    };
  }

  return {
    title: "Muốn biến nội dung này thành workflow?",
    description:
      "Mở thư viện toolkit hoặc chọn khóa học phù hợp để bắt đầu triển khai AI Growth System theo từng bước.",
    primaryHref: "/blog#tai-lieu",
    primaryLabel: "Xem toolkit",
    secondaryHref: "/khoa-hoc",
    secondaryLabel: "Xem khóa học",
  };
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "").trim();
}

function toHeadingId(value: string, index: number) {
  const slug = stripTags(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || `section-${index + 1}`;
}

function prepareArticleContent(content: string) {
  const headings: { id: string; text: string; level: number }[] = [];
  const html = content.replace(/<h([23])>(.*?)<\/h\1>/g, (match, level, text) => {
    const id = toHeadingId(text, headings.length);
    headings.push({ id, text: stripTags(text), level: Number(level) });
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  return { headings, html };
}

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
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `/blog/${post.slug}`,
      images: post.thumbnail ? [{ url: post.thumbnail }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.thumbnail ? [post.thumbnail] : undefined,
    },
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
  const cta = getBlogCta(post.slug, post.category);
  const article = prepareArticleContent(post.content);
  const publishedAt = post.publishedAt || post.createdAt;

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
        <p className="mt-7 text-lg leading-9 text-white/70">{post.excerpt}</p>
        <div className="mt-5 text-sm font-semibold text-white/45">
          Tác giả: {post.author}
          {publishedAt ? ` - ${publishedAt}` : ""}
        </div>

        {post.thumbnail ? (
          <div className="relative mt-10 aspect-video overflow-hidden rounded-[2rem] bg-black shadow-2xl">
            <Image
              src={post.thumbnail}
              alt={`Thumbnail ${post.title}`}
              fill
              priority
              sizes="(min-width: 1024px) 896px, 92vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null}

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">Mục lục</p>
          <ol className="mt-4 grid gap-3 text-sm font-semibold text-white/70">
            {article.headings.length > 0 ? article.headings.map((heading) => (
              <li key={heading.id} className={heading.level === 3 ? "pl-4 text-white/50" : ""}>
                <a href={`#${heading.id}`}>{heading.text}</a>
              </li>
            )) : (
              <>
                <li>1. Bài gốc nói gì</li>
                <li>2. Dịch sang ngôn ngữ kinh doanh</li>
                <li>3. Ứng dụng vào AI Growth System</li>
                <li>4. Checklist hoặc workflow áp dụng</li>
              </>
            )}
          </ol>
        </SoftCard>

        <ArticleInsightPanel />

        <div
          className="blog-content mt-10"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        <div className="mt-10 rounded-[2rem] border border-[#77d7ff]/25 bg-[#10233a] p-8 text-white shadow-2xl shadow-[#1aa8ff]/10">
          <p className="ai-kicker">Khóa học liên quan</p>
          <h2 className="mt-4 text-3xl font-black leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
            {cta.title}
          </h2>
          <p className="mt-5 text-base font-semibold leading-8 text-white/72 sm:text-lg">
            {cta.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={cta.primaryHref}>{cta.primaryLabel}</ButtonLink>
            <ButtonLink href={cta.secondaryHref} variant="secondary">
              {cta.secondaryLabel}
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
              <Link href={`/blog/${item.slug}`} className="mt-3 block text-2xl font-black tracking-[-0.04em] hover:text-[#c77b20]">
                {item.title}
              </Link>
            </SoftCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
