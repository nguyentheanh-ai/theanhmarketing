import { PageShell } from "@/components/site/page-shell";
import { ContentOsDashboardMockup, EcosystemFeatureGrid } from "@/components/site/ai-os-visuals";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Performance Marketing System",
  description:
    "AI Performance Marketing System kết nối Content Engine, Ads Engine, Funnel, Automation, CRM/Data và học viên trong hệ sinh thái The Anh Marketing.",
};

const operatingLayers = [
  ["Attract layer", "AI Content Engine và Performance Ads tạo traffic có chủ đích, không chạy theo lượt xem hay ngân sách cảm tính."],
  ["Grow layer", "Lead magnet, funnel, nurture và authority biến người quan tâm thành lead có niềm tin và có ngữ cảnh mua."],
  ["Scale layer", "Automation, SOP, CRM/Data và dashboard giúp founder giảm thao tác lặp lại, chuẩn hóa team và tối ưu theo tín hiệu thật."],
];

const osMetrics = [
  ["Content", "Insight, angle, distribution"],
  ["Ads", "Traffic, lead quality, conversion"],
  ["Funnel", "Lead magnet, nurture, offer"],
  ["CRM", "Pipeline, behavior, dashboard"],
];

export default function MarketingOsPage() {
  return (
    <PageShell>
      <section className="ai-shell grid gap-10 pb-16 pt-28 sm:pt-32 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Marketing OS"
            title="AI Performance Marketing System: biến AI thành hạ tầng tăng trưởng."
            description="Trang này trình bày cấu trúc hệ thống: Content Engine, Ads Engine, Funnel Engine, Automation Engine và CRM/Data Layer kết nối với nhau để business không còn làm marketing rời rạc."
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dang-ky">Chẩn đoán hệ thống</ButtonLink>
            <ButtonLink href="/khoa-hoc" variant="secondary">Xem chương trình</ButtonLink>
          </div>
        </div>
        <ContentOsDashboardMockup compact />
      </section>

      <section className="ai-shell pb-14">
        <div className="grid gap-4 md:grid-cols-4">
          {osMetrics.map(([label, detail]) => (
            <SoftCard key={label} className="p-5">
              <p className="ai-kicker">{label}</p>
              <p className="ai-muted mt-3 text-sm leading-6">{detail}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      <section className="ai-shell pb-16">
        <div className="ai-panel-strong p-8 sm:p-10">
          <SectionHeading
            eyebrow="Operating layers"
            title="Không phải trang giới thiệu cá nhân. Đây là bản đồ vận hành tăng trưởng."
            description="Mỗi lớp trong OS có nhiệm vụ riêng: tạo nhu cầu, nuôi lead, chuyển đổi, tự động hóa, đo lường và giữ dữ liệu khách hàng trong CRM."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {operatingLayers.map(([title, description]) => (
              <article key={title} className="rounded-xl border border-white/10 bg-white/7 p-5">
                <h2 className="text-2xl font-black tracking-[-0.04em] text-white">{title}</h2>
                <p className="ai-muted mt-4 leading-7">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <EcosystemFeatureGrid />
      </section>
    </PageShell>
  );
}
