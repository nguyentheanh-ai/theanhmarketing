import type { Metadata } from "next";
import { ConsultationRequestForm } from "@/components/consultation/consultation-request-form";
import { PageShell } from "@/components/site/page-shell";

export const metadata: Metadata = { title: "Đăng ký tư vấn Marketing và AI", robots: { index: false, follow: false } };

export default async function ConsultationPage({ searchParams }: { searchParams?: Promise<{ service?: string }> }) {
  const params = await searchParams;
  return (
    <PageShell>
      <section className="tam-container grid gap-10 pb-20 pt-32 sm:pt-40 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="tam-pill w-fit">Tư vấn Marketing &amp; AI</p>
          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] text-[var(--tam-ink)] sm:text-6xl">Gửi nhu cầu, The Anh sẽ chủ động liên hệ</h1>
          <p className="mt-5 text-base font-medium leading-8 text-[var(--tam-muted)]">Bạn không cần chọn lịch ngay. Sau khi thanh toán phí tư vấn, The Anh sẽ xem nhu cầu và liên hệ để sắp xếp thời gian phù hợp.</p>
        </div>
        <ConsultationRequestForm initialService={params?.service || ""} />
      </section>
    </PageShell>
  );
}
