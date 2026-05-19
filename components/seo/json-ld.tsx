import { siteConfig } from "@/data/site";
import type { Course } from "@/data/courses";
import { getCspNonce } from "@/lib/security/nonce";

export async function OrganizationJsonLd() {
  const nonce = await getCspNonce();
  const data = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.email,
    telephone: siteConfig.phone,
    description:
      "Nền tảng đào tạo Marketing, Facebook Ads và Kinh doanh Online thực chiến.",
    sameAs: [],
  };

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export async function WebsiteJsonLd() {
  const nonce = await getCspNonce();
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "vi-VN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export async function CourseJsonLd({ course }: { course: Course }) {
  const nonce = await getCspNonce();
  const data = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    provider: {
      "@type": "EducationalOrganization",
      name: siteConfig.name,
      sameAs: siteConfig.url,
    },
    offers: {
      "@type": "Offer",
      category: "Online course",
      price: course.price.replace(/[^\d]/g, ""),
      priceCurrency: "VND",
      availability:
        course.status === "open"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      url: `${siteConfig.url}/khoa-hoc/${course.slug}`,
    },
  };

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export async function ArticleJsonLd({
  title,
  description,
  slug,
  author,
}: {
  title: string;
  description: string;
  slug: string;
  author: string;
}) {
  const nonce = await getCspNonce();
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: {
      "@type": "Organization",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    mainEntityOfPage: `${siteConfig.url}/blog/${slug}`,
    inLanguage: "vi-VN",
  };

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
