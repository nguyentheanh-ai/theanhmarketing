"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getAgentKitSalePhase, getAgentKitPaymentPlan, AGENT_KIT_SLUG, AGENT_KIT_PREORDER_PRICE_VND, AGENT_KIT_PREORDER_DEPOSIT_VND, AGENT_KIT_PREORDER_REMAINING_VND, AGENT_KIT_OFFICIAL_PRICE_VND, type AgentKitSalePhase } from "@/lib/agent-kit-preorder";
import { getClientAttribution } from "@/lib/tracking/client-attribution";
import { trackMarketingEvent } from "@/lib/tracking/events";
import { InvoiceRequestFields } from "@/components/payment/invoice-request-fields";
import { invoiceInputFromFormData } from "@/lib/orders/invoice";

import { OfferIcon, outcomes } from "./outcomes";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "đ";
const examples = [
  { name: "Marketer", title: "Lên nội dung từ tài liệu sản phẩm.", request: "Đọc tài liệu sản phẩm và các bài đã duyệt. Đề xuất lịch nội dung tuần tới, ghi rõ phần nào cần mình bổ sung.", input: "Thông tin sản phẩm, chân dung khách và bài viết mẫu.", output: "Lịch nội dung, bản nháp từng bài và danh sách thông tin còn thiếu.", review: "Giá bán, lợi ích sản phẩm, giọng viết và ngày đăng.", tasks: ["Nghiên cứu khách hàng và đối thủ", "Lập kế hoạch nội dung", "Soạn bài và kịch bản video", "Tổng hợp số liệu quảng cáo"] },
  { name: "Freelancer", title: "Chuẩn bị đề xuất từ yêu cầu của khách.", request: "Tóm tắt yêu cầu trong tài liệu này. Soạn đề xuất gồm phạm vi công việc, hạng mục bàn giao và các câu cần hỏi khách. Chưa điền giá khi mình chưa cung cấp.", input: "Yêu cầu khách gửi, mẫu đề xuất và điều kiện làm việc.", output: "Bản đề xuất, danh sách hạng mục và các câu cần làm rõ.", review: "Phạm vi, giá, thời hạn và số vòng chỉnh sửa trước khi gửi.", tasks: ["Tóm tắt yêu cầu khách hàng", "Soạn đề xuất và thư trao đổi", "Chuẩn bị nội dung bàn giao", "Lập bảng theo dõi tiến độ"] },
  { name: "Nhân viên văn phòng", title: "Tổng hợp báo cáo theo mẫu đang dùng.", request: "Đối chiếu các bảng số liệu tuần này. Tổng hợp theo mẫu báo cáo, ghi nguồn của từng chỉ số và đánh dấu các số chưa khớp.", input: "Bảng số liệu được phép sử dụng và mẫu báo cáo.", output: "Bản tổng hợp, nhận xét và danh sách số liệu cần kiểm tra.", review: "Kỳ báo cáo, công thức, nguồn số và thông tin trước khi gửi.", tasks: ["Tóm tắt tài liệu dài", "Tổng hợp và đối chiếu bảng tính", "Soạn báo cáo theo mẫu", "Chuẩn bị nội dung cuộc họp"] },
];

export function AudienceExamples() {
  const [active, setActive] = useState(0);
  const benefits = [
    { title: "Làm trọn chiến dịch với đội ngũ AI.", lead: "Có nội dung, video, landing page và lịch đăng để triển khai cùng một chiến dịch.", items: ["Nghiên cứu khách hàng và đối thủ", "Làm video và trang bán hàng", "Lên quảng cáo theo ngân sách", "Đăng bài Facebook theo lịch"], gain: "Dành thời gian thử ý tưởng và tìm khách hàng mới.", icon: "ads" },
    { title: "Nhận thêm dự án, chủ động bàn giao.", lead: "Mở rộng dịch vụ từ viết nội dung sang video, website và kế hoạch marketing.", items: ["Chuẩn bị đề xuất cho khách", "Sản xuất nội dung và video", "Làm website theo từng sản phẩm", "Theo dõi tiến độ và thu chi"], gain: "Có thêm dịch vụ để chào bán cho khách đang có.", icon: "web" },
    { title: "Hoàn thành báo cáo, bớt việc ngoài giờ.", lead: "Có bản tổng hợp để gửi, kế hoạch để trình bày và số liệu để theo dõi công việc.", items: ["Tổng hợp tài liệu và báo cáo", "Nghiên cứu và lập kế hoạch", "Chuẩn bị nội dung thuyết trình", "Theo dõi thu chi theo dữ liệu"], gain: "Dành thời gian phân tích và đề xuất thay vì gom từng file.", icon: "finance" },
  ][active];
  return <div className="cx-audience"><div className="cx-choice" aria-label="Chọn nhóm công việc">{examples.map((item,i)=><button type="button" key={item.name} aria-pressed={active===i} onClick={()=>setActive(i)}>{item.name}</button>)}</div><div className="cx-audience-body" aria-live="polite"><div><span className="cx-icon-tile"><OfferIcon name={benefits.icon}/></span><h3>{benefits.title}</h3><p>{benefits.lead}</p><ul>{benefits.items.map(task=><li key={task}>{task}</li>)}</ul></div><div className="cx-example-sheet"><p className="cx-label">THÊM NĂNG LỰC CHO CÔNG VIỆC CỦA BẠN</p><OfferIcon name="spark"/><h3>{benefits.gain}</h3><div><b>Học bằng công việc đang có</b><p>Dùng sản phẩm, tài liệu và khách hàng của bạn để thực hành. Giữ cách làm đã tốt để tiếp tục dùng cho dự án sau.</p></div><a className="cx-text-link" href="#hoc-phi">Nhận khóa học & bộ Agent ↗</a></div></div></div>;
}

export function WorkDemo() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const example = examples[active];
  const headings = ["Chuẩn bị tài liệu", "Giao yêu cầu", "Đọc & kiểm tra kết quả"];
  const copy = [example.input, example.request, example.output];
  return <div className="cx-demo"><div className="cx-demo-toolbar"><span>TÌNH HUỐNG MINH HỌA</span><select aria-label="Chọn công việc minh họa" value={active} onChange={e=>{setActive(Number(e.target.value));setStep(0);}}>{examples.map((x,i)=><option key={x.name} value={i}>{x.name}</option>)}</select></div><div className="cx-demo-body"><div className="cx-demo-nav" aria-label="Các bước giao việc">{headings.map((title,i)=><button type="button" aria-pressed={step===i} key={title} onClick={()=>setStep(i)}><span>0{i+1}</span>{title}<span aria-hidden>↗</span></button>)}</div><div className="cx-demo-content" aria-live="polite"><span className="cx-label">{example.name} · BƯỚC {step+1}</span><h3>{headings[step]}</h3><p>{copy[step]}</p>{step===2 ? <div className="cx-demo-check"><b>Trước khi sử dụng</b><p>{example.review}</p></div>:<button className="cx-text-link" type="button" onClick={()=>setStep(step+1)}>Xem bước tiếp theo →</button>}</div></div></div>;
}

export function EfficiencyCalculator() {
  const [hours, setHours] = useState(10);
  const [percent, setPercent] = useState(50);
  const saved = hours * percent / 100;
  const fmt = (value: number) => new Intl.NumberFormat("vi-VN", {maximumFractionDigits: 1}).format(value);
  return <div className="cx-calculator"><div><p className="cx-label">THỬ TÍNH VỚI CÔNG VIỆC CỦA BẠN</p><h3>Mỗi tuần bạn có thể dành lại bao nhiêu giờ?</h3><label htmlFor="cx-hours">Thời gian làm việc lặp lại <b>{hours} giờ / tuần</b></label><input id="cx-hours" type="range" min="1" max="40" value={hours} onChange={e=>setHours(Number(e.target.value))} /><label htmlFor="cx-percent">Giả sử giảm được <b>{percent}% thời gian</b></label><input id="cx-percent" type="range" min="10" max="90" step="10" value={percent} onChange={e=>setPercent(Number(e.target.value))} /></div><div className="cx-calculator-result" aria-live="polite"><span>THỜI GIAN CÓ THỂ DÀNH LẠI</span><output>{fmt(saved)}<small>giờ / tuần</small></output><p>Còn {fmt(hours-saved)} giờ để hoàn thành cùng phần việc, gồm cả kiểm tra và chỉnh sửa.</p><p>Tốc độ tương ứng: <b>{fmt(100/(100-percent))} lần</b></p></div></div>;
}

export function CodexOffer() {
  const [phase, setPhase] = useState<AgentKitSalePhase | null>(null);
  const [busy, setBusy] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formFocused, setFormFocused] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  const viewed = useRef(false);
  useEffect(()=>{
    const refresh=()=>setPhase(getAgentKitSalePhase());
    refresh();
    const timer=window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return ()=>{clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[]);
  useEffect(()=>{
    if(!phase || viewed.current) return;
    viewed.current=true;
    try {
      trackMarketingEvent("ViewContent", {content_name:"Doi Ngu Nhan Su AI",content_ids:[AGENT_KIT_SLUG],content_type:"product",value:phase==="preorder"?AGENT_KIT_PREORDER_DEPOSIT_VND:AGENT_KIT_OFFICIAL_PRICE_VND,currency:"VND"});
    } catch { /* Optional analytics must not crash the registration form. */ }
  },[phase]);
  useEffect(()=>{
    const form=document.getElementById("dang-ky");
    if(!form) return;
    const observer=new IntersectionObserver(([entry])=>setFormVisible(entry.isIntersecting),{threshold:0});
    observer.observe(form);
    return ()=>observer.disconnect();
  },[]);
  const preorder = phase === "preorder";
  const payNow = preorder ? AGENT_KIT_PREORDER_DEPOSIT_VND : AGENT_KIT_OFFICIAL_PRICE_VND;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !phase) return;
    if(getAgentKitSalePhase()!==phase){setPhase(getAgentKitSalePhase());setMessage("Giá bán vừa chuyển sang giai đoạn mới. Bạn xem lại số tiền rồi tiếp tục đăng ký.");return;}
    locked.current=true;setBusy(true);setMessage("");
    const form = new FormData(event.currentTarget);
    let attribution: ReturnType<typeof getClientAttribution> = {};
    try { attribution=getClientAttribution(); } catch { /* A malformed tracking cookie must not block an order. */ }
    try {
      const response=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({studentName:String(form.get("studentName")||"").trim(),email:String(form.get("email")||"").trim(),phone:String(form.get("phone")||"").trim(),courseSlug:AGENT_KIT_SLUG,paymentPlan:getAgentKitPaymentPlan(),...attribution,landingPage:"academy/codex-x10-hieu-suat",pageUrl:window.location.href,referrer:document.referrer,leadId:`lead-${crypto.randomUUID()}`,invoice:invoiceInputFromFormData(form)})});
      const result=await response.json();
      if(!response.ok || !result.ok || !result.order?.orderCode) throw new Error(result.message || "Chưa tạo được mã thanh toán. Bạn thử lại giúp mình.");
      const code=result.order.orderCode as string;
      try {
        trackMarketingEvent("Lead",{event_id:code,content_name:"Doi Ngu Nhan Su AI",content_type:"product",value:payNow,currency:"VND",...attribution});
        trackMarketingEvent("InitiateCheckout",{event_id:code,order_id:code,content_name:"Doi Ngu Nhan Su AI",content_type:"product",value:payNow,currency:"VND",...attribution});
        window.sessionStorage.setItem(`tam:initiate-checkout:${code}`,"1");
      } catch { /* Analytics must not prevent a successful checkout handoff. */ }
      window.location.assign(`/thanh-toan/${encodeURIComponent(code)}`);
    } catch(error) {setMessage(error instanceof Error ? error.message : "Kết nối chưa thành công. Bạn thử lại giúp mình.");locked.current=false;setBusy(false);}
  }
  return <><section className="cx-section cx-dark" id="hoc-phi"><div className="cx-wrap cx-offer"><div><p className="cx-label">KHÓA HỌC CODEX & BỘ AGENT</p><h2>Một khóa học.<br />Cả đội ngũ AI để làm việc cùng bạn.</h2><p className="cx-offer-lead">Học cách tự động hóa 8 nhóm công việc và có bộ Agent để bắt tay thực hành.</p><div className="cx-offer-outcomes">{outcomes.map(x=><div key={x.icon}><OfferIcon name={x.icon}/><span>{x.title}</span></div>)}</div><ul className="cx-benefits"><li><b>Hơn 20 video học sẵn</b><span>Xem theo lịch của bạn, dừng để thực hành và mở lại khi cần.</span></li><li><b>Bộ 8 nhân viên AI</b><span>Từ nghiên cứu, nội dung đến video, quảng cáo và website.</span></li><li><b>Hướng dẫn tạo Agent riêng</b><span>Làm theo giọng thương hiệu, sản phẩm và mẫu báo cáo của bạn.</span></li><li><b>Mẫu tài liệu & hướng dẫn ứng dụng</b><span>Có cách làm để dùng lại cho công việc và dự án tiếp theo.</span></li></ul><div className="cx-same-product"><b>Đã mua Đội ngũ nhân sự AI?</b><p>Đây là cùng sản phẩm và quyền học. Bạn không cần mua lại.</p></div><p className="cx-note">Học phí không bao gồm phí tài khoản công cụ hoặc dịch vụ kết nối.</p></div><form id="dang-ky" className="cx-order" onFocusCapture={()=>setFormFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setFormFocused(false);}} onSubmit={submit} aria-labelledby="cx-order-title"><p className="cx-label">{phase ? preorder?"ƯU ĐÃI RIÊNG CHO NGƯỜI ĐẶT TRƯỚC":"ĐĂNG KÝ KHÓA HỌC":"HỌC PHÍ & ĐĂNG KÝ"}</p><h3 id="cx-order-title">{preorder?"Đặt trước, tiết kiệm 200.000đ.":"Bắt đầu học Codex."}</h3>{phase ? <><div className="cx-price-comparison">{preorder && <div className="cx-official-price"><span>Giá chính thức từ 16/09/2026</span><s>{money(AGENT_KIT_OFFICIAL_PRICE_VND)}</s></div>}<div><span className="cx-price-caption">{preorder?"Giá ưu đãi dành riêng cho người đặt trước":"Giá chính thức"}</span><div className="cx-price">{money(preorder?AGENT_KIT_PREORDER_PRICE_VND:AGENT_KIT_OFFICIAL_PRICE_VND)}</div>{preorder && <p className="cx-saving">Tiết kiệm {money(AGENT_KIT_OFFICIAL_PRICE_VND-AGENT_KIT_PREORDER_PRICE_VND)} · Đặt cọc đến hết 15/09/2026</p>}</div></div><p className="cx-vat">Giá đã bao gồm VAT</p>{preorder ? <p className="cx-payment-note">Cọc <b>{money(AGENT_KIT_PREORDER_DEPOSIT_VND)}</b> hôm nay. Thanh toán <b>{money(AGENT_KIT_PREORDER_REMAINING_VND)}</b> còn lại từ 16/09/2026 để nhận đầy đủ bộ Agent và quyền học. Khoản cọc không hoàn lại.</p>:<p className="cx-payment-note">Thanh toán một lần. Sau khi thanh toán thành công, bạn nhận hướng dẫn truy cập sản phẩm qua email.</p>}</>:<p role="status">Đang cập nhật học phí…</p>}<div className="cx-fields"><label>Họ và tên<input name="studentName" autoComplete="name" maxLength={120} required /></label><label>Email nhận thông tin học<input name="email" type="email" autoComplete="email" maxLength={160} required /></label><label>Số điện thoại / Zalo<input name="phone" type="tel" autoComplete="tel" maxLength={30} required /></label></div><InvoiceRequestFields variant="light" /><p className="cx-consent">Tiếp tục đăng ký nghĩa là bạn đồng ý với <a href="/dieu-khoan-mua-hang">điều khoản mua hàng</a>, <a href="/chinh-sach-bao-mat">chính sách bảo mật</a> và <a href="/chinh-sach-giao-nhan-san-pham-so">chính sách giao nhận</a>.</p><button className="cx-btn" type="submit" disabled={busy||!phase}>{busy?"Đang tạo mã thanh toán…":!phase?"Đang cập nhật học phí…":preorder?`Đặt cọc ${money(payNow)} →`:`Đăng ký · ${money(payNow)} →`}</button><p className="cx-note">Bạn sẽ chuyển đến trang thanh toán sau bước này.</p>{message && <p role="alert" className="cx-error">{message}</p>}</form></div></section>{phase && !formVisible && !formFocused && <aside className="cx-sticky" aria-label="Đăng ký khóa Codex"><div className="cx-sticky-inner"><div className="cx-sticky-brand">CODEX <span>X10 HIỆU SUẤT CÁ NHÂN</span></div><div className="cx-sticky-price"><span>{preorder?"Ưu đãi đặt trước":"Giá chính thức"}</span><strong>{money(preorder?AGENT_KIT_PREORDER_PRICE_VND:AGENT_KIT_OFFICIAL_PRICE_VND)}</strong>{preorder && <s>{money(AGENT_KIT_OFFICIAL_PRICE_VND)}</s>}</div><a className="cx-btn" href="#dang-ky" onClick={e=>{e.preventDefault();const input=document.querySelector<HTMLInputElement>("#dang-ky input[name=studentName]");input?.focus({preventScroll:true});document.getElementById("dang-ky")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});}}>{preorder?`Giữ ưu đãi · Cọc ${money(payNow)}`:`Đăng ký ngay · ${money(payNow)}`} <span aria-hidden>↗</span></a></div></aside>}</>;
}
