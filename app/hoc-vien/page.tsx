import { PageShell } from "@/components/site/page-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { getTestimonials } from "@/services/testimonialService";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Học viên",
  description:
    "Khu học viên để học, lưu tài liệu, theo dõi tiến độ và nhận hỗ trợ trong hệ sinh thái The Anh Marketing.",
};

export const dynamic = "force-dynamic";

const communities = ["Người mới", "Chủ shop", "Marketer", "Founder"];

export default async function StudentsPage() {
  const testimonials = await getTestimonials();

  return (
    <PageShell>
      <section className="ai-shell pb-20 pt-28 sm:pt-32">
        <div className="community-hub">
          <aside>
            <strong>The Anh Marketing</strong>
            <p>Nhóm học viên</p>
            {communities.map((item, index) => (
              <span key={item} className={index === 1 ? "active" : ""}>{item}</span>
            ))}
            <ButtonLink href="/dang-nhap" className="mt-auto">Đăng nhập học viên</ButtonLink>
          </aside>

          <main>
            <header>
              <h1>Khu học viên để học, lưu tài liệu và theo dõi tiến độ</h1>
              <div>Tìm khóa học, tài liệu, hỗ trợ...</div>
            </header>

            <div className="community-grid">
              <section className="community-pulse">
                <p className="ai-kicker">Feedback</p>
                <h2>Học viên đang áp dụng điều gì?</h2>
                <div className="mt-6 grid gap-5">
                  {testimonials.slice(0, 4).map((item, index) => (
                    <article key={`${item.name}-${index}`}>
                      <i>{item.name.slice(0, 1)}</i>
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.quote}</p>
                        <span>{item.title}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="community-map">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="ai-kicker">Dashboard học viên</p>
                    <h2>Học, lưu tài liệu, nhận hỗ trợ</h2>
                  </div>
                  <div className="flex gap-2">
                    {["Khóa học", "Tài liệu", "Tiến độ"].map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
                <div className="map-orbits">
                  {["Đăng nhập", "Vào học", "Tải tài liệu", "Hỏi đáp", "Nâng cấp", "Theo dõi"].map((city, index) => (
                    <i key={city} className={`city-${index}`}>{city}</i>
                  ))}
                </div>
              </section>

              <section className="community-events">
                <h2>Lối đi nhanh cho học viên</h2>
                {[
                  ["Vào dashboard học viên", "/dashboard"],
                  ["Xem danh sách khóa học", "/khoa-hoc"],
                ].map(([event, href]) => (
                  <div key={event}>
                    <span>{event}</span>
                    <ButtonLink href={href} variant="secondary">Mở</ButtonLink>
                  </div>
                ))}
              </section>
            </div>
          </main>
        </div>
      </section>
    </PageShell>
  );
}
