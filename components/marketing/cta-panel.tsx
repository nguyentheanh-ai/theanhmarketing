import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export function CtaPanel() {
  return (
    <div className="tam-container">
      <div className="tam-grid-bg overflow-hidden rounded-[1.75rem] border border-[#159cfb]/12 bg-[#f1f8fd] px-6 py-14 text-center sm:px-12 sm:py-20">
        <p className="tam-eyebrow">Bắt đầu đúng điểm</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-[-0.05em] text-[var(--tam-ink)] sm:text-5xl">Sẵn sàng biến các hoạt động rời rạc thành Growth System?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--tam-muted)]">Chọn chương trình phù hợp với vấn đề hiện tại, hoặc bắt đầu bằng nội dung và toolkit của The Anh Marketing.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/khoa-hoc">Xem chương trình <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
          <ButtonLink href="/lien-he" variant="secondary">Nhận tư vấn lộ trình</ButtonLink>
        </div>
      </div>
    </div>
  );
}
