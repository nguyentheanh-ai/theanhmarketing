import { ArrowDownRight, List, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { scrollToHashAndClean } from "../cleanUrl.js";
import { trackMarketingEvent } from "../checkout.js";

const tocItems = [
  { href: "#hero", label: "Đầu trang" },
  { href: "#day-title", label: "Vấn đề đang mắc" },
  { href: "#compare-title", label: "Trước và sau" },
  { href: "#team", label: "Cách đội ngũ làm việc" },
  { href: "#team-showcase-title", label: "Gặp 8 Nhân viên AI" },
  { href: "#install-title", label: "Cách cài và vận hành" },
  { href: "#real-results-title", label: "Proof vận hành" },
  { href: "#fit-title", label: "Phù hợp với ai" },
  { href: "#offer", label: "Gói sản phẩm & đăng ký" },
  { href: "#faq-title", label: "Câu hỏi thường gặp" },
];

export default function FloatingToc({ product }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState(() => {
    const hash = window.location.hash.slice(1);
    return tocItems.some((item) => item.href === `#${hash}`) ? hash : "hero";
  });
  const triggerRef = useRef(null);
  const firstLinkRef = useRef(null);

  useEffect(() => {
    const sections = tocItems.map((item) => document.querySelector(item.href)).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
      if (visible[0]) setActiveId(visible[0].target.id);
    }, { rootMargin: "-24% 0px -62% 0px", threshold: [0, 0.1, 0.5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    requestAnimationFrame(() => firstLinkRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const closeAndReturnFocus = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const goTo = (event, item) => {
    event.preventDefault();
    const target = document.querySelector(item.href);
    if (!target) return;
    scrollToHashAndClean(item.href);
    setActiveId(item.href.slice(1));
    if (window.matchMedia("(max-width: 600px)").matches) closeAndReturnFocus();
  };

  return (
    <aside className={`floating-toc ${isOpen ? "is-open" : ""}`}>
      <button
        className="floating-toc-trigger"
        type="button"
        aria-label={isOpen ? "Đóng mục lục" : "Mở mục lục"}
        aria-expanded={isOpen}
        aria-controls="floating-toc-panel"
        onClick={() => setIsOpen((open) => !open)}
        ref={triggerRef}
      >
        {isOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
      </button>

      <nav id="floating-toc-panel" className="floating-toc-panel" aria-label="Mục lục trang" hidden={!isOpen}>
        <header className="floating-toc-head">
          <div><span>MỤC LỤC</span><strong>ĐỘI NGŨ AI</strong></div>
          <button type="button" aria-label="Đóng mục lục" onClick={closeAndReturnFocus}><X aria-hidden="true" /></button>
        </header>

        <ol className="floating-toc-list">
          {tocItems.map((item, index) => {
            const id = item.href.slice(1);
            const isActive = activeId === id;
            return (
              <li key={item.href}>
                <a
                  ref={index === 0 ? firstLinkRef : undefined}
                  className={`floating-toc-link ${isActive ? "is-active" : ""}`}
                  href={item.href}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => goTo(event, item)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.label}</strong>
                </a>
              </li>
            );
          })}
        </ol>

        <a className="floating-toc-cta" href="#purchase-form" onClick={() => { setIsOpen(false); trackMarketingEvent("cta_click", { event_id: "agent-kit-toc-cta", location: "toc", content_name: "Doi Ngu Nhan Su AI" }); }}>
          {product.primaryCta} <ArrowDownRight aria-hidden="true" />
        </a>
      </nav>
    </aside>
  );
}
