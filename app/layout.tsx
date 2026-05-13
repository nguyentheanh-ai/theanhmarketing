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
    default: "Thế Anh Marketing | Nền tảng học Marketing thực chiến",
    template: "%s | Thế Anh Marketing",
  },
  description:
    "Nền tảng đào tạo Marketing, Facebook Ads và Kinh doanh Online thực chiến cho người mới, chủ shop và marketer.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Thế Anh Marketing",
    description:
      "Nền tảng học Marketing, Facebook Ads và Kinh doanh Online thực chiến.",
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thế Anh Marketing",
    description:
      "Nền tảng học Marketing, Facebook Ads và Kinh doanh Online thực chiến.",
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
