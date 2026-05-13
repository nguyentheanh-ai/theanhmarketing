import { LeadForm } from "@/components/forms/lead-form";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { publicPages } from "@/data/pages";
import { siteConfig } from "@/data/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liên hệ",
  description:
    "Liên hệ The Anh Marketing để được tư vấn khóa học, tài liệu và lộ trình học Marketing phù hợp.",
};

export default function ContactPage() {
  const page = publicPages.contact;

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-36 sm:px-8">
        <SectionHeading
          eyebrow={page.eyebrow}
          title={page.title}
          description={page.description}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Hotline/Zalo</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              {siteConfig.phone}
            </h2>
            <p className="mt-4 leading-8 text-black/60">
              {page.phoneDescription}
            </p>
            <ButtonLink href={siteConfig.phoneHref} className="mt-6">
              Gọi tư vấn
            </ButtonLink>
          </SoftCard>
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">Email</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
              {siteConfig.email}
            </h2>
            <p className="mt-4 leading-8 text-black/60">
              {page.emailDescription}
            </p>
            <ButtonLink href={siteConfig.emailHref} variant="secondary" className="mt-6">
              Gửi email
            </ButtonLink>
          </SoftCard>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="rounded-[2rem] bg-[#f2eadf] p-8 sm:p-12">
          <p className="text-sm font-semibold text-[#c77b20]">{page.leadFormEyebrow}</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
            {page.leadFormTitle}
          </h2>
          <LeadForm source="Trang liên hệ" submitLabel="Gửi thông tin tư vấn" />
        </div>
      </section>
    </PageShell>
  );
}
