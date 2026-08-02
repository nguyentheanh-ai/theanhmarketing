import { ArrowRight, BrainCircuit, Building2, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { PublicSectionHeading } from "@/components/marketing/public-section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { marketingAiServices } from "@/data/services";

export const metadata: Metadata = {
  title: "Dịch vụ đào tạo Marketing và AI",
  description: "Đào tạo Marketing và AI 1 kèm 1 tại TP.HCM hoặc training doanh nghiệp Online/Offline.",
};

const icons = [MapPin, Building2, BrainCircuit];

export default function ServicesPage() {
  return (
    <PageShell>
      <section className="tam-grid-bg pb-16 pt-28 sm:pb-20 sm:pt-36">
        <div className="tam-container text-center">
          <Reveal><span className="tam-pill">Đào tạo Marketing &amp; AI</span></Reveal>
          <Reveal delay={70}>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-[-0.055em] text-[var(--tam-ink)] sm:text-6xl">
              Chọn hình thức học phù hợp với mục tiêu của bạn
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-8 text-[var(--tam-muted)] sm:text-lg">
              Học cá nhân hoặc đào tạo đội ngũ, Online hay Offline. Nội dung được điều chỉnh theo nhu cầu thực tế thay vì dùng một chương trình chung cho tất cả.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="tam-container py-20 sm:py-24">
        <PublicSectionHeading eyebrow="Dịch vụ" title="Ba lựa chọn đào tạo chuyên sâu" description="Tất cả chương trình đều tập trung vào Marketing và AI." />
        <div className="tam-stagger mt-10 grid gap-5 lg:grid-cols-3">
          {marketingAiServices.map((service, index) => {
            const Icon = icons[index];
            return (
              <Reveal key={service.id} delay={index * 70}>
                <article className="tam-card tam-lift flex h-full flex-col p-6 sm:p-8">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[var(--tam-accent-soft)] text-[var(--tam-accent-strong)]"><Icon size={24} aria-hidden="true" /></span>
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.13em] text-[var(--tam-accent-strong)]">{service.format}</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--tam-ink)]">{service.title}</h2>
                  <p className="mt-4 flex-1 text-sm font-medium leading-7 text-[var(--tam-muted)]">{service.description}</p>
                  <ButtonLink className="mt-7" href={`/dang-ky-tu-van?service=${service.id}`}>Đăng ký tư vấn <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
                </article>
              </Reveal>
            );
          })}
        </div>
        <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-[#159cfb]/20 bg-[#eef8ff] p-6 text-center text-sm font-semibold leading-7 text-[var(--tam-muted)]">
          Phí gửi yêu cầu tư vấn là <strong className="text-[var(--tam-ink)]">500.000đ</strong>. Nếu đăng ký dịch vụ sau tư vấn, khoản này được trừ vào học phí hoặc phí training; nếu không đăng ký tiếp, phí tư vấn không hoàn lại.
        </div>
      </section>
    </PageShell>
  );
}
