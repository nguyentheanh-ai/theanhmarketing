import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <PageShell>
      <section className="ai-shell grid min-h-screen place-items-center pb-20 pt-40">
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="ai-orb mx-auto size-16" />
          <p className="ai-kicker mt-8">404 system page</p>
          <h1 className="ai-glow-text mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Signal lost in the operating system.
          </h1>
          <p className="ai-muted mx-auto mt-6 max-w-2xl text-lg leading-8">
            Đường dẫn này chưa tồn tại hoặc nội dung đang được xây dựng trong AI Growth System của The Anh Marketing.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/">Về trang chủ</ButtonLink>
            <ButtonLink href="/khoa-hoc" variant="secondary">
              Xem khóa học
            </ButtonLink>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
