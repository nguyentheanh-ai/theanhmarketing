import type { Metadata } from "next";
import { AgentKitBundle } from "./agent-kit-bundle";

const landingAssetRoot = "/doi-ngu-nhan-su-ai";
const landingUrl = "https://www.theanhmarketing.com/academy/bo-kit-agent-doanh-nghiep";
const landingDescription = "Bộ 8 Nhân viên AI dành cho doanh nghiệp: tự đào tạo theo dữ liệu riêng, SOP vận hành quảng cáo chuyên nghiệp và cọc preorder 399.000đ để giữ tổng giá 799.000đ.";

export const metadata: Metadata = {
  title: "Đội ngũ nhân sự AI dành cho doanh nghiệp",
  description: landingDescription,
  alternates: { canonical: landingUrl },
  openGraph: {
    title: "Đội ngũ nhân sự AI dành cho doanh nghiệp",
    description: landingDescription,
    url: landingUrl,
    siteName: "The Anh Marketing",
    locale: "vi_VN",
    type: "website",
    images: [{ url: `${landingAssetRoot}/og-image.jpg`, width: 1200, height: 630, alt: "Đội ngũ nhân sự AI dành cho doanh nghiệp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Đội ngũ nhân sự AI dành cho doanh nghiệp",
    description: landingDescription,
    images: [`${landingAssetRoot}/og-image.jpg`],
  },
  icons: {
    icon: `${landingAssetRoot}/brand/ta-mark.svg`,
    shortcut: `${landingAssetRoot}/brand/ta-mark.svg`,
    apple: `${landingAssetRoot}/brand/ta-mark.svg`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentKitLandingPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href={`${landingAssetRoot}/assets/index-ekBwkhKb.css`}
      />
      <link rel="icon" href={`${landingAssetRoot}/brand/ta-mark.svg`} />
      <AgentKitBundle />
    </>
  );
}
