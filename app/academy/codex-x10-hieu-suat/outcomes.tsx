import Image from "next/image";
import { OutcomeMotion } from "./outcome-motion";
import "./outcome-motion.css";

export const outcomes = [
  { icon: "video", title: "Tự động hóa edit video", short: "Video", description: "Có video để bán hàng, chạy quảng cáo và xây kênh. Giao kịch bản, để nhân viên AI dựng cảnh, ghép nhạc và thêm phụ đề.", result: "Video hoàn chỉnh từ kịch bản của bạn", tags: ["Dựng cảnh", "Phụ đề", "Nhạc & giọng đọc"] },
  { icon: "web", title: "Tự động hóa làm website", short: "Website", description: "Tự làm website, landing page cho sản phẩm và dịch vụ. Chủ động đổi nội dung, thêm ưu đãi và mở trang bán hàng cho chiến dịch mới.", result: "Website, landing page theo sản phẩm của bạn", tags: ["Trang bán hàng", "Form đăng ký", "Giao diện mobile"] },
  { icon: "ads", title: "Tự động hóa lên quảng cáo", short: "Quảng cáo", description: "Từ ý tưởng đến chiến dịch quảng cáo: có nội dung, hình ảnh và cách triển khai. Bạn duyệt ngân sách, nhân viên AI xử lý phần thiết lập.", result: "Chiến dịch theo nội dung và ngân sách đã duyệt", tags: ["Nội dung ads", "Thiết lập", "Theo dõi kết quả"] },
  { icon: "research", title: "Tự động nghiên cứu thị trường", short: "Nghiên cứu", description: "Hiểu khách hàng cần gì, biết đối thủ đang bán ra sao. Có bản tổng hợp để chọn thông điệp và tìm hướng tiếp cận, bớt thời gian tìm kiếm từng nguồn.", result: "Bản nghiên cứu khách hàng, đối thủ và thị trường", tags: ["Khách hàng", "Đối thủ", "Thị trường"] },
  { icon: "social", title: "Tự động đăng bài Facebook", short: "Facebook", description: "Chuẩn bị bài và lên lịch cho cả tuần. Nhân viên AI đăng nội dung bạn đã duyệt theo lịch, giúp bạn duy trì hiện diện khi đang bận việc khác.", result: "Bài viết kèm hình ảnh, đăng theo lịch của bạn", tags: ["Viết bài", "Lên lịch", "Đăng Facebook"] },
  { icon: "finance", title: "Báo cáo tài chính tự động", short: "Tài chính", description: "Theo dõi doanh thu, chi phí và lợi nhuận trong một bản báo cáo. Bớt cộng tay từng bảng, có số liệu để cân đối ngân sách và công việc.", result: "Báo cáo thu, chi và lợi nhuận theo dữ liệu của bạn", tags: ["Doanh thu", "Chi phí", "Lợi nhuận"] },
  { icon: "mail", title: "Tự động gửi email", short: "Email", description: "Chăm sóc khách sau khi đăng ký, giới thiệu sản phẩm và nhắc ưu đãi qua email. Bạn duyệt nội dung, nhân viên AI gửi theo lịch và nhóm khách đã chọn.", result: "Chuỗi email bán hàng và chăm sóc khách theo lịch", tags: ["Viết email", "Chăm sóc khách", "Gửi theo lịch"] },
  { icon: "plan", title: "Tự động lên kế hoạch", short: "Kế hoạch", description: "Từ mục tiêu kinh doanh đến kế hoạch marketing, lịch nội dung và công việc từng tuần. Có việc cần làm, thời hạn và ngân sách để bắt tay triển khai.", result: "Bản kế hoạch kèm lịch thực hiện và ngân sách", tags: ["Marketing", "Lịch nội dung", "Công việc tuần"] },
] as const;

export function OfferIcon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    video: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4Z"/></>,
    web: <><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M2 8h20M6 5.5h.01M9 5.5h.01M6 12h5v5H6zM14 12h4M14 16h4"/></>,
    ads: <><path d="m3 10 12-5v14L3 14Zm2 5 2 6h4l-2-5M19 9l3-2M19 15l3 2M19 12h3"/></>,
    research: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 11l2-3 2 3 2-2"/></>,
    social: <><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M7 2v4M17 2v4M3 9h18M14 12h-2a1 1 0 0 0-1 1v7M9 15h5"/></>,
    finance: <><path d="M3 3v18h18M7 16v-4M12 16V8M17 16V5"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/></>,
    plan: <><rect x="4" y="4" width="16" height="18" rx="2"/><path d="M9 2h6v4H9zM8 11h2M13 11h3M8 16h2M13 16h3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7Z"/></>,
    book: <><path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-6-2-10 1Z"/></>,
  };
  return <svg className={`cx-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

export function HeroResults() {
  return <div className="cx-result-stage">
    <div className="cx-stage-top"><span><OfferIcon name="spark"/> ĐỘI NGŨ AI CỦA BẠN</span><span className="cx-stage-badge">Học bằng sản phẩm thật</span></div>
    <div className="cx-stage-browser"><div className="cx-window-bar"><span>● ● ●</span><span>Website & landing page</span><OfferIcon name="web"/></div><Image unoptimized src="/doi-ngu-nhan-su-ai/media/landing-showcase/landing-agent-kit-poster.webp" width={640} height={420} alt="Landing page Đội ngũ nhân sự AI do Thế Anh triển khai" priority/></div>
    <div className="cx-stage-bottom"><div className="cx-stage-video"><OfferIcon name="video"/><div><b>Video bán hàng</b><span>Kịch bản · Cảnh quay · Phụ đề</span></div><div className="cx-wave" aria-hidden="true">{[12,23,16,30,20,10,25,17,28,13].map((h,i)=><i key={i} style={{height:h}}/>)}</div></div><div className="cx-stage-report"><OfferIcon name="finance"/><b>Báo cáo tài chính</b><span>Doanh thu · Chi phí · Lợi nhuận</span></div></div>
    <div className="cx-stage-services">{outcomes.slice(2,5).map(x=><span key={x.icon}><OfferIcon name={x.icon}/>{x.short}</span>)}</div>
    <p className="cx-stage-caption">Từ việc đang làm mỗi ngày đến sản phẩm bạn có thể sử dụng.</p>
  </div>;
}

export function OutcomeSection() {
  return <section id="cach-lam" className="cx-section cx-outcomes"><div className="cx-wrap">
    <div className="cx-outcomes-intro"><div><p className="cx-label">HỌC XONG, BẠN LÀM ĐƯỢC GÌ?</p><h2>8 nhóm công việc.<br/><em>Giao cho đội ngũ AI.</em></h2></div><p>Tự làm video, website, quảng cáo và báo cáo bằng Codex. Bạn có thêm năng lực để nhận việc, bán hàng và chăm sóc khách mà không phải tự xử lý từng thao tác.</p></div>
    <div className="cx-motion-controls"><span>Minh họa chuyển động</span><input className="cx-motion-toggle" type="checkbox" id="cx-motion-pause"/><label htmlFor="cx-motion-pause">Tạm dừng</label></div>
    <div className="cx-outcome-grid">{outcomes.map((x,i)=><article key={x.icon} className={`cx-outcome-card cx-outcome-${x.icon}`}>
      <div className="cx-outcome-top"><span className="cx-icon-tile"><OfferIcon name={x.icon}/></span><span className="cx-outcome-number">0{i+1}</span></div>
      <OutcomeMotion kind={x.icon}/><h3>{x.title}</h3><p>{x.description}</p>
      <div className="cx-result-label"><OfferIcon name="check"/><span>{x.result}</span></div>
      <div className="cx-outcome-tags">{x.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
    </article>)}</div>
    <div className="cx-outcome-close"><span><OfferIcon name="book"/> Hơn 20 video hướng dẫn + bộ 8 Agent + hướng dẫn tạo Agent riêng</span><a className="cx-text-link" href="#hoc-phi">Xem trọn bộ quyền lợi ↗</a></div>
  </div></section>;
}
