import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Suspense } from "react";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";
import { RouteProgress } from "@/components/site/route-progress";
import { siteConfig } from "@/data/site";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "The Anh Marketing | AI Performance Marketing System",
    template: "%s | The Anh Marketing",
  },
  description:
    "AI Performance Marketing System giúp SME và Solopreneur xây hệ thống tăng trưởng bằng AI Marketing, Performance Ads, Funnel, Automation và CRM/Data.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "The Anh Marketing",
    description:
      "AI Performance Marketing System cho SME và Solopreneur.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Anh Marketing",
    description:
      "AI Performance Marketing System cho SME và Solopreneur.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        {children}
      </body>
    </html>
  );
}
