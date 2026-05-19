import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Về The Anh",
  description:
    "The Anh Marketing xây hệ sinh thái học marketing thực chiến, AI workflow, tài liệu và CRM học viên.",
};

const principles = [
  ["Học theo hệ thống", "Từ nền tảng marketing, hành vi khách hàng, offer đến quảng cáo và đo lường."],
  ["Có tài liệu để triển khai", "Prompt, checklist, template và SOP giúp người học áp dụng lại sau mỗi bài."],
  ["Gắn với vận hành thật", "Khóa học, học viên, đơn hàng và admin CRM được nối với nhau để quản lý lâu dài."],
];

export default function AboutPage() {
  return (
    <PageShell>
      <section className="ai-shell grid gap-10 pb-20 pt-28 sm:pt-32 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Về The Anh"
            title="The Anh Marketing là hệ sinh thái học và triển khai AI Marketing."
            description="Website này không chỉ là landing page. Đây là nền cho khóa học, thư viện tài liệu, workshop, cộng đồng học viên, checkout, dashboard học viên và admin CRM."
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/he-sinh-thai">Xem hệ sinh thái</ButtonLink>
            <ButtonLink href="/khoa-hoc" variant="secondary">Xem khóa học</ButtonLink>
          </div>
        </div>
        <div className="content-os-frame compact">
          <aside className="content-os-sidebar">
            <strong>The Anh OS</strong>
            {["Courses", "Docs", "Students", "Admin"].map((item, index) => (
              <span key={item} className={index === 0 ? "active" : ""}>{item}</span>
            ))}
          </aside>
          <main className="content-os-main">
            <div className="content-os-titlebar">
              <div>
                <span>Main Stage</span>
                <h3>Learning Journey & Marketing Operations</h3>
              </div>
            </div>
            <section className="content-os-canvas">
              {["Marketing Foundation", "AI Workflow", "Course Access", "CRM Follow-up"].map((item, index) => (
                <div key={item} className={`content-node node-${index + 1}`}>
                  <i>{index + 1}</i>
                  <strong>{item}</strong>
                </div>
              ))}
            </section>
          </main>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {principles.map(([title, description]) => (
            <SoftCard key={title}>
              <h2 className="text-2xl font-black tracking-[-0.04em]">{title}</h2>
              <p className="ai-muted mt-4 leading-8">{description}</p>
            </SoftCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
