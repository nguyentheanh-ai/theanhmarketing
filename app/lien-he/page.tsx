import { LeadForm } from "@/components/forms/lead-form";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { siteConfig } from "@/data/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chẩn đoán Growth System",
  description:
    "Liên hệ The Anh Marketing để được tư vấn toolkit, khóa học, workshop hoặc triển khai AI Growth System.",
};

export default function ContactPage() {
  return (
    <PageShell>
      <section className="ai-shell pb-16 pt-28 sm:pt-32">
        <SectionHeading
          eyebrow="Liên hệ"
          title="Nhận chẩn đoán Growth System phù hợp"
          description="Gửi thông tin hoặc nhắn Zalo để được tư vấn bạn nên bắt đầu bằng toolkit, workshop, khóa Facebook Ads 2026 hay triển khai hệ thống đầy đủ."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <SoftCard>
            <p className="ai-kicker">Hotline/Zalo</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              {siteConfig.phone}
            </h2>
            <p className="ai-muted mt-4 leading-8">
              Phù hợp khi bạn cần tư vấn nhanh về khóa học, tài khoản, thanh toán hoặc điểm nghẽn trong hệ thống hiện tại.
            </p>
            <ButtonLink href={siteConfig.phoneHref} className="mt-6">Gọi chẩn đoán</ButtonLink>
          </SoftCard>
          <SoftCard>
            <p className="ai-kicker">Email</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              {siteConfig.email}
            </h2>
            <p className="ai-muted mt-4 leading-8">
              Phù hợp cho hợp tác, câu hỏi chi tiết, toolkit, training hoặc triển khai AI Growth System.
            </p>
            <ButtonLink href={siteConfig.emailHref} variant="secondary" className="mt-6">Gửi email</ButtonLink>
          </SoftCard>
          <SoftCard>
            <p className="ai-kicker">Dashboard</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              Growth Hub & Admin
            </h2>
            <p className="ai-muted mt-4 leading-8">
              Học viên vào dashboard để học tiếp. Admin vào CRM để xử lý lead, đơn hàng, quyền học và dữ liệu vận hành.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/dashboard" variant="secondary">Học viên</ButtonLink>
              <ButtonLink href="/admin/dashboard" variant="secondary">Admin</ButtonLink>
            </div>
          </SoftCard>
        </div>
      </section>

      <section className="ai-shell pb-20">
        <div className="ai-panel-strong p-8 sm:p-12">
          <p className="ai-kicker">Form chẩn đoán</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            Để lại tình trạng hiện tại, hệ thống sẽ đưa vào CRM.
          </h2>
          <LeadForm source="Trang liên hệ" submitLabel="Gửi nhu cầu chẩn đoán" />
        </div>
      </section>
    </PageShell>
  );
}
