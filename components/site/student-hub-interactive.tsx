"use client";

import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import type { TestimonialItem } from "@/services/testimonialService";

type StudentHubInteractiveProps = {
  testimonials: TestimonialItem[];
};

const segments = [
  {
    id: "sme-owner",
    label: "SME Owner",
    title: "Nhìn marketing như hệ thống tạo doanh thu",
    description: "Xác định phần đang kẹt trong Growth System: traffic, funnel, lead nurture, CRM hay automation để biết nên xử lý trước ở đâu.",
    actions: ["Chẩn đoán Growth System", "Xem AI Ads Engine", "Đặt lịch tư vấn"],
  },
  {
    id: "solopreneur",
    label: "Solopreneur",
    title: "Dùng AI như một đội marketing gọn nhẹ",
    description: "Lưu prompt, checklist và workflow để research, viết content, chạy ads, chăm lead và đo dữ liệu mà không cần team cồng kềnh.",
    actions: ["Tải AI Growth Toolkit", "Lưu AI Workflow Blueprint", "Mở dashboard"],
  },
  {
    id: "seller",
    label: "Seller",
    title: "Kết nối content, ads và đơn hàng vào cùng một funnel",
    description: "Ưu tiên Facebook Ads 2026, content bán hàng, lead magnet và checklist lọc tệp khách để giảm tiền đốt vào traffic kém chất lượng.",
    actions: ["Xem Facebook Ads 2026", "Tải checklist lọc lead", "Theo dõi tiến độ"],
  },
  {
    id: "marketer",
    label: "Marketer",
    title: "Biến kiến thức thành SOP và dashboard cho team",
    description: "Dùng tài liệu, SOP và prompt để chuẩn hóa content, ads, báo cáo, nurture và tối ưu theo tuần.",
    actions: ["Lưu workflow AI", "Mở SOP Automation", "Nâng cấp chương trình"],
  },
];

const quickLinks = [
  { label: "AI Operator Dashboard", href: "/dashboard", tags: "dashboard học khóa tiến độ growth system" },
  { label: "Khóa Facebook Ads 2026", href: "/hoc-chay-quang-cao-facebook-tu-so-0-tu-chay-ra-don-2026", tags: "facebook ads quảng cáo khóa học" },
  { label: "AI Growth Toolkit", href: "/blog#tai-lieu", tags: "tài liệu workflow checklist prompt sop toolkit" },
  { label: "Chẩn đoán Growth System", href: "/lien-he", tags: "hỗ trợ zalo email liên hệ tư vấn" },
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
        <strong>Operator Hub</strong>
        <p>Chọn vai trò</p>
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
        <ButtonLink href="/dang-nhap" className="mt-auto">Đăng nhập Growth Hub</ButtonLink>
      </aside>

      <main>
        <header>
          <h1>AI Operator Hub để học, lưu workflow và theo dõi tiến độ</h1>
          <label>
            <span className="sr-only">Tìm hành động học viên</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm khóa học, toolkit, workflow, hỗ trợ..."
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
                    <p>{index === 0 ? "Hành động ưu tiên cho vai trò hiện tại." : "Có thể mở từ dashboard hoặc thư viện toolkit."}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="community-map">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="ai-kicker">Growth actions</p>
                <h2>{filteredLinks.length} mục phù hợp</h2>
              </div>
              <div className="flex gap-2">
                {["Khóa học", "Toolkit", "Tư vấn"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div className="student-action-grid">
              {filteredLinks.map((item) => (
                <a key={item.href} href={item.href}>
                  <strong>{item.label}</strong>
                  <span>Mở</span>
                </a>
              ))}
              {filteredLinks.length === 0 ? (
                <p className="ai-muted">Không tìm thấy mục phù hợp. Thử “ads”, “toolkit” hoặc “tư vấn”.</p>
              ) : null}
            </div>
          </section>

          <section className="community-events">
            <h2>Feedback triển khai</h2>
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
