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

const proofImages = [
  {
    src: "/course-thumbnails/quang-cao-facebook-master-2026.webp",
    alt: "Thumbnail khóa Quảng cáo Facebook Master 2026",
  },
  {
    src: "/blog-thumbnails/agent-03.webp",
    alt: "Agent nghiên cứu đối thủ",
  },
  {
    src: "/blog-thumbnails/agent-04.webp",
    alt: "Agent phân tích website doanh nghiệp",
  },
  {
    src: "/blog-thumbnails/agent-08.webp",
    alt: "Agent tối ưu nội dung marketing",
  },
];

const feedbackImages = [
  "/academy/feedback/feedback-facebook-ads-01.webp",
  "/academy/feedback/feedback-facebook-ads-02.webp",
  "/academy/feedback/feedback-facebook-ads-03.webp",
  "/academy/feedback/feedback-facebook-ads-04.webp",
  "/academy/feedback/feedback-facebook-ads-05.webp",
  "/academy/feedback/feedback-facebook-ads-06.webp",
];

const resultCards = [
  { label: "Bài test đầu tiên", value: "3 mẫu ads", note: "Hook, pain, CTA rõ ràng" },
  { label: "Thời gian theo dõi", value: "3-7 ngày", note: "Không đổi lung tung mỗi ngày" },
  { label: "Chỉ số nền tảng", value: "CTR / CPC / CPL", note: "Biết nên giữ, sửa hay tắt" },
];

const oldNewRows = [
  {
    old: "Boost bài theo cảm tính, thấy bài nào đẹp thì bấm chạy.",
    current: "Chuẩn bị offer, insight, hook và checklist trước khi chạy.",
  },
  {
    old: "Đổi target, đổi ngân sách liên tục nhưng không biết lỗi ở đâu.",
    current: "Test 3 mẫu quảng cáo trong một khung 3-7 ngày rồi đọc tín hiệu.",
  },
  {
    old: "Có tin nhắn nhưng khách hỏi rồi im, không biết sửa content hay inbox.",
    current: "Tách rõ vấn đề ở content, offer, campaign hoặc bước tư vấn.",
  },
];

const guaranteeBullets = [
  "Thanh toán xong hệ thống tạo đơn và mã QR tự động.",
  "Email dùng khi mua là email nhận quyền học.",
  "Nếu gặp lỗi kích hoạt, The Anh Marketing kiểm tra đơn và hỗ trợ thủ công.",
];

export function AcademySalesPage({ product }: AcademySalesPageProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

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
    document.getElementById("academy-checkout")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="academy-ldp">
      <section className="academy-ldp-hero">
        <Link href="/" className="academy-ldp-logo" aria-label="The Anh Marketing">
          TA<span>.</span>
        </Link>
        <p className="academy-ldp-topline">
          Dành cho chủ shop nhỏ, người mới chạy ads, freelancer và marketer junior muốn bắt đầu đúng hệ thống.
        </p>
        <h1>
          <span>Quảng cáo Facebook Master 2026:</span> từ chạy ads mò mẫm thành
          <mark> AI Ads Engine có dữ liệu</mark>
        </h1>
        <p className="academy-ldp-subtitle">
          Lấy lại sự rõ ràng trước khi đổ ngân sách: biết chuẩn bị offer, viết content ads, setup chiến dịch cơ bản và đọc chỉ số để ra quyết định.
        </p>
      </section>

      <section className="academy-ldp-abovefold">
        <div className="academy-ldp-video-card">
          <p className="academy-ldp-card-label">Bật âm thanh và xem demo</p>
          <div className="academy-ldp-video-frame">
            <div className="academy-ldp-screen">
              <Image src={product.thumbnail} alt={product.title} fill sizes="(min-width: 1024px) 48vw, 94vw" priority unoptimized />
              <button type="button" onClick={scrollToCheckout} aria-label="Đăng ký khóa học">
                <span />
              </button>
            </div>
            <div className="academy-ldp-presenter">
              <Image src="/academy/the-anh-cutout.webp" alt="The Anh Marketing" fill sizes="180px" priority unoptimized />
            </div>
          </div>
          <button className="academy-ldp-main-cta" type="button" onClick={scrollToCheckout}>
            Nhận Facebook Ads Master 2026 ngay
          </button>
        </div>

        <aside className="academy-ldp-offer-card" id="offer">
          <span className="academy-ldp-pill">{product.title}</span>
          <div className="academy-ldp-proof-box">
            <p>Kết quả sau khóa học:</p>
            <div className="academy-ldp-mini-dashboard">
              {resultCards.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </article>
              ))}
            </div>
          </div>
          <p className="academy-ldp-copy">
            Một khóa nhập môn để các bạn hiểu Facebook Ads theo hệ thống: insight, offer, content, campaign và data.
          </p>
          <div className="academy-ldp-price-row">
            <span>{product.originalPrice}</span>
            <strong>{product.price}</strong>
          </div>
          <p className="academy-ldp-price-note">Giá mở khóa cho sản phẩm tripwire trong AI Growth Course Funnel.</p>
          <div className="academy-ldp-included">
            <p>Bạn sẽ nhận được:</p>
            {product.offerItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <CheckoutForm
            isSubmitting={isSubmitting}
            message={message}
            onSubmit={handleCheckout}
            product={product}
          />
        </aside>
      </section>

      <section className="academy-ldp-trust">
        <p>Học nhanh, có checklist, có mẫu content ads và lộ trình học tiếp rõ ràng.</p>
        <div>
          {product.trust.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="academy-ldp-feedback">
        <p className="academy-ldp-kicker">Mock feedback minh họa</p>
        <h2>Đây là kiểu vấn đề học viên thường gặp trước khi có hệ ads rõ ràng.</h2>
        <div className="academy-ldp-feedback-grid">
          {feedbackImages.map((src, index) => (
            <figure key={src}>
              <Image
                src={src}
                alt={`Mock feedback minh họa Facebook Ads ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 30vw, 82vw"
                unoptimized
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="academy-ldp-proof-wall">
        <div>
          <p className="academy-ldp-kicker">Proof content hub</p>
          <h2>Không chỉ học lý thuyết. Các bạn cần nhìn được ads đang hỏng ở đâu.</h2>
          <p>
            Phần hình ảnh bên cạnh dùng chính asset trong hệ The Anh Marketing để minh họa cách gom creative, agent và dashboard thành một hệ vận hành.
          </p>
        </div>
        <div className="academy-ldp-collage">
          {proofImages.map((image) => (
            <figure key={image.src}>
              <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 20vw, 44vw" unoptimized />
            </figure>
          ))}
        </div>
      </section>

      <CtaBand onClick={scrollToCheckout} text="Đăng ký ngay - chỉ 99K" />

      <section className="academy-ldp-story">
        <h2>Cách người mới chạy ads thoát khỏi vòng lặp đốt tiền.</h2>
        <div className="academy-ldp-story-grid">
          <p>
            Trước đây, nhiều bạn chạy Facebook Ads bằng cảm giác: thấy người khác dùng mẫu nào thì làm theo, thấy quảng cáo không ra đơn thì đổi target, tăng giảm ngân sách hoặc tắt chiến dịch quá sớm.
          </p>
          <p>
            Vấn đề không nằm ở một nút bấm. Vấn đề là các bạn chưa có một hệ nhỏ để biết: khách là ai, offer có đủ rõ không, nội dung có kéo đúng người không, campaign đang lấy tín hiệu gì và chỉ số nào nói rằng nên giữ hay nên sửa.
          </p>
        </div>
      </section>

      <section className="academy-ldp-compare">
        <div className="academy-ldp-section-head">
          <p className="academy-ldp-kicker">Before / After</p>
          <h2>Cách làm cũ so với AI Ads Engine.</h2>
        </div>
        <div className="academy-ldp-compare-grid">
          {oldNewRows.map((row) => (
            <article key={row.old}>
              <div>
                <h3>Cách làm cũ:</h3>
                <p>{row.old}</p>
              </div>
              <div>
                <h3>Với AI Ads Engine:</h3>
                <p>{row.current}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-ldp-engine" id="mechanism">
        <div className="academy-ldp-section-head">
          <p className="academy-ldp-kicker">Mechanism</p>
          <h2>{product.mechanismTitle}</h2>
        </div>
        <div className="academy-ldp-engine-grid">
          {product.mechanism.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.result}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-ldp-curriculum" id="curriculum">
        <div className="academy-ldp-section-head">
          <p className="academy-ldp-kicker">Lộ trình khóa học</p>
          <h2>6 module ngắn, mỗi module có một đầu ra rõ.</h2>
        </div>
        <div className="academy-ldp-curriculum-list">
          {product.curriculum.map((item, index) => (
            <article key={item.title}>
              <span>Module {index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.benefit}</p>
              <strong>{item.output}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="academy-ldp-bonus">
        <div className="academy-ldp-section-head">
          <p className="academy-ldp-kicker">Bonus</p>
          <h2>Và các bạn còn nhận thêm bộ tài liệu triển khai.</h2>
        </div>
        <div className="academy-ldp-bonus-grid">
          {product.bonuses.map((bonus, index) => (
            <article key={bonus}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{bonus}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand onClick={scrollToCheckout} text="Sở hữu Facebook Ads Master 2026 ngay" />

      <section className="academy-ldp-fit">
        <div>
          <p className="academy-ldp-kicker">Phù hợp nếu</p>
          {product.fit.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div>
          <p className="academy-ldp-kicker">Không phù hợp nếu</p>
          {product.notFit.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className="academy-ldp-guarantee">
        <div className="academy-ldp-guarantee-badge">100%</div>
        <h2>Cam kết kích hoạt quyền học sau thanh toán.</h2>
        <p>
          Mình không hứa các bạn chỉ cần mua là ads tự có kết quả. Điều mình cam kết là hệ thống thanh toán, tạo đơn và kích hoạt quyền học phải rõ ràng.
        </p>
        <div>
          {guaranteeBullets.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="academy-ldp-faq">
        <div className="academy-ldp-section-head">
          <p className="academy-ldp-kicker">FAQ</p>
          <h2>Câu hỏi thường gặp.</h2>
        </div>
        <div className="academy-ldp-faq-list">
          {product.faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <article key={faq.question}>
                <button type="button" onClick={() => setOpenFaq(isOpen ? -1 : index)}>
                  <span>{index + 1}. {faq.question}</span>
                  <strong>{isOpen ? "-" : "+"}</strong>
                </button>
                {isOpen ? <p>{faq.answer}</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="academy-ldp-final">
        <h2>Bắt đầu chạy Facebook Ads có hệ thống từ hôm nay.</h2>
        <button type="button" onClick={scrollToCheckout}>
          Đăng ký ngay - 99K
        </button>
      </section>

      <div className="academy-ldp-sticky">
        <span>{product.shortTitle} · {product.price}</span>
        <button type="button" onClick={scrollToCheckout}>
          Đăng ký
        </button>
      </div>
    </main>
  );
}

function CheckoutForm({
  isSubmitting,
  message,
  onSubmit,
  product,
}: {
  isSubmitting: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  product: AcademyProduct;
}) {
  return (
    <form id="academy-checkout" className="academy-ldp-checkout" onSubmit={onSubmit}>
      <h3>Điền thông tin để sở hữu ngay</h3>
      <p className="academy-ldp-checkout-note">Sản phẩm sẽ được kích hoạt theo email này</p>
      <input name="name" placeholder="Tên của bạn" required />
      <input name="email" placeholder="Email nhận quyền học" required type="email" />
      <input name="phone" placeholder="Số điện thoại/Zalo" required />
      <label>
        <input required type="checkbox" />
        Tôi đồng ý để The Anh Marketing tạo đơn thanh toán và liên hệ hỗ trợ chương trình này.
      </label>
      {message ? <p className="academy-ldp-error">{message}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Đang tạo đơn..." : product.primaryCta}
      </button>
    </form>
  );
}

function CtaBand({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <section className="academy-ldp-cta-band">
      <button type="button" onClick={onClick}>
        {text}
      </button>
    </section>
  );
}
