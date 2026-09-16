const videos = [
  { file: "editor-ai-jun-08-2026.mp4", title: "Video AI thực hành · 08/06/2026", poster: undefined },
  { file: "editor-ai-may-21-2026.mp4", title: "Video AI thực hành · 21/05/2026", poster: undefined },
  { file: "studio-astra-creative-video.mp4", title: "GPT-6 Astra: từ câu trả lời đến công việc", poster: "studio-astra-creative-poster.jpg" },
  { file: "studio-iphone18-news-video.mp4", title: "iPhone 18 Pro: ba điểm đáng chú ý", poster: "studio-iphone18-news-poster.jpg" },
  { file: "studio-iphone-duo-data-video.mp4", title: "iPhone Duo: gập gọn, mở rộng", poster: "studio-iphone-duo-data-poster.jpg" },
  { file: "studio-astra-learn-video.mp4", title: "Giao việc cho Astra bằng brief bốn dòng", poster: "studio-astra-learn-poster.jpg" },
  { file: "studio-iphone-pixel-video.mp4", title: "iPhone 18 Pro hay Duo: chọn theo cách dùng", poster: "studio-iphone-pixel-poster.jpg" },
];
const media = "/doi-ngu-nhan-su-ai/media/proof/";

export function AgentVideoResults() {
  return <section className="cx-section cx-soft" id="thanh-qua-video" aria-labelledby="cx-video-title"><div className="cx-wrap">
    <div className="cx-intro"><p className="cx-label">THÀNH QUẢ AGENT VIDEO</p><h2 id="cx-video-title">Có video để giới thiệu sản phẩm, chia sẻ kiến thức.</h2><div className="cx-lead"><p>Xem 7 video mẫu đang được giới thiệu trong Bộ Kit Agent doanh nghiệp. Từ kịch bản, tư liệu đến dựng cảnh và phụ đề: hình dung sản phẩm bạn có thể thực hành cùng nhân viên AI Editor.</p></div></div>
    <div className="cx-agent-video-grid">{videos.map((video, index) => <article key={video.file}><div className="cx-phone-video"><video controls playsInline preload={video.poster ? "none" : "metadata"} poster={video.poster ? media + video.poster : undefined} aria-label={video.title}><source src={media + video.file} type="video/mp4" />Trình duyệt của bạn chưa hỗ trợ phát video.</video></div><p className="cx-label">VIDEO MẪU {String(index + 1).padStart(2, "0")}</p><h3>{video.title}</h3></article>)}</div>
    <p className="cx-note">Đây là các sản phẩm mẫu để tham khảo cách dựng và trình bày nội dung.</p>
    <a className="cx-text-link" href="#noi-dung">Khám phá lộ trình để bắt tay thực hành →</a>
  </div></section>;
}
