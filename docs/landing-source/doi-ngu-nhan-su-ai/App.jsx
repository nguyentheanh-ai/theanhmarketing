import { useEffect, useState } from "react";
import { ArrowDownRight, Check, X } from "lucide-react";
import { dailyPain, faqs, fit, marqueeItems, product, roles, trustItems } from "./content.js";
import Marquee from "./components/Marquee.jsx";
import Hero from "./components/Hero.jsx";
import TeamShowcase from "./components/TeamShowcase.jsx";
import Faq from "./components/Faq.jsx";
import StickyCta from "./components/StickyCta.jsx";
import AgentOperationsBoard from "./components/AgentOperationsBoard.jsx";
import InstallSection from "./components/InstallSection.jsx";
import AboutSection from "./components/AboutSection.jsx";
import RegistrationForm from "./components/RegistrationForm.jsx";
import RealResultsSection from "./components/RealResultsSection.jsx";
import { sectionVisuals } from "./visuals.js";
import { cleanDirectLoadHash, installCleanAnchorNavigation } from "./cleanUrl.js";
import { trackMarketingEvent, trackOnce } from "./checkout.js";
import { getAgentKitOffer } from "./offerPhase.js";

function SectionIntro({ eyebrow, title, text, id }) {
  return <div className="section-intro" data-reveal><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2>{text && <p>{text}</p>}</div>;
}

export default function App() {
  const [activeOffer, setActiveOffer] = useState(() => getAgentKitOffer());
  const activeProduct = { ...product, ...activeOffer };

  useEffect(() => {
    const timer = window.setInterval(() => setActiveOffer(getAgentKitOffer()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("is-visible"); }), { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const removeCleanAnchorNavigation = installCleanAnchorNavigation();
    cleanDirectLoadHash();
    return removeCleanAnchorNavigation;
  }, []);

  useEffect(() => {
    trackOnce("ViewContent", { event_id: "agent-kit-view-content", content_name: "Doi Ngu Nhan Su AI", content_type: "product", value: activeProduct.payNowVnd, currency: "VND" }, "agent-kit-view-content");
    const offer = document.querySelector("#offer");
    if (!offer) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) trackOnce("offer_view", { event_id: "agent-kit-offer-view", content_name: "Doi Ngu Nhan Su AI" }, "agent-kit-offer-view");
    }, { threshold: 0.2 });
    observer.observe(offer);
    return () => observer.disconnect();
  }, [activeProduct.payNowVnd]);

  return (
    <>
      <section className="marquee-section" aria-label="Những phần việc đội ngũ hỗ trợ"><Marquee items={marqueeItems} /></section>
      <section id="hero" className="section-dark hero-section" aria-label="Giới thiệu Đội ngũ nhân sự AI"><Hero product={activeProduct} visual={sectionVisuals.hero} /></section>
      <section className="section-cream trust-section" aria-labelledby="trust-title"><h2 id="trust-title" className="sr-only">Cấu trúc đội ngũ</h2><div className="stats-grid">{trustItems.map((item) => <article key={item.label} data-reveal><strong>{item.number}</strong><span>{item.label}</span></article>)}</div></section>

      <section className="section-cream" aria-labelledby="day-title"><div className="container"><SectionIntro id="day-title" eyebrow="Những việc marketing nhỏ đang chia vụn ngày làm việc" title="Viết bài, sửa hình, kiểm tra quảng cáo. Việc nào cũng đến tay anh/chị." text="Một bài bán hàng, một vòng duyệt hình hay một lần xem lại số liệu đều có vẻ nhỏ. Gom cả tuần lại, những việc đó lấy mất thời gian bán hàng và chăm khách." /><div className="pain-list">{dailyPain.map((item, index) => <article key={item} data-reveal><span>0{index + 1}</span><p>{item}</p></article>)}</div></div></section>

      <section className="section-cream before-after" aria-labelledby="compare-title"><div className="container"><SectionIntro id="compare-title" eyebrow="Trước và sau" title="Thông tin đã duyệt được dùng lại cho lần giao việc sau." text="Anh/chị vẫn quyết định điều quan trọng. Phần tìm dữ liệu, lên bản nháp, kiểm tra và ghi lại đã có người nhận." /><div className="compare-grid"><article data-reveal><span>TRƯỚC</span><h3>Tự nhớ, tự tìm, tự sửa</h3><p>Thông tin nằm nhiều nơi. Thuê người vẫn phải kèm từng bước. Dùng AI vẫn phải dạy lại từ đầu.</p></article><article className="after" data-reveal><span>SAU</span><h3>Giao một lần, duyệt một chỗ</h3><p>Dữ liệu được dùng chung. Việc có người nhận. Cách làm tốt được giữ lại cho lần sau.</p></article></div></div></section>
      <section id="team" className="section-cream flow-section" aria-labelledby="flow-title"><div className="container"><SectionIntro id="flow-title" eyebrow="Demo đội ngũ" title="Anh/chị giao một việc. Mỗi Nhân viên AI nhận đúng phần đã được phân vai." text="Tám Nhân viên AI dùng chung thông tin đã được anh/chị duyệt. Chọn từng vai trò để xem đầu vào, cách xử lý và tài liệu bàn giao." /><AgentOperationsBoard roles={roles} /></div></section>
      <section className="section-cream team-section" aria-labelledby="team-showcase-title"><div className="container"><SectionIntro id="team-showcase-title" eyebrow="Tám Nhân viên AI, một đội ngũ" title="Gặp 8 Nhân viên AI trong doanh nghiệp của anh/chị." text="Mỗi Nhân viên AI nhận một phần, dùng chung thông tin và trả về đúng loại tài liệu để anh/chị xem." /><TeamShowcase roles={roles} visualSets={sectionVisuals.roles} /></div></section>
      <section className="section-cream install-section" aria-labelledby="install-title"><div className="container"><SectionIntro id="install-title" eyebrow="Chỉ với 3 bước đơn giản" title="Tải về → Cài đặt → Giao việc" text="Sau khi đăng ký, anh/chị tải bộ 8 Nhân viên AI về máy, làm theo video hướng dẫn cài đặt rồi bắt đầu giao một việc thật." /><InstallSection /></div></section>
      <section className="section-dark real-results-section" aria-labelledby="real-results-title"><div className="container"><RealResultsSection /></div></section>
      <section className="section-cream fit-section" aria-labelledby="fit-title"><div className="container"><SectionIntro id="fit-title" eyebrow="Dành cho người đang tự vận hành" title="Chủ doanh nghiệp và chuyên gia nào sẽ dùng tốt nhất?" text="Anh/chị đã có sản phẩm, dịch vụ hoặc chuyên môn để bán. Điều anh/chị thiếu là một đội ngũ nhận phần việc lặp lại mỗi ngày." /><div className="fit-grid"><article data-reveal><h3><Check />Phù hợp nếu</h3>{fit.yes.map((item) => <p key={item}>{item}</p>)}</article><article data-reveal><h3><X />Chưa phù hợp nếu</h3>{fit.no.map((item) => <p key={item}>{item}</p>)}</article></div></div></section>

      <section id="offer" className="section-dark offer-section" aria-labelledby="offer-title"><div className="container offer-layout"><div data-reveal><p className="eyebrow">Trọn bộ cho doanh nghiệp</p><h2 id="offer-title">Đưa đội ngũ AI vào công việc hằng ngày.</h2><div className="offer-price"><s>{activeProduct.originalPrice}</s><strong>{activeProduct.price}</strong><span>Thanh toán một lần · Đã bao gồm VAT</span></div><ul className="offer-list">{["8 Nhân viên AI theo từng phần việc marketing", "Video hướng dẫn cài đặt và SOP vận hành", "Dùng dữ liệu riêng của doanh nghiệp", "Dùng nội bộ, không giới hạn thành viên"].map((item) => <li key={item}><Check />{item}</li>)}</ul></div><RegistrationForm product={activeProduct} /></div></section>
      <section className="section-dark about-section" aria-label="Giới thiệu The Anh Marketing"><div className="container"><AboutSection /></div></section>
      <section className="section-cream final-section" aria-labelledby="faq-title"><div className="container"><SectionIntro id="faq-title" eyebrow="Đọc rõ trước khi nhận đội ngũ" title="Anh/chị cần biết gì trước khi đưa Nhân viên AI vào làm việc?" /><Faq items={faqs} /><div className="final-cta" data-reveal><p className="eyebrow">Bắt đầu bằng một việc đang mắc</p><h2>Giao đúng việc cho đúng Nhân viên AI.</h2><p>Chọn một việc anh/chị cần giải quyết hôm nay, sau đó hoàn tất bước đăng ký để nhận hướng dẫn triển khai.</p><a className="button button-primary" href="#purchase-form" data-event="cta_click" data-event-location="faq" onClick={() => trackMarketingEvent("cta_click", { event_id: "agent-kit-faq-cta", location: "faq", content_name: "Doi Ngu Nhan Su AI" })}>{activeProduct.primaryCta}<ArrowDownRight /></a></div></div></section>
      <section className="marquee-section bottom" aria-label="Tóm tắt đội ngũ"><Marquee items={[product.name, "8 Nhân viên AI", "Video hướng dẫn chi tiết", "Anh/chị duyệt trước khi dùng"]} reverse /></section>
      <StickyCta product={activeProduct} />
    </>
  );
}
