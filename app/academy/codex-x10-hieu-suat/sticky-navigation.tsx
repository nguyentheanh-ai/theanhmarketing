"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CODEX_AGENT_KIT_OFFER } from "./offer";
import { sections } from "./navigation-items";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "đ";

export function StickyNavigation() {
  const [formVisible, setFormVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("gioi-thieu");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const form = document.getElementById("dang-ky");
    if (!form) return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = sections[0][0];
      for (const [id] of sections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.3) current = id;
      }
      setActiveId(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = previous; };
  }, [open]);

  function close() { dialog.current?.close(); setOpen(false); }
  function go(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    close();
    const target = document.getElementById(id);
    if (!target) return;
    // Release focus from the form before navigating elsewhere.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    if (id === "dang-ky") target.querySelector<HTMLInputElement>("input[name=studentName]")?.focus({ preventScroll: true });
  }
  function show() {
    const node = dialog.current;
    if (!node) return;
    node.style.setProperty("--cx-bar-height", `${bar.current?.getBoundingClientRect().height ?? 110}px`);
    node.showModal();
    setOpen(true);
    node.querySelector<HTMLElement>('[aria-current="location"]')?.scrollIntoView({ block: "nearest" });
  }

  return <>
    <aside ref={bar} className="cx-sticky" hidden={formVisible} aria-label="Đăng ký khóa Codex">
      <div className="cx-sticky-inner">
        <div className="cx-sticky-brand">CODEX <span>X10 HIỆU SUẤT CÁ NHÂN</span></div>
        <div className="cx-sticky-price"><span>Giá chính thức</span><strong>{money(CODEX_AGENT_KIT_OFFER.price)}</strong><s aria-label="Giá gốc">{money(CODEX_AGENT_KIT_OFFER.originalPrice)}</s></div>
        <div className="cx-sticky-actions">
          <button ref={trigger} type="button" className="cx-sticky-toc" aria-label="Mở mục lục" aria-haspopup="dialog" aria-expanded={open} aria-controls="cx-toc-dialog" onClick={show}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 6h12M9 12h12M9 18h12"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </button>
          <a className="cx-btn" href="#dang-ky" onClick={e => go(e, "dang-ky")}>Đăng ký ngay · {money(CODEX_AGENT_KIT_OFFER.price)} <span aria-hidden>↗</span></a>
        </div>
      </div>
    </aside>
    <dialog ref={dialog} id="cx-toc-dialog" className="cx-toc-dialog" aria-labelledby="cx-toc-title" onClose={() => setOpen(false)} onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="cx-toc-panel">
        <header className="cx-toc-head"><div><span>MỤC LỤC</span><h2 id="cx-toc-title">CODEX X10 HIỆU SUẤT</h2></div><button type="button" aria-label="Đóng mục lục" onClick={close}>×</button></header>
        <nav className="cx-toc-list" aria-label="Mục lục theo lợi ích"><ol>{sections.map(([id, title], index) => <li key={id}><a href={`#${id}`} aria-current={activeId === id ? "location" : undefined} onClick={e => go(e, id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong></a></li>)}</ol></nav>
        <a className="cx-toc-cta" href="#dang-ky" onClick={e => go(e, "dang-ky")}>NHẬN KHÓA HỌC & BỘ AGENT <span aria-hidden>↘</span></a>
      </div>
    </dialog>
  </>;
}
