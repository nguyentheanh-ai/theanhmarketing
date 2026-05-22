"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { AcademyProduct } from "@/data/academy";
import { trackMarketingEvent } from "@/lib/tracking/events";

type AcademySalesPageProps = {
  product: AcademyProduct;
};

const feedbackCards = [
  {
    name: "Người mới chạy ads",
    text: "Có checklist trước khi bấm chạy, biết mình cần test gì trong 7 ngày đầu.",
    time: "09:42",
  },
  {
    name: "Tình huống chủ shop",
    text: "Không boost bài theo cảm tính nữa, mà tách rõ hook, offer và inbox để sửa.",
    time: "14:18",
  },
  {
    name: "Tình huống freelancer",
    text: "Nhìn CTR, CPC, CPL là biết nên tắt, sửa hay test tiếp mẫu quảng cáo nào.",
    time: "20:07",
  },
];

const metricCards = [
  { label: "Creative test", value: "3 mẫu", note: "Hook, pain, CTA" },
  { label: "Test window", value: "7 ngày", note: "Theo dõi tín hiệu" },
  { label: "Core metrics", value: "CTR/CPL", note: "Đọc để ra quyết định" },
];

export function AcademySalesPage({ product }: AcademySalesPageProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    trackMarketingEvent("ViewContent", {
      content_ids: [product.courseSlug],
      content_name: product.title,
      content_type: "academy_sales_page",
      currency: "VND",
      value: product.price,
    });
  }, [product]);

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const studentName = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const phone = String(formData.get("phone") ?? "");

    trackMarketingEvent("InitiateCheckout", {
      content_ids: [product.courseSlug],
      content_name: product.title,
      source: "academy",
    });

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          email,
          phone,
          courseSlug: product.courseSlug,
          courseSlugs: [product.courseSlug],
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        order?: { orderCode: string };
        message?: string;
      };

      if (!response.ok || !payload.order) {
        setMessage(payload.message ?? "Chưa tạo được đơn thanh toán. Anh/chị thử lại giúp em.");
        setIsSubmitting(false);
        return;
      }

      trackMarketingEvent("Lead", {
        content_ids: [product.courseSlug],
        content_name: product.title,
        source: "academy_checkout",
      });
      router.push(`/thanh-toan/${payload.order.orderCode}`);
    } catch {
      setMessage("Kết nối thanh toán đang gián đoạn. Anh/chị thử lại trong ít phút.");
      setIsSubmitting(false);
    }
  }

  function scrollToCheckout() {
    trackMarketingEvent("AddToCart", {
      content_ids: [product.courseSlug],
      content_name: product.title,
      source: "academy_cta",
    });
    document.getElementById("academy-checkout")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="academy-page">
      <header className="academy-header">
        <Link href="/" className="academy-brand" aria-label="The Anh Marketing">
          TA<span>.</span>
        </Link>
        <nav aria-label="Landing page">
          <a href="#mechanism">Cơ chế</a>
          <a href="#curriculum">Nội dung</a>
          <a href="#offer">Học phí</a>
        </nav>
        <button type="button" onClick={scrollToCheckout}>
          {product.price}
        </button>
      </header>

      <section className="academy-hero">
        <div className="academy-hero-copy">
          <p className="academy-kicker">{product.eyebrow}</p>
          <p className="academy-badge">{product.badge}</p>
          <h1>{product.headline}</h1>
          <p className="academy-lead">{product.subheadline}</p>
          <div className="academy-actions">
            <button type="button" onClick={scrollToCheckout}>
              {product.primaryCta}
            </button>
            <a href="#curriculum">{product.secondaryCta}</a>
          </div>
          <div className="academy-trust-row">
            {product.trust.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="academy-hero-visual">
          <div className="academy-product-card">
            <Image src={product.thumbnail} alt={product.title} fill sizes="(min-width: 1024px) 38vw, 92vw" priority unoptimized />
          </div>
          <div className="academy-dashboard-card" aria-label="Facebook Ads mini dashboard">
            <div>
              <span>Ads Signal</span>
              <strong>AI Ads Engine</strong>
            </div>
            <div className="academy-chart-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>Giữ mẫu thắng · tắt mẫu đốt tiền · sửa điểm nghẽn</p>
          </div>
          <div className="academy-founder-card">
            <Image src="/academy/the-anh-cutout.webp" alt="The Anh Marketing" fill sizes="220px" priority unoptimized />
          </div>
        </div>
      </section>

      <section className="academy-section academy-stats">
        {product.trust.map((item, index) => (
          <article key={item}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>{item}</span>
          </article>
        ))}
      </section>

      <section className="academy-section academy-visual-strip">
        <div className="academy-mini-creative">
          <Image src={product.thumbnail} alt="Thumbnail khóa Quảng cáo Facebook Master 2026" fill sizes="320px" unoptimized />
        </div>
        <div className="academy-metric-grid">
          {metricCards.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-section academy-split" id="pain">
        <div>
          <p className="academy-kicker">Vấn đề</p>
          <h2>Ads không hỏng vì thiếu nút bấm.</h2>
          <p>{product.audience}</p>
        </div>
        <div className="academy-card-grid">
          {product.pains.map((pain) => (
            <article key={pain} className="academy-card">
              {pain}
            </article>
          ))}
        </div>
      </section>

      <section className="academy-section academy-opportunity">
        <p className="academy-kicker">Opportunity</p>
        <h2>{product.opportunity}</h2>
        <div className="academy-flow">
          {["Insight", "Offer", "Content", "Campaign", "Data"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="academy-section" id="mechanism">
        <div className="academy-section-head">
          <p className="academy-kicker">Mechanism</p>
          <h2>{product.mechanismTitle}</h2>
        </div>
        <div className="academy-mechanism">
          {product.mechanism.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.result}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-section academy-split">
        <div>
          <p className="academy-kicker">Output</p>
          <h2>Học xong phải có đầu ra.</h2>
        </div>
        <div className="academy-output-list">
          {product.outputs.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className="academy-section" id="curriculum">
        <div className="academy-section-head">
          <p className="academy-kicker">Nội dung</p>
          <h2>6 module ngắn, học để làm ngay.</h2>
        </div>
        <div className="academy-curriculum">
          {product.curriculum.map((item, index) => (
            <article key={item.title}>
              <span>{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.benefit}</p>
              <strong>{item.output}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-section academy-bonus">
        <div className="academy-section-head">
          <p className="academy-kicker">Bonus stack</p>
          <h2>Bonus giúp bắt tay vào chạy nhanh hơn.</h2>
        </div>
        <div className="academy-bonus-grid">
          {product.bonuses.map((item, index) => (
            <article key={item} className="academy-bonus-card">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-section academy-proof">
        <div>
          <p className="academy-kicker">Người thật, bối cảnh thật</p>
          <h2>Khóa nhập môn để chạy ads có quy trình.</h2>
          <p>
            Các tình huống bên cạnh giúp các bạn tự soi mình đang thiếu offer, content, campaign hay dữ liệu.
          </p>
        </div>
        <div className="academy-zalo-stack">
          {feedbackCards.map((item) => (
            <article key={item.name} className="academy-zalo-card">
              <span>{item.time}</span>
              <h3>{item.name}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-section academy-fit">
        <div>
          <h2>Ai nên học / không nên học?</h2>
          <p className="academy-kicker">Phù hợp nếu</p>
          {product.fit.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div>
          <h2>Tự lọc kỳ vọng trước khi mua.</h2>
          <p className="academy-kicker">Không phù hợp nếu</p>
          {product.notFit.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className="academy-section academy-offer" id="offer">
        <div>
          <p className="academy-kicker">Offer</p>
          <h2>{product.title}</h2>
          <p className="academy-price">{product.price}</p>
          <p className="academy-old-price">{product.originalPrice}</p>
          <div className="academy-offer-list">
            {product.offerItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className="academy-next-offer">Sau mua: {product.nextOffer}</p>
        </div>
        <form id="academy-checkout" className="academy-checkout" onSubmit={handleCheckout}>
          <p className="academy-kicker">Thanh toán tự động</p>
          <h3>Nhập thông tin để tạo mã QR SePay</h3>
          <input name="name" placeholder="Họ và tên" required />
          <input name="phone" placeholder="Số điện thoại/Zalo" required />
          <input name="email" placeholder="Email nhận quyền học" required type="email" />
          <label>
            <input required type="checkbox" />
            Tôi đồng ý để The Anh Marketing tạo đơn thanh toán và liên hệ hỗ trợ chương trình này.
          </label>
          {message ? <p className="academy-error">{message}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo đơn..." : product.primaryCta}
          </button>
        </form>
      </section>

      <section className="academy-section">
        <div className="academy-section-head">
          <p className="academy-kicker">FAQ</p>
          <h2>Câu hỏi thường gặp.</h2>
        </div>
        <div className="academy-faq">
          {product.faqs.map((faq) => (
            <article key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-final">
        <h2>Bắt đầu bằng một hệ thống nhỏ, rõ và có thể đo được.</h2>
        <button type="button" onClick={scrollToCheckout}>
          {product.primaryCta}
        </button>
      </section>

      <div className="academy-sticky-cta">
        <span>{product.shortTitle} · {product.price}</span>
        <button type="button" onClick={scrollToCheckout}>
          Đăng ký
        </button>
      </div>
    </main>
  );
}
