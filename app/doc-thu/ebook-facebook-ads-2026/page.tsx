import type { Metadata } from "next";
import { FacebookEbookPreviewReader } from "@/components/ebook/facebook-ebook-preview-reader";

export const metadata: Metadata = {
  title: "Đọc thử Ebook Facebook Ads 2026",
  description: "Bản đọc thử Ebook Facebook Ads 2026, mở chương 1 và chương 5 trong hệ sinh thái The Anh Marketing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FacebookEbookPreviewPage() {
  return <FacebookEbookPreviewReader />;
}
