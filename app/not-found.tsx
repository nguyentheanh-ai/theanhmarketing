import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <PageShell>
      <section className="flex min-h-screen items-center justify-center px-5 pb-20 pt-40 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-[#c77b20]">404</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Trang này chưa tồn tại.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-black/65">
            Có thể đường dẫn đã thay đổi hoặc nội dung đang được xây dựng trong
            platform Thế Anh Marketing.
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
