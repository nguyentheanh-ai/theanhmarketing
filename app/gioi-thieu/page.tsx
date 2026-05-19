import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import { publicPages } from "@/data/pages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description:
    "Tìm hiểu về The Anh Marketing, triết lý đào tạo và định hướng học Marketing thực chiến.",
};

export default function AboutPage() {
  const page = publicPages.about;

  return (
    <PageShell>
      <section className="ai-shell grid gap-10 pb-20 pt-32 sm:pt-40 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow={page.eyebrow}
            title={page.title}
            description={page.description}
          />
          <ButtonLink href="/khoa-hoc" className="mt-8">
            Xem khóa học
          </ButtonLink>
        </div>
        <MediaPlaceholder
          label={page.mediaLabel}
          note={page.mediaNote}
        />
      </section>

      <section className="ai-shell py-20">
        <SectionHeading eyebrow={page.principlesEyebrow} title={page.principlesTitle} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {page.principles.map((item) => (
            <SoftCard key={item}>
              <h2 className="text-2xl font-black tracking-[-0.04em]">{item}</h2>
              <p className="ai-muted mt-4 leading-8">
                Nội dung được tổ chức để người học hiểu việc cần làm, thực hành
                theo thứ tự và có tài liệu quay lại tra cứu.
              </p>
            </SoftCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
