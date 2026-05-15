import type { Metadata } from "next";
import { SkillLanding } from "@/components/skill/skill-landing";

export const metadata: Metadata = {
  title: "Kỹ năng Marketing AI",
  description:
    "Landing page benchmark 4 phiên bản kỹ năng marketing, AI workflow và hệ đo lường hiệu quả.",
  alternates: {
    canonical: "/ky-nang",
  },
};

export default function KyNangPage() {
  return <SkillLanding />;
}
