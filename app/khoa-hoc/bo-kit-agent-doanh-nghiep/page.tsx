import type { Metadata } from "next";
import { AgentKitBundle } from "./agent-kit-bundle";

const landingAssetRoot = "/doi-ngu-nhan-su-ai";

export const metadata: Metadata = {
  title: "Đội ngũ nhân sự AI",
  description:
    "Đội ngũ nhân sự AI hỗ trợ điều hành, marketing, thiết kế, quảng cáo và đọc số liệu cho doanh nghiệp nhỏ.",
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
        href={`${landingAssetRoot}/assets/index-Cn7caiqW.css`}
      />
      <link rel="icon" href={`${landingAssetRoot}/brand/ta-mark.svg`} />
      <AgentKitBundle />
    </>
  );
}
