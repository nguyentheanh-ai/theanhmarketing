import type { Metadata } from "next";
import { AcademySalesPage } from "@/components/academy/academy-sales-page";
import { facebookAdsAcademyProduct } from "@/data/academy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quảng cáo Facebook Master 2026 | The Anh Academy",
  description:
    "Landing page đăng ký khóa Quảng cáo Facebook Master 2026 giá mở khóa 99K: học cách chạy Facebook Ads theo offer, content, campaign và dữ liệu.",
  alternates: {
    canonical: "/academy/facebook-ads-master-2026",
  },
  openGraph: {
    title: "Quảng cáo Facebook Master 2026",
    description:
      "Chạy Facebook Ads có hệ thống, không đốt tiền mò mẫm. Đăng ký tự động qua SePay.",
    type: "website",
    url: "/academy/facebook-ads-master-2026",
    images: [{ url: facebookAdsAcademyProduct.thumbnail }],
  },
};

export default function FacebookAdsAcademyPage() {
  return <AcademySalesPage product={facebookAdsAcademyProduct} />;
}
