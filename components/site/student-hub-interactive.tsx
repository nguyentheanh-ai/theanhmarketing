"use client";

import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import type { TestimonialItem } from "@/services/testimonialService";

type StudentHubInteractiveProps = {
  testimonials: TestimonialItem[];
};

const segments = [
  {
    id: "newbie",
    label: "Người mới",
    title: "Bắt đầu từ lộ trình rõ ràng",
    description: "Xem khóa nên học trước, mở bài đầu tiên và lưu tài liệu nền tảng để không bị rối khi mới bắt đầu.",
    actions: ["Mở bài học đầu", "Lưu checklist nền tảng", "Hỏi lộ trình học"],
  },
  {
    id: "shop",
    label: "Chủ shop",
    title: "Tập trung vào quảng cáo, content và đơn hàng",
    description: "Ưu tiên các bài học Facebook Ads, content bán hàng, đo chỉ số và tài liệu triển khai nhanh cho sản phẩm thật.",
    actions: ["Xem Facebook Ads 2026", "Tải checklist quảng cáo", "Theo dõi tiến độ"],
  },
  {
    id: "marketer",
    label: "Marketer",
    title: "Biến kiến thức thành workflow cho team",
    description: "Dùng tài liệu, SOP và prompt để chuẩn hóa cách làm content, ads, báo cáo và tối ưu theo tuần.",
    actions: ["Lưu workflow AI", "Mở tài liệu SOP", "Nâng cấp khóa học"],
  },
  {
    id: "founder",
    label: "Founder",
    title: "Nhìn Marketing như một hệ thống vận hành",
    description: "Theo dõi khóa học, tài liệu và hỗ trợ để biết phần nào đang thiếu trong hệ thống tăng trưởng của doanh nghiệp.",
    actions: ["Xem hệ sinh thái", "Đặt lịch tư vấn", "Mở dashboard"],
  },
];

const quickLinks = [
  { label: "Dashboard học viên", href: "/dashboard", tags: "dashboard học khóa tiến độ" },
  { label: "Khóa Facebook Ads 2026", href: "/khoa-hoc/facebook-ads-2026", tags: "facebook ads quảng cáo khóa học" },
  { label: "Tài liệu & Workflow", href: "/blog#tai-lieu", tags: "tài liệu workflow checklist prompt sop" },
  { label: "Hỗ trợ học viên", href: "/lien-he", tags: "hỗ trợ zalo email liên hệ" },
];

export function StudentHubInteractive({ testimonials }: StudentHubInteractiveProps) {
  const [activeSegmentId, setActiveSegmentId] = useState(segments[1].id);
  const [query, setQuery] = useState("");
  const activeSegment = segments.find((segment) => segment.id === activeSegmentId) ?? segments[0];

  const filteredLinks = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return quickLinks;
    }

    return quickLinks.filter((item) =>
      `${item.label} ${item.tags}`.toLowerCase().includes(keyword),
    );
  }, [query]);

  return (
    <div className="community-hub">
      <aside>
        <strong>Student OS</strong>
        <p>Chọn nhóm học viên</p>
        {segments.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === activeSegment.id ? "active" : ""}
            onClick={() => setActiveSegmentId(item.id)}
          >
            {item.label}
          </button>
        ))}
        <ButtonLink href="/dang-nhap" className="mt-auto">Đăng nhập học viên</ButtonLink>
      </aside>

      <main>
        <header>
          <h1>Khu học viên để học, lưu tài liệu và theo dõi tiến độ</h1>
          <label>
            <span className="sr-only">Tìm hành động học viên</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm khóa học, tài liệu, hỗ trợ..."
            />
          </label>
        </header>

        <div className="community-grid">
          <section className="community-pulse">
            <p className="ai-kicker">{activeSegment.label}</p>
            <h2>{activeSegment.title}</h2>
            <p className="ai-muted mt-3 leading-7">{activeSegment.description}</p>
            <div className="mt-6 grid gap-3">
              {activeSegment.actions.map((action, index) => (
                <article key={action}>
                  <i>{index + 1}</i>
                  <div>
                    <strong>{action}</strong>
                    <p>{index === 0 ? "Hành động ưu tiên cho nhóm hiện tại." : "Có thể mở từ dashboard hoặc thư viện tài liệu."}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="community-map">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="ai-kicker">Hành động nhanh</p>
                <h2>{filteredLinks.length} mục phù hợp</h2>
              </div>
              <div className="flex gap-2">
                {["Khóa học", "Tài liệu", "Hỗ trợ"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div className="student-action-grid">
              {filteredLinks.map((item) => (
                <a key={item.href} href={item.href}>
                  <strong>{item.label}</strong>
                  <span>Mở ngay</span>
                </a>
              ))}
              {filteredLinks.length === 0 ? (
                <p className="ai-muted">Không tìm thấy mục phù hợp. Thử “ads”, “tài liệu” hoặc “hỗ trợ”.</p>
              ) : null}
            </div>
          </section>

          <section className="community-events">
            <h2>Feedback học viên</h2>
            {testimonials.slice(0, 2).map((item) => (
              <div key={`${item.name}-${item.title}`}>
                <span>{item.quote}</span>
                <ButtonLink href="/hoc-vien" variant="secondary">{item.name}</ButtonLink>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
