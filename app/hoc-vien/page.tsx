import { StudentHubInteractive } from "@/components/site/student-hub-interactive";
import { PageShell } from "@/components/site/page-shell";
import { getTestimonials } from "@/services/testimonialService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Operator Hub",
  description:
    "Khu học viên để học, lưu toolkit, theo dõi tiến độ, mở workflow và nhận hỗ trợ trong AI Growth System của The Anh Marketing.",
};

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const testimonials = await getTestimonials();

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <StudentHubInteractive testimonials={testimonials} />
      </section>
    </PageShell>
  );
}
