import { useEffect, useState } from "react";
import FloatingToc from "./FloatingToc.jsx";
import { trackMarketingEvent } from "../checkout.js";

export default function StickyCta({ product }) {
  const [visible, setVisible] = useState(false);
  const [formFocused, setFormFocused] = useState(false);
  useEffect(() => {
    const hero = document.querySelector("#hero");
    const offer = document.querySelector("#offer");
    const finalSection = document.querySelector("#purchase-form");
    const state = { heroVisible: true, offerVisible: false, finalVisible: false };
    const update = () => setVisible(!state.heroVisible && !state.offerVisible && !state.finalVisible && !formFocused);
    const heroObserver = new IntersectionObserver(([entry]) => { state.heroVisible = entry.isIntersecting; update(); }, { threshold: 0.05 });
    const offerObserver = new IntersectionObserver(([entry]) => { state.offerVisible = entry.isIntersecting; update(); }, { threshold: 0.1 });
    const finalObserver = new IntersectionObserver(([entry]) => { state.finalVisible = entry.isIntersecting; update(); }, { threshold: 0.01 });
    if (hero) heroObserver.observe(hero);
    if (offer) offerObserver.observe(offer);
    if (finalSection) finalObserver.observe(finalSection);
    return () => { heroObserver.disconnect(); offerObserver.disconnect(); finalObserver.disconnect(); };
  }, [formFocused]);
  useEffect(() => {
    const form = document.querySelector("#purchase-form");
    if (!form) return undefined;
    const onFocus = () => setFormFocused(true);
    const onBlur = () => window.setTimeout(() => setFormFocused(form.contains(document.activeElement)), 0);
    form.addEventListener("focusin", onFocus);
    form.addEventListener("focusout", onBlur);
    return () => { form.removeEventListener("focusin", onFocus); form.removeEventListener("focusout", onBlur); };
  }, []);
  return (
    <aside className={`sticky-cta ${visible ? "is-visible" : ""}`} aria-hidden={!visible}>
      <div className="sticky-cta-copy">
        <strong>Đội ngũ nhân sự AI · 8 Nhân viên AI</strong>
        <span>Video hướng dẫn · SOP · Thanh toán một lần</span>
      </div>
      <div className="sticky-cta-actions">
        {visible && <FloatingToc product={product} />}
      <a href="#purchase-form" data-event="cta_click" data-event-location="sticky" tabIndex={visible ? 0 : -1} onClick={() => trackMarketingEvent("cta_click", { event_id: "agent-kit-sticky-cta", location: "sticky", content_name: "Doi Ngu Nhan Su AI" })}>{product.primaryCta}</a>
      </div>
    </aside>
  );
}
