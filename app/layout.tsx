import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";
import { MarketingScripts } from "@/components/site/marketing-scripts";
import { RouteProgress } from "@/components/site/route-progress";
import { siteConfig } from "@/data/site";
import { getAbsoluteSocialImage, getMarketingSettings } from "@/services/marketingSettingsService";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const marketing = await getMarketingSettings();
  const socialImage = getAbsoluteSocialImage(marketing.socialImageUrl);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: marketing.seoTitle,
      template: "%s | The Anh Marketing",
    },
    description: marketing.seoDescription,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: marketing.seoTitle,
      description: marketing.seoDescription,
      url: siteConfig.url,
      siteName: siteConfig.name,
      locale: "vi_VN",
      type: "website",
      images: socialImage ? [{ url: socialImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: marketing.seoTitle,
      description: marketing.seoDescription,
      images: socialImage ? [socialImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
    verification: {
      google: marketing.googleSiteVerification || undefined,
    },
    other: {
      ...(marketing.facebookDomainVerification
        ? { "facebook-domain-verification": marketing.facebookDomainVerification }
        : {}),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const marketingPromise = getMarketingSettings();

  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Suspense fallback={null}>
          <MarketingScriptsFromPromise settingsPromise={marketingPromise} />
        </Suspense>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        {children}
      </body>
    </html>
  );
}

async function MarketingScriptsFromPromise({
  settingsPromise,
}: {
  settingsPromise: ReturnType<typeof getMarketingSettings>;
}) {
  const marketing = await settingsPromise;

  return <MarketingScripts settings={marketing} />;
}
