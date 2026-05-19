import { PageShell } from "@/components/site/page-shell";
import { ContentOsDashboardMockup, EcosystemFeatureGrid } from "@/components/site/ai-os-visuals";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing OS",
  description:
    "Marketing OS kết nối khóa học, tài liệu, workflow, dashboard học viên và admin CRM trong hệ sinh thái The Anh Marketing.",
};

const operatingLayers = [
  ["Learning layer", "Khóa học được chia theo module, bài học, tài liệu và quyền truy cập để học viên biết nên học gì tiếp theo."],
  ["Workflow layer", "Prompt, checklist, template và SOP giúp biến kiến thức thành quy trình có thể áp dụng lại."],
  ["CRM layer", "Lead, đơn hàng, học viên và quyền học được gom về admin để vận hành như một hệ thống thật."],
];

const osMetrics = [
  ["Course", "Module, lesson, access"],
  ["Docs", "Prompt, checklist, SOP"],
  ["Student", "Progress, support, upgrade"],
  ["Admin", "Lead, order, CRM"],
];

export default function MarketingOsPage() {
  return (
    <PageShell>
      <section className="ai-shell grid gap-10 pb-16 pt-28 sm:pt-32 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Marketing OS"
            title="Một hệ điều hành để học, triển khai và vận hành Marketing."
            description="Trang này tập trung vào cấu trúc Marketing OS: khóa học, tài liệu, workflow, dashboard học viên và admin CRM kết nối với nhau để người học không bị rời rạc."
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dang-ky">Khám phá hệ sinh thái</ButtonLink>
            <ButtonLink href="/khoa-hoc" variant="secondary">Xem khóa học</ButtonLink>
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
            title="Không phải trang giới thiệu. Đây là bản đồ vận hành."
            description="Mỗi lớp trong OS có nhiệm vụ riêng: học kiến thức, lấy tài liệu, áp dụng workflow, theo dõi tiến độ và chăm sóc học viên qua CRM."
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
