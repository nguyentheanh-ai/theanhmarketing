import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AgentKitCalculator } from "./agent-kit-calculator";
import { AgentKitCheckoutForm } from "./agent-kit-checkout-form";

const trustItems = ["6 agent theo vai trò", "12 command gọi việc", "10+ workflow triển khai"];

const stats = [
  ["6", "Agent theo vai trò", "Growth, insight, content, ads, CRM, delivery"],
  ["12", "Command gọi việc", "/growth-system, /content-calendar, /crm-dashboard"],
  ["10+", "Workflow triển khai", "Bám hệ Attract, Grow, Scale, CRM/Data"],
  ["359K", "Private ads", "Giá riêng cho bộ kit AI Agent Business"],
];

const pains = [
  ["01", "Ngày nào cũng tự xử", "Kế hoạch, content, ads, báo cáo, checklist cứ quay lại mỗi tuần và bạn vẫn là người phải nghĩ từ đầu."],
  ["02", "Prompt rời rạc", "Mỗi lần chat lại phải nhắc lại bối cảnh, giọng viết, sản phẩm, kênh bán và tiêu chí đầu ra."],
  ["03", "Output nhanh nhưng lệch", "Không có context, SOP và checklist nên AI có thể đúng chữ nhưng sai offer, sai insight, sai mục tiêu."],
  ["04", "Dữ liệu nằm khắp nơi", "Ảnh, feedback, báo cáo, landing, file sale và CRM có sẵn nhưng chưa thành context để agent đọc."],
  ["05", "Team không biết giao việc", "Ai cũng biết dùng AI một chút, nhưng không có vai trò cố định để giao research, content, ads, CRM."],
];

const promiseCards = [
  ["Tuần đầu", "Có hệ giao việc", "Không bắt đầu từ prompt trắng. Người dùng có command, folder context và checklist để ra nháp đầu tiên."],
  ["Tháng đầu", "Giảm việc lặp", "Research, content, ads, CRM và báo cáo tuần chạy cùng một logic thay vì rời rạc từng file."],
  ["Về lâu dài", "Có tài sản dùng lại", "Kết quả tốt được lưu thành SOP, template và dữ liệu cho agent học lại ở chiến dịch sau."],
];

const mechanism = [
  ["Context Folder", "KHACH-HANG-COPY-THONG-TIN-VAO-DAY là nơi gom dữ liệu thật của doanh nghiệp."],
  ["Role Agent", "Mỗi agent có vai trò, phạm vi, đầu ra và tiêu chí kiểm tra riêng."],
  ["Slash Command", "Gọi việc bằng command tiếng Việt thay vì viết prompt lại từ đầu."],
  ["Workflow Loop", "Từ insight tới content, ads, CRM, báo cáo và cập nhật lại agent theo tuần."],
];

const comparison = [
  ["Prompt lẻ", "Nhanh lúc đầu", "Khó lặp lại, khó giao cho team, dễ lệch brand."],
  ["Thuê setup riêng", "Có thể custom sâu", "Tốn thời gian brief, chi phí cao, khó nhân bản cho nhiều việc."],
  ["AI Agent Business", "Cân bằng nhất", "Có agent, command, workflow, context folder và checklist để tự vận hành."],
];

const roadmap = [
  ["01", "Gửi 4 dòng đầu tiên", "Ngành nghề, link social, link website, link drive nếu có."],
  ["02", "Copy dữ liệu thật", "Đưa sản phẩm, offer, ảnh/video, feedback, báo cáo, CRM vào folder context."],
  ["03", "Chọn command", "Gọi /growth-system, /insight, /content-calendar, /ad-script hoặc /crm-dashboard."],
  ["04", "Agent xuất bản nháp", "Nhận kế hoạch, lịch nội dung, script, dashboard field map hoặc landing/offer brief."],
  ["05", "Kiểm tra bằng checklist", "So lại insight, offer, giọng viết, KPI và đầu ra trước khi dùng ngoài thị trường."],
  ["06", "Lưu SOP tốt", "Biến kết quả đã duyệt thành template, SOP hoặc tài liệu nội bộ cho lần sau."],
  ["07", "Lặp lại theo tuần", "Dùng báo cáo và phản hồi thị trường để cập nhật agent, content, ads và CRM."],
  ["08", "Mở rộng automation", "Khi quy trình đã đúng, mới nối landing, SePay, Telegram, webhook, dashboard."],
];

const pillars = [
  ["Agent theo vai trò", "Không hỏi AI chung chung, mỗi agent có trách nhiệm và đầu ra rõ."],
  ["Command tiếng Việt", "Giảm thời gian nghĩ prompt, giữ cùng một cách giao việc cho team."],
  ["Workflow end-to-end", "Có luồng cho growth system, content calendar, ads testing, budget KPI và CRM."],
  ["Context folder", "Agent đọc dữ liệu thật thay vì trả lời kiểu prompt pack chung chung."],
  ["Attract, Grow, Scale, CRM/Data", "Bám hệ tư duy tăng trưởng của The Anh Marketing."],
  ["Template dùng lại", "Có brief, KPI, CRM field map, course outline và content plan."],
  ["Thị trường Việt Nam", "Ngôn ngữ, ví dụ, checklist và cách triển khai hợp với SME Việt."],
  ["Không automation mù", "Luôn bắt đầu từ insight, SOP, dữ liệu và tiêu chí kiểm tra chất lượng."],
  ["Có đường nâng cấp", "Dễ mở rộng sang landing page, SePay, Telegram, webhook, delivery và dashboard."],
];

const productComponents = [
  ["Growth Strategy Agent", "Biến mục tiêu kinh doanh thành việc ưu tiên, giả thuyết test và kế hoạch 30-90 ngày.", "/growth-system", "Bản đồ hành động 30-90 ngày"],
  ["Insight Research Agent", "Đọc feedback, nội dung, đối thủ và hành vi khách để tìm thông điệp bán.", "/insight", "Insight + angle triển khai"],
  ["Content Creative Agent", "Viết bài, email, script video và lịch nội dung theo đúng offer, insight, kênh bán.", "/content-calendar", "Lịch nội dung và brief bài viết"],
  ["Performance Ads Agent", "Biến offer thành giả thuyết test, script ads và KPI cần theo dõi.", "/ad-script", "Brief ads + tiêu chí đọc số"],
  ["CRM Data Agent", "Chuẩn hóa dữ liệu khách, lead, đơn hàng và báo cáo thành dashboard field map dễ đọc.", "/crm-dashboard", "Field map + báo cáo tuần"],
  ["Automation Delivery Agent", "Chỉ nối automation khi workflow, dữ liệu và tiêu chí kiểm tra đã rõ.", "/delivery-check", "Checklist triển khai trước khi nối webhook"],
];

const useCases = [
  "Chủ SME muốn thoát cảnh tự nghĩ kế hoạch, tự viết content, tự brief ads và tự đọc báo cáo mỗi tuần.",
  "Marketer nội bộ cần sản xuất content, brief ads, báo cáo và checklist triển khai nhanh hơn.",
  "Freelancer hoặc agency nhỏ muốn chuẩn hóa quy trình làm việc cho nhiều khách hàng mà không brief lại từ đầu.",
  "Người kinh doanh tri thức muốn biến chuyên môn thành offer, nội dung, sale page và quy trình bán.",
];

const proofOutputs = [
  "Bản đồ hệ thống tăng trưởng 30-90 ngày",
  "Lịch content và brief bài viết theo insight",
  "Script ads, KPI test, quy tắc đọc số",
  "CRM field map, checklist, báo cáo tuần",
];

const faqs = [
  ["Tôi không rành AI có dùng được không?", "Có, nếu bạn làm theo command và workflow có sẵn. Bộ kit không bắt bạn tự nghĩ prompt từ đầu; việc chính là nhập dữ liệu thật, chọn đúng mục tiêu và kiểm tra output trước khi dùng."],
  ["Khác gì prompt miễn phí trên mạng?", "Prompt miễn phí thường rời rạc. Bộ kit này được đóng theo hệ thống: agent theo vai trò, command theo công việc, workflow theo tình huống và checklist kiểm tra để đưa AI vào quy trình kinh doanh cụ thể."],
  ["Tôi chưa có CRM có dùng được không?", "Có. Nếu chưa có CRM, bạn có thể bắt đầu từ Google Sheet, inbox, file bán hàng, tài liệu sản phẩm hoặc báo cáo đang có. Bộ kit giúp biến dữ liệu rời rạc thành context để agent làm việc."],
  ["Có phù hợp với ngành của tôi không?", "Phù hợp nhất với chủ doanh nghiệp, marketer, freelancer hoặc agency nhỏ có nhiều việc lặp lại: nghiên cứu, lập kế hoạch, content, ads, CRM, báo cáo, checklist và bàn giao."],
  ["Đây có phải SaaS không?", "Không. Đây là bộ agent, skill, command, workflow, template và tài liệu để chạy trong môi trường agent như Codex hoặc Claude."],
  ["Có cần nhập form dài trước khi agent làm việc không?", "Không. Lần đầu chỉ cần 4 dòng: ngành nghề, link social, link website, link drive nếu có. Sau đó copy tài liệu thật vào folder context."],
  ["Có cam kết doanh thu không?", "Không cam kết doanh thu. Bộ kit giúp chuẩn hóa nghiên cứu, lập kế hoạch, sản xuất, đo lường và tối ưu. Kết quả phụ thuộc offer, thị trường, traffic, đội ngũ và cách triển khai."],
  ["Sau khi thanh toán nhận gì?", "Bạn nhận hướng dẫn và quyền truy cập bộ AI Growth Kit gồm agents, skills, commands, workflows, templates, references, brand guide và folder để copy dữ liệu doanh nghiệp."],
];

const offerChecklist = [
  "6 AI Agent theo vai trò: Growth, Insight, Content, Ads, CRM, Delivery",
  "12 command gọi việc để không phải viết prompt từ đầu",
  "10+ workflow cho research, content, ads, CRM, checklist và báo cáo",
  "Template brief, KPI, CRM field map, content calendar và offer checklist",
  "Folder context để copy dữ liệu doanh nghiệp vào cho agent đọc",
  "Hướng dẫn triển khai theo từng bước cho chủ doanh nghiệp nhỏ",
];

export const metadata: Metadata = {
  title: "AI Agent Business | Bộ Kit AI Agent cho chủ doanh nghiệp",
  description:
    "Landing private cho Bộ Kit AI Agent Business: hệ agent, command, workflow và context folder giúp chủ doanh nghiệp thoát khỏi vòng lặp công việc bằng AI Agent.",
  robots: {
    index: false,
    follow: false,
  },
};

function SectionHeader({ tag, title, body }: { tag: string; title: string; body?: string }) {
  return (
    <div className="section-header reveal">
      <span className="section-tag">{tag}</span>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function MiniIcon({ children }: { children: string }) {
  return <span className="mini-icon">{children}</span>;
}

function RadarChart() {
  return (
    <div className="radar-chart" aria-label="Radar chart so sánh 3 cách triển khai AI Agent">
      <svg viewBox="0 0 360 360" role="img">
        <polygon className="radar-ring" points="180,36 317,136 264,298 96,298 43,136" />
        <polygon className="radar-ring" points="180,76 279,148 241,266 119,266 81,148" />
        <polygon className="radar-ring" points="180,116 240,160 217,232 143,232 120,160" />
        <line className="radar-axis" x1="180" y1="180" x2="180" y2="36" />
        <line className="radar-axis" x1="180" y1="180" x2="317" y2="136" />
        <line className="radar-axis" x1="180" y1="180" x2="264" y2="298" />
        <line className="radar-axis" x1="180" y1="180" x2="96" y2="298" />
        <line className="radar-axis" x1="180" y1="180" x2="43" y2="136" />
        <polygon className="radar-poly agency" points="180,84 235,162 226,246 134,244 96,153" />
        <polygon className="radar-poly prompt" points="180,126 218,168 202,226 146,219 123,159" />
        <polygon className="radar-poly kit" points="180,54 292,144 248,276 109,279 67,144" />
        <text x="180" y="22">Tốc độ</text>
        <text x="300" y="124">Chi phí</text>
        <text x="252" y="326">Dễ lặp</text>
        <text x="54" y="326">CRM</text>
        <text x="8" y="124">Đo lường</text>
      </svg>
    </div>
  );
}

export default function AgentKitLandingPage() {
  return (
    <main className="noti-agent-page">
      <style>{`
        :root {
          --primary: #0061ff;
          --secondary: #00c2ff;
          --gradient: linear-gradient(135deg, #0061ff 0%, #00c2ff 100%);
          --gradient-soft: linear-gradient(135deg, rgba(0,97,255,.08), rgba(0,194,255,.08));
          --gradient-medium: linear-gradient(135deg, rgba(0,97,255,.15), rgba(0,194,255,.15));
          --orange: #f97316;
          --danger: #ef4444;
          --success: #22c55e;
          --ink: #0f172a;
          --muted: #475569;
          --soft: #64748b;
          --line: rgba(15,23,42,.08);
          --glass: rgba(255,255,255,.72);
          --shadow: 0 18px 60px rgba(0,97,255,.12);
          --shadow-sm: 0 8px 28px rgba(0,97,255,.08);
          --radius: 24px;
        }

        html { scroll-behavior: smooth; }
        .noti-agent-page {
          background:
            radial-gradient(circle at 88% 4%, rgba(0,97,255,.26), transparent 28rem),
            radial-gradient(circle at 6% 45%, rgba(0,194,255,.2), transparent 24rem),
            #ffffff;
          color: var(--ink);
          min-height: 100vh;
          overflow-x: hidden;
        }
        .noti-agent-page a { text-decoration: none; }
        .bg-decoration { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .bg-blob { position: absolute; border-radius: 999px; filter: blur(84px); opacity: .34; animation: blobFloat 20s ease-in-out infinite; }
        .bg-blob.one { width: 620px; height: 620px; background: #0061ff; right: -210px; top: -190px; }
        .bg-blob.two { width: 520px; height: 520px; background: #00c2ff; left: -170px; top: 48%; animation-delay: -7s; }
        .bg-blob.three { width: 360px; height: 360px; background: linear-gradient(135deg,#0061ff,#00c2ff); right: 18%; bottom: 4%; animation-delay: -13s; opacity: .18; }
        @keyframes blobFloat { 0%,100% { transform: translate(0,0) scale(1); } 25% { transform: translate(30px,-30px) scale(1.05); } 50% { transform: translate(-18px,24px) scale(.96); } 75% { transform: translate(-30px,-14px) scale(1.02); } }

        .site-header {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 50;
          padding: 14px 24px;
          background: rgba(255,255,255,.78);
          backdrop-filter: blur(24px) saturate(1.6);
          border-bottom: 1px solid rgba(15,23,42,.06);
        }
        .nav-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .brand { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 900; }
        .brand-mark { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 14px; background: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.12); overflow: hidden; border: 1px solid rgba(15,23,42,.06); }
        .brand-mark img { width: 100%; height: 100%; object-fit: contain; }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-links a { color: var(--muted); font-size: 14px; font-weight: 800; padding: 10px 13px; border-radius: 999px; transition: .25s ease; }
        .nav-links a:hover { color: var(--primary); background: var(--gradient-soft); }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .moon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 999px; background: white; box-shadow: var(--shadow-sm); color: var(--primary); font-weight: 900; }
        .btn-primary, .btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 24px; border-radius: 999px; font-weight: 900; transition: .28s ease; }
        .btn-primary { background: var(--gradient); color: #fff; box-shadow: 0 10px 26px rgba(0,97,255,.28); }
        .btn-primary:hover, .btn-ghost:hover { transform: translateY(-2px); }
        .btn-ghost { background: rgba(255,255,255,.78); color: var(--ink); box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,.7); }

        .hero {
          position: relative;
          z-index: 1;
          padding: 122px 20px 46px;
          overflow: hidden;
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(0,97,255,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,97,255,.045) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 28%, transparent 75%);
          animation: gridPulse 8s ease-in-out infinite;
        }
        @keyframes gridPulse { 0%,100% { opacity:.58; } 50% { opacity:1; } }
        .hero-container { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; text-align: center; }
        .section-tag, .hero-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          max-width: 100%;
          border-radius: 999px;
          background: var(--gradient-soft);
          color: var(--primary);
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
        }
        .hero h1 {
          margin: 22px auto 22px;
          max-width: 980px;
          font-size: clamp(2.55rem, 6vw, 5.25rem);
          line-height: 1.06;
          letter-spacing: -.045em;
          font-weight: 950;
        }
        .gradient-text { background: var(--gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .orange-text { color: var(--orange); }
        .hero-desc { max-width: 800px; margin: 0 auto; color: var(--muted); font-size: clamp(1rem, 2vw, 1.18rem); line-height: 1.75; font-weight: 650; }
        .hero-cta { margin-top: 28px; display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .hero-trust { margin-top: 24px; display: flex; justify-content: center; flex-wrap: wrap; gap: 22px; color: var(--soft); font-size: 14px; font-weight: 700; }
        .trust-dot { color: var(--success); margin-right: 6px; }
        .hero-video-wrap { max-width: 960px; margin: 54px auto 0; text-align: left; }
        .hero-video-note {
          display: flex;
          align-items: center;
          gap: 16px;
          border-radius: 22px;
          padding: 18px 24px;
          background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(239,68,68,.13));
          box-shadow: 0 18px 54px rgba(245,158,11,.2), inset 0 1px 0 rgba(255,255,255,.72);
          animation: notePulse 2.4s ease-in-out infinite;
        }
        @keyframes notePulse { 0%,100% { box-shadow: 0 18px 54px rgba(245,158,11,.2), inset 0 1px 0 rgba(255,255,255,.72); } 50% { box-shadow: 0 22px 68px rgba(239,68,68,.28), inset 0 1px 0 rgba(255,255,255,.72); } }
        .alert-icon { display: grid; place-items: center; flex: 0 0 auto; width: 52px; height: 52px; border-radius: 999px; color: white; background: linear-gradient(135deg,#f59e0b,#ef4444); box-shadow: 0 12px 28px rgba(239,68,68,.3); animation: noteIconShake 2.4s ease-in-out infinite; }
        @keyframes noteIconShake { 0%,100% { transform: rotate(0deg) scale(1); } 12% { transform: rotate(-8deg) scale(1.08); } 24% { transform: rotate(8deg) scale(1.08); } 36% { transform: rotate(0deg) scale(1); } }
        .note-badge { display: inline-flex; border-radius: 999px; padding: 4px 12px; background: linear-gradient(135deg,#dc2626,#f59e0b); color: white; font-size: 11px; font-weight: 950; letter-spacing: .1em; text-transform: uppercase; }
        .hero-video-note p { margin: 8px 0 0; color: var(--ink); font-weight: 700; line-height: 1.55; }
        .hero-video-note .alert { color: var(--danger); font-weight: 950; }
        .hero-video-card {
          margin-top: 18px;
          border-radius: 28px;
          padding: 12px;
          background: rgba(255,255,255,.78);
          box-shadow: 0 32px 90px rgba(0,97,255,.18), inset 0 1px 0 rgba(255,255,255,.7);
        }
        .video-frame {
          position: relative;
          min-height: 510px;
          overflow: hidden;
          border-radius: 20px;
          background: #020617;
          color: white;
        }
        .demo-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,.1); }
        .dots { display: flex; gap: 8px; }
        .dots span { width: 12px; height: 12px; border-radius: 999px; }
        .demo-grid { display: grid; grid-template-columns: .72fr 1.28fr; gap: 18px; padding: 24px; }
        .demo-panel, .demo-output { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.045); border-radius: 24px; padding: 18px; }
        .command-chip { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); border-radius: 18px; padding: 16px; margin-top: 12px; animation: nodePulse 2.8s ease-in-out infinite; }
        .command-chip code { color: #8ee3ef; font-weight: 900; }
        .output-stage { position: relative; min-height: 386px; background: radial-gradient(circle at 26% 10%, rgba(0,194,255,.18), transparent 30%), radial-gradient(circle at 78% 74%, rgba(0,97,255,.18), transparent 34%); }
        .orbit-ring { position: absolute; inset: 44px; border: 1px dashed rgba(142,227,239,.28); border-radius: 999px; animation: rotateRing 15s linear infinite; }
        .orbit-dot { position: absolute; top: 58px; left: 50%; width: 14px; height: 14px; border-radius: 999px; background: var(--orange); box-shadow: 0 0 30px rgba(249,115,22,.85); transform-origin: 0 145px; animation: orbit 7s linear infinite; }
        .output-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
        .output-card { border: 1px solid rgba(255,255,255,.12); border-radius: 18px; padding: 16px; background: rgba(2,6,23,.66); }
        .output-card span { color: #8ee3ef; font-size: 12px; font-weight: 950; }
        .output-card p { margin: 8px 0 0; font-size: 14px; line-height: 1.5; font-weight: 800; }
        @keyframes rotateRing { to { transform: rotate(360deg); } }
        @keyframes orbit { to { transform: rotate(360deg); } }
        @keyframes nodePulse { 0%,100% { transform: translateY(0); border-color: rgba(255,255,255,.12); } 50% { transform: translateY(-3px); border-color: rgba(0,194,255,.4); } }

        .section { position: relative; z-index: 1; padding: 94px 20px; }
        .section-soft { background: linear-gradient(180deg, rgba(248,250,252,.82), rgba(239,246,255,.72)); }
        .section-blue { background: linear-gradient(135deg, rgba(0,194,255,.12), rgba(0,97,255,.08)); }
        .section-warm { background: linear-gradient(135deg, rgba(255,247,237,.92), rgba(239,246,255,.8)); }
        .section-dark { background: linear-gradient(135deg, #07101f, #0f172a); color: white; }
        .section-inner { max-width: 1120px; margin: 0 auto; }
        .section-header { max-width: 790px; margin: 0 auto 54px; text-align: center; }
        .section-header h2 { margin: 18px 0 0; font-size: clamp(2.15rem, 4.5vw, 3.35rem); line-height: 1.14; letter-spacing: -.035em; font-weight: 950; color: var(--ink); }
        .section-dark .section-header h2 { color: white; }
        .section-header p { color: var(--muted); font-size: 1.08rem; line-height: 1.7; }
        .section-dark .section-header p { color: rgba(255,255,255,.66); }
        .glass { background: var(--glass); backdrop-filter: blur(20px) saturate(1.8); border: 1px solid rgba(255,255,255,.7); border-radius: var(--radius); box-shadow: var(--shadow), inset 0 1px 0 rgba(255,255,255,.7); }
        .reveal { animation: revealUp .72s ease both; }
        @keyframes revealUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .mini-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 999px; background: var(--gradient); color: white; font-weight: 950; box-shadow: 0 10px 24px rgba(0,97,255,.24); }

        .prereq-wrap { display: flex; gap: 24px; align-items: flex-start; padding: 34px; background: linear-gradient(135deg, rgba(245,158,11,.13), rgba(239,68,68,.08)); border-radius: 30px; box-shadow: 0 16px 50px rgba(245,158,11,.16), inset 0 1px 0 rgba(255,255,255,.78); }
        .prereq-wrap h2 { margin: 10px 0 12px; font-size: clamp(1.8rem, 3vw, 2.5rem); line-height: 1.12; letter-spacing: -.025em; }
        .prereq-tag { display: inline-flex; border-radius: 999px; padding: 6px 13px; background: rgba(239,68,68,.12); color: #dc2626; font-size: 12px; font-weight: 950; letter-spacing: .1em; text-transform: uppercase; }
        .prereq-wrap p { color: var(--muted); line-height: 1.7; font-weight: 650; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 22px; margin-top: 44px; text-align: center; }
        .stat-number { font-size: clamp(2.2rem, 4vw, 3.5rem); color: var(--primary); font-weight: 950; letter-spacing: -.06em; line-height: 1; }
        .stat-card p { color: var(--muted); margin: 8px 0 0; font-size: 14px; line-height: 1.5; }

        .pain-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 18px; }
        .pain-card { position: relative; padding: 30px 20px 24px; transition: .28s ease; }
        .pain-card:hover { transform: translateY(-5px); box-shadow: 0 26px 70px rgba(0,97,255,.16), inset 0 1px 0 rgba(255,255,255,.7); }
        .pain-card h3 { margin: 18px 0 10px; font-size: 1.08rem; line-height: 1.25; }
        .pain-card p { color: var(--muted); font-size: 14px; line-height: 1.65; }
        .closing-line { max-width: 760px; margin: 42px auto 0; text-align: center; color: var(--ink); font-size: 1.18rem; line-height: 1.65; font-weight: 850; }

        .promise-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 22px; }
        .promise-card { padding: 30px; text-align: center; }
        .promise-card strong { display: block; font-size: 1.7rem; line-height: 1.1; margin: 9px 0 14px; background: var(--gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .promise-card span { color: var(--soft); font-size: 12px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
        .promise-card p { color: var(--muted); line-height: 1.65; }

        .radar-wrap { display: grid; grid-template-columns: 1.05fr .95fr; gap: 42px; align-items: center; padding: 38px; }
        .radar-chart svg { width: 100%; max-width: 430px; display: block; margin: 0 auto; overflow: visible; }
        .radar-ring { fill: none; stroke: rgba(15,23,42,.12); stroke-width: 1.5; }
        .radar-axis { stroke: rgba(15,23,42,.1); stroke-width: 1.5; }
        .radar-poly { stroke-width: 3; fill-opacity: .18; animation: radarGlow 3.2s ease-in-out infinite; }
        .radar-poly.agency { fill: #94a3b8; stroke: #64748b; }
        .radar-poly.prompt { fill: #f97316; stroke: #f97316; }
        .radar-poly.kit { fill: #0061ff; stroke: #0061ff; fill-opacity: .24; }
        .radar-chart text { fill: var(--muted); font-size: 13px; font-weight: 900; text-anchor: middle; }
        @keyframes radarGlow { 0%,100% { filter: drop-shadow(0 0 0 rgba(0,97,255,0)); } 50% { filter: drop-shadow(0 0 10px rgba(0,97,255,.26)); } }
        .compare-list { display: grid; gap: 13px; }
        .compare-row { padding: 18px; border-radius: 18px; background: rgba(255,255,255,.68); border: 1px solid rgba(15,23,42,.06); }
        .compare-row h3 { margin: 0; font-size: 1.25rem; }
        .compare-row p { margin: 6px 0 0; color: var(--muted); line-height: 1.55; }

        .calculator-wrap { display: grid; grid-template-columns: .92fr 1.08fr; gap: 34px; align-items: center; }
        .calc-results { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
        .calc-card { padding: 24px; text-align: center; }
        .calc-card strong { display: block; font-size: 4rem; line-height: 1; letter-spacing: -.07em; color: var(--primary); }
        .calc-card p { color: var(--muted); font-weight: 750; }
        .calc-note { margin-top: 18px; color: var(--muted); font-size: 14px; line-height: 1.6; }
        .calculator-control { display: grid; gap: 16px; margin-top: 30px; }
        .calculator-control > span:first-child { display: flex; align-items: center; justify-content: space-between; gap: 14px; color: var(--muted); font-weight: 900; }
        .calculator-control strong { color: var(--primary); font-size: 1.8rem; letter-spacing: -.04em; white-space: nowrap; }
        .calculator-range { width: 100%; height: 12px; border-radius: 999px; outline: none; appearance: none; -webkit-appearance: none; box-shadow: inset 0 1px 2px rgba(15,23,42,.08); cursor: pointer; }
        .calculator-range::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 34px; height: 34px; border-radius: 999px; background: white; border: 8px solid var(--primary); box-shadow: 0 10px 24px rgba(0,97,255,.24); transition: transform .2s ease, box-shadow .2s ease; }
        .calculator-range::-webkit-slider-thumb:hover { transform: scale(1.08); box-shadow: 0 12px 30px rgba(0,97,255,.34); }
        .calculator-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 999px; background: white; border: 8px solid var(--primary); box-shadow: 0 10px 24px rgba(0,97,255,.24); cursor: pointer; }
        .range-scale { display: flex; justify-content: space-between; color: var(--soft); font-size: 12px; font-weight: 850; }
        .calc-live-panel { position: relative; overflow: hidden; }
        .calc-live-panel::before { content: ""; position: absolute; inset: -40% auto auto -25%; width: 360px; height: 360px; border-radius: 999px; background: rgba(0,194,255,.12); filter: blur(34px); pointer-events: none; }
        .calc-live-panel > * { position: relative; z-index: 1; }
        .calc-label { display: inline-flex; justify-content: center; border-radius: 999px; background: var(--gradient-soft); color: var(--primary); padding: 5px 10px; font-size: 12px; font-weight: 950; margin-bottom: 12px; }
        .calc-card-primary { background: linear-gradient(135deg, rgba(0,97,255,.12), rgba(0,194,255,.1)) !important; }
        .calc-meta-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; margin-top: 14px; }
        .calc-meta-grid div { border-radius: 18px; background: rgba(248,250,252,.88); border: 1px solid rgba(15,23,42,.06); padding: 16px; }
        .calc-meta-grid span { display: block; color: var(--primary); font-size: 2rem; font-weight: 950; letter-spacing: -.05em; line-height: 1; }
        .calc-meta-grid p { margin: 8px 0 0; color: var(--muted); font-size: 13px; line-height: 1.45; font-weight: 750; }

        .roadmap-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }
        .roadmap-card { position: relative; padding: 26px; overflow: hidden; }
        .roadmap-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--gradient); opacity: .8; }
        .roadmap-card span { color: var(--primary); font-size: 13px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
        .roadmap-card h3 { margin: 12px 0 10px; font-size: 1.2rem; }
        .roadmap-card p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.6; }

        .pillar-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; }
        .pillar-card { padding: 24px; }
        .pillar-card span { color: var(--primary); font-size: 12px; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
        .pillar-card h3 { margin: 12px 0 10px; }
        .pillar-card p { color: var(--muted); line-height: 1.65; font-size: 14px; }

        .library-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 18px; }
        .library-card { padding: 24px; min-height: 190px; transition: .28s ease; }
        .library-card:hover { transform: translateY(-5px); }
        .library-card .tag { display: inline-flex; border-radius: 999px; background: var(--gradient-soft); color: var(--primary); padding: 5px 10px; font-size: 12px; font-weight: 950; }
        .library-card h3 { margin: 18px 0 10px; font-size: 1.35rem; }
        .library-card p { color: var(--muted); font-size: 14px; line-height: 1.6; }
        .component-card { display: grid; grid-template-rows: auto auto 1fr auto auto; gap: 10px; min-height: 270px; }
        .component-command, .component-output { border-radius: 14px; padding: 10px 12px; font-size: 13px; line-height: 1.45; font-weight: 850; }
        .component-command { background: #020617; color: #8ee3ef; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
        .component-output { background: var(--gradient-soft); color: var(--primary); }
        .usecase-grid { margin-top: 20px; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
        .usecase-card { padding: 22px; font-weight: 750; line-height: 1.65; color: var(--muted); }

        .tech-wrap { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px; }
        .tech-card { padding: 28px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: 24px; }
        .tech-card h3 { margin: 0 0 16px; font-size: 1.45rem; }
        .tech-card li { margin: 11px 0; color: rgba(255,255,255,.68); line-height: 1.55; }
        .tech-card li::marker { color: #8ee3ef; }

        .proof-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 18px; }
        .proof-card { padding: 24px; }
        .proof-card span { color: var(--orange); font-size: 13px; font-weight: 950; }
        .proof-card p { color: var(--muted); line-height: 1.65; font-weight: 750; }
        .review-placeholder { margin-top: 24px; padding: 28px; background: linear-gradient(135deg, rgba(34,197,94,.1), rgba(0,194,255,.1)); border-radius: 26px; color: var(--muted); line-height: 1.7; font-weight: 700; }

        .price-layout { display: grid; grid-template-columns: .92fr 1.08fr; gap: 34px; align-items: start; }
        .price-timeline { display: grid; gap: 14px; margin-top: 30px; }
        .price-stage { display: grid; grid-template-columns: .5fr .5fr 1fr; gap: 18px; align-items: center; padding: 18px; border-radius: 20px; background: rgba(255,255,255,.74); border: 1px solid rgba(15,23,42,.06); }
        .price-stage.active { background: var(--gradient); color: white; box-shadow: 0 20px 60px rgba(0,97,255,.24); animation: pricePulse 2.6s ease-in-out infinite; }
        .price-stage strong { font-size: 1.85rem; letter-spacing: -.04em; }
        .price-stage p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.55; }
        .price-stage.active p { color: rgba(255,255,255,.78); }
        @keyframes pricePulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .offer-checklist { display: grid; gap: 12px; margin: 28px 0 0; padding: 0; list-style: none; }
        .offer-checklist li { display: flex; gap: 10px; align-items: flex-start; color: var(--muted); font-weight: 750; line-height: 1.55; }
        .offer-checklist li::before { content: "✓"; display: grid; place-items: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 999px; background: var(--gradient); color: #fff; font-size: 13px; font-weight: 950; }

        .faq-list { display: grid; gap: 15px; max-width: 920px; margin: 0 auto; }
        details { padding: 24px; }
        summary { list-style: none; cursor: pointer; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; font-weight: 900; }
        summary::-webkit-details-marker { display: none; }
        details p { color: var(--muted); line-height: 1.7; margin: 16px 0 0; }
        .plus { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; border-radius: 999px; background: var(--gradient-soft); color: var(--primary); transition: .25s; }
        details[open] .plus { transform: rotate(45deg); }

        .final-cta { padding: 0 20px 132px; position: relative; z-index: 1; }
        .final-card { max-width: 1120px; margin: 0 auto; text-align: center; padding: 56px 32px; border-radius: 34px; background: radial-gradient(circle at 20% 20%, rgba(0,194,255,.22), transparent 32%), radial-gradient(circle at 82% 64%, rgba(0,97,255,.22), transparent 34%), #0f172a; color: white; box-shadow: 0 30px 100px rgba(15,23,42,.25); overflow: hidden; }
        .final-card h2 { margin: 16px auto 0; max-width: 850px; font-size: clamp(2rem, 4.5vw, 4rem); line-height: 1.08; letter-spacing: -.04em; }
        .final-card p { max-width: 720px; margin: 20px auto 0; color: rgba(255,255,255,.7); line-height: 1.7; font-weight: 650; }
        .sticky-bar { position: fixed; inset: auto 0 0 0; z-index: 60; padding: 12px 20px; background: rgba(255,255,255,.82); backdrop-filter: blur(24px) saturate(1.6); border-top: 1px solid rgba(15,23,42,.08); }
        .sticky-inner { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .sticky-inner p { margin: 0; color: var(--muted); font-size: 14px; font-weight: 800; }
        .sticky-inner strong { color: var(--ink); }

        .noti-agent-page form {
          background: rgba(255,255,255,.82) !important;
          color: var(--ink) !important;
          border: 1px solid rgba(255,255,255,.78) !important;
          box-shadow: 0 24px 80px rgba(0,97,255,.16), inset 0 1px 0 rgba(255,255,255,.8) !important;
          backdrop-filter: blur(22px) saturate(1.6);
        }
        .noti-agent-page form p,
        .noti-agent-page form label { color: var(--muted) !important; }
        .noti-agent-page form h2,
        .noti-agent-page form strong { color: var(--ink) !important; }
        .noti-agent-page form input {
          background: rgba(248,250,252,.9) !important;
          border-color: rgba(15,23,42,.1) !important;
          color: var(--ink) !important;
        }
        .noti-agent-page form button[type="submit"] {
          background: var(--gradient) !important;
          color: white !important;
          box-shadow: 0 12px 30px rgba(0,97,255,.28) !important;
        }

        @media (max-width: 1023px) {
          .nav-links, .moon { display: none; }
          .hero h1 { font-size: clamp(2.25rem, 10vw, 4rem); }
          .demo-grid, .radar-wrap, .calculator-wrap, .price-layout, .tech-wrap { grid-template-columns: 1fr; }
          .stats-grid, .pain-grid, .roadmap-grid, .library-grid, .proof-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .pillar-grid, .promise-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .site-header { padding: 10px 14px; }
          .brand span:last-child { max-width: 164px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .btn-primary, .btn-ghost { width: 100%; }
          .header-actions .btn-primary { width: auto; min-height: 42px; padding: 0 16px; }
          .hero { padding-top: 98px; }
          .hero-cta { flex-direction: column; }
          .hero-video-note, .prereq-wrap { align-items: flex-start; flex-direction: column; padding: 20px; }
          .video-frame { min-height: 620px; }
          .output-grid, .stats-grid, .pain-grid, .roadmap-grid, .library-grid, .usecase-grid, .proof-grid, .calc-results, .calc-meta-grid { grid-template-columns: 1fr; }
          .calculator-control > span:first-child { align-items: flex-start; flex-direction: column; }
          .price-stage { grid-template-columns: 1fr; }
          .sticky-inner > div { display: none; }
          .sticky-inner .btn-primary { width: 100%; }
        }
      `}</style>

      <div className="bg-decoration" aria-hidden="true">
        <span className="bg-blob one" />
        <span className="bg-blob two" />
        <span className="bg-blob three" />
      </div>

      <header className="site-header">
        <div className="nav-inner">
          <Link href="#top" className="brand">
            <span className="brand-mark">
              <Image src="/brand/ta-mark.svg" alt="The Anh Marketing" width={42} height={42} priority />
            </span>
            <span>AI Agent Business</span>
          </Link>
          <nav className="nav-links">
            <Link href="#why">Vì sao chọn</Link>
            <Link href="#mechanism">Tính năng</Link>
            <Link href="#templates">Template</Link>
            <Link href="#usecase">Use case</Link>
            <Link href="#offer">Báo giá</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <div className="header-actions">
            <span className="moon">◐</span>
            <Link className="btn-primary" href="#dang-ky">Đăng ký ngay</Link>
          </div>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-grid" />
        <div className="hero-container">
          <span className="hero-badge reveal">AI Agent thoát việc lặp</span>
          <h1 className="reveal">
            Thoát khỏi <span className="gradient-text">vòng lặp công việc</span> bằng <span className="orange-text">AI Agent</span>.
          </h1>
          <p className="hero-desc reveal">
            Bộ kit giúp chủ doanh nghiệp có sẵn agent, command và workflow để giao việc cho AI: nghiên cứu, content, ads, CRM, báo cáo và checklist mà không làm lại từ đầu mỗi ngày.
          </p>
          <div className="hero-cta reveal">
            <Link href="#dang-ky" className="btn-primary">Nhận kit 359K →</Link>
            <Link href="#templates" className="btn-ghost">Xem demo workflow</Link>
          </div>
          <div className="hero-trust reveal">
            {trustItems.map((item) => (
              <span key={item}><span className="trust-dot">✓</span>{item}</span>
            ))}
          </div>

          <div className="hero-video-wrap reveal">
            <div className="hero-video-note">
              <span className="alert-icon">!</span>
              <div>
                <span className="note-badge">Lưu ý quan trọng - đọc trước khi xem</span>
                <p>
                  Đây là bộ kit dành cho người muốn dùng AI Agent như một hệ vận hành thật: có dữ liệu, có workflow, có checklist và có đầu ra để kiểm tra. <span className="alert">Không phải prompt pack.</span>
                </p>
              </div>
            </div>
            <div className="hero-video-card">
              <div className="video-frame">
                <div className="demo-topbar">
                  <div className="dots"><span style={{ background: "#ff5f57" }} /><span style={{ background: "#ffbd2e" }} /><span style={{ background: "#28c840" }} /></div>
                  <strong>AI Agent Business workspace</strong>
                </div>
                <div className="demo-grid">
                  <div className="demo-panel">
                    <p className="section-tag">Command panel</p>
                    {["/growth-system", "/content-calendar", "/crm-dashboard"].map((command) => (
                      <div className="command-chip" key={command}>
                        <code>{command}</code>
                        <p>Gọi việc có cấu trúc, không chat tùy hứng.</p>
                      </div>
                    ))}
                  </div>
                  <div className="demo-output output-stage">
                    <div className="orbit-ring" />
                    <div className="orbit-dot" />
                    <div className="output-grid">
                      {proofOutputs.map((item, index) => (
                        <div className="output-card" key={item}>
                          <span>Output {String(index + 1).padStart(2, "0")}</span>
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                    <div className="output-card" style={{ marginTop: 16, position: "relative", zIndex: 2 }}>
                      <span>Demo logic</span>
                      <p>Copy dữ liệu thật vào folder, chọn command, agent xuất bản nháp, sau đó kiểm tra bằng checklist.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-warm">
        <div className="section-inner">
          <div className="prereq-wrap reveal">
            <MiniIcon>!</MiniIcon>
            <div>
              <span className="prereq-tag">Yêu cầu tiên quyết - đọc kỹ trước khi đăng ký</span>
              <h2>Bộ kit này chỉ phù hợp với người đã muốn vận hành AI nghiêm túc</h2>
              <p>
                Đây không phải SaaS tự chạy, không phải prompt pack để copy một lần rồi xong. Bạn cần biết mở workspace trong Codex hoặc Claude, copy dữ liệu doanh nghiệp vào đúng folder và kiểm tra đầu ra trước khi dùng cho khách hàng.
              </p>
            </div>
          </div>
          <div className="stats-grid">
            {stats.map(([value, label, body]) => (
              <div className="stat-card reveal" key={label}>
                <div className="stat-number">{value}</div>
                <strong>{label}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="section">
        <div className="section-inner">
          <SectionHeader
            tag="Sự thật khó nghe"
            title="Bạn không thiếu AI. Bạn thiếu hệ giao việc để thoát vòng lặp công việc."
            body="5 tình huống dưới đây là lý do AI có thể giúp bạn nhanh hơn, nhưng chưa giảm tải thật nếu mọi việc vẫn phải bắt đầu lại từ đầu."
          />
          <div className="pain-grid">
            {pains.map(([number, title, body]) => (
              <article className="pain-card glass reveal" key={title}>
                <MiniIcon>{number}</MiniIcon>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <p className="closing-line">Bạn không cần thêm một prompt nữa. Bạn cần một hệ biết giao việc, nhận output, kiểm tra và lưu lại thành tài sản dùng tiếp.</p>
        </div>
      </section>

      <section className="section section-blue">
        <div className="section-inner">
          <SectionHeader
            tag="Lời hứa của bộ kit"
            title="Không cần thêm nhân sự. Cần một hệ AI biết nhận việc, tạo output và lưu lại SOP."
            body="Không hứa làm thay toàn bộ doanh nghiệp. Bộ kit giúp có khung giao việc, folder context, command, workflow và checklist để triển khai đều hơn."
          />
          <div className="promise-grid">
            {promiseCards.map(([label, title, body]) => (
              <div className="promise-card glass reveal" key={title}>
                <span>{label}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mechanism" className="section section-soft">
        <div className="section-inner">
          <SectionHeader
            tag="Cơ chế khác biệt"
            title="Retention Agent Loop: dữ liệu thật, vai trò rõ, command nhanh, checklist kiểm tra."
            body="Phần này giải thích vì sao bộ kit hoạt động khác cách dùng prompt rời rạc: agent đọc đúng dữ liệu, làm đúng vai trò và trả về đầu ra có thể kiểm tra."
          />
          <div className="library-grid">
            {mechanism.map(([title, body], index) => (
              <div className="library-card glass reveal" key={title}>
                <span className="tag">Module {String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="compare" className="section">
        <div className="section-inner">
          <SectionHeader
            tag="So sánh trực quan"
            title="Bộ kit này không phải giải pháp duy nhất, nhưng là cách cân bằng nhất."
            body="Radar chart giúp người mua thấy vì sao offer nằm ở điểm cân bằng giữa tốc độ, chi phí, khả năng lặp lại, CRM và đo lường."
          />
          <div className="radar-wrap glass reveal">
            <RadarChart />
            <div className="compare-list">
              {comparison.map(([title, label, body], index) => (
                <div className="compare-row" key={title}>
                  <h3>{title} <span className={index === 2 ? "gradient-text" : ""}>- {label}</span></h3>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-warm">
        <AgentKitCalculator />
      </section>

      <section id="roadmap" className="section section-soft">
        <div className="section-inner">
          <SectionHeader tag="Quy trình 8 bước, không giấu gì" title="Từ dữ liệu thật tới đầu ra dùng được mất bao lâu?" />
          <div className="roadmap-grid">
            {roadmap.map(([step, title, body]) => (
              <div className="roadmap-card glass reveal" key={step}>
                <span>Bước {step}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <SectionHeader tag="9 trụ cột khác biệt" title="Vì sao bộ kit này hợp với chủ doanh nghiệp muốn vận hành AI nghiêm túc." />
          <div className="pillar-grid">
            {pillars.map(([title, body], index) => (
              <div className="pillar-card glass reveal" key={title}>
                <span>Trụ cột {String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="section section-blue">
        <div className="section-inner">
          <SectionHeader
            tag="Xem trước bộ kit"
            title="Mỗi thành phần đều có việc cần làm, command mẫu và output nhận được."
            body="Phần này giúp bạn thấy rõ mua xong nhận gì, dùng như thế nào và đầu ra cụ thể ra sao."
          />
          <div className="library-grid">
            {productComponents.map(([title, job, command, output]) => (
              <div className="library-card component-card glass reveal" key={title}>
                <span className="tag">agent</span>
                <h3>{title}</h3>
                <p>{job}</p>
                <code className="component-command">{command}</code>
                <span className="component-output">Output: {output}</span>
              </div>
            ))}
          </div>
          <div id="usecase" className="usecase-grid">
            {useCases.map((item) => (
              <div className="usecase-card glass reveal" key={item}>{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="section-inner">
          <SectionHeader
            tag="Kỹ thuật bên trong"
            title="Cách bộ kit xử lý context, workflow và checklist từng bước một."
            body="Không chỉ nói về prompt. Bộ kit cần có cách gom dữ liệu, gọi đúng agent, tạo output và kiểm tra trước khi nối automation."
          />
          <div className="tech-wrap">
            <div className="tech-card reveal">
              <h3>Tracking tư duy CRM</h3>
              <ul>
                <li>Gom sản phẩm, offer, feedback, đơn hàng, lead, nội dung và kênh bán vào context folder.</li>
                <li>CRM Data Agent đề xuất field map, dashboard và quy tắc báo cáo tuần.</li>
                <li>Follow-up được viết theo bối cảnh thật, không theo mẫu spam đại trà.</li>
              </ul>
            </div>
            <div className="tech-card reveal">
              <h3>Vận hành không automation mù</h3>
              <ul>
                <li>Agent chỉ hỗ trợ khi đã có SOP, dữ liệu và tiêu chí kiểm tra.</li>
                <li>Automation Delivery Agent chỉ nối SePay, Telegram, webhook khi quy trình đã rõ.</li>
                <li>Mọi đầu ra cần được duyệt trước khi dùng cho khách hàng hoặc ads.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <SectionHeader
            tag="Proof stack"
            title="Không bịa testimonial. Proof hiện tại đến từ demo đầu ra và cấu trúc bàn giao."
            body="Khi có feedback, video demo hoặc case triển khai thật, khu vực này có thể chuyển thành case study/testimonial với bằng chứng rõ ràng hơn."
          />
          <div className="proof-grid">
            {proofOutputs.map((item, index) => (
              <div className="proof-card glass reveal" key={item}>
                <span>Proof {String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
          <div className="review-placeholder reveal">
            Khu vực testimonial đang giữ chỗ bằng proof thật của sản phẩm. Không dùng tên, ảnh, review hoặc số liệu chưa có nguồn. Khi có bằng chứng thật, phần này sẽ chuyển thành “khách hàng tự nói” giống nhịp Noti.
          </div>
        </div>
      </section>

      <section id="offer" className="section section-warm">
        <div className="section-inner price-layout">
          <div>
            <span className="section-tag">Bản quyền trọn đời</span>
            <h2 style={{ fontSize: "clamp(2.15rem,4.5vw,3.35rem)", lineHeight: 1.12, letterSpacing: "-.035em", margin: "18px 0" }}>
              Nhận trọn bộ <span className="orange-text">AI Agent</span> thoát việc lặp chỉ với <span className="gradient-text">359K</span>.
            </h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.75, fontWeight: 650 }}>
              Bộ Agent Kit X10 hiệu suất công việc giúp bạn copy dữ liệu thật, chọn command phù hợp và làm theo workflow để tạo kế hoạch, nội dung, CRM, checklist và báo cáo.
            </p>
            <ul className="offer-checklist">
              {offerChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="price-timeline">
              <div className="price-stage">
                <span>Giá gốc</span>
                <strong>799K</strong>
                <p>Giá sản phẩm Bộ Agent Kit X10 trong danh mục.</p>
              </div>
              <div className="price-stage active">
                <span>Hiện tại</span>
                <strong>359K</strong>
                <p>Giá private ads cho landing này.</p>
              </div>
              <div className="price-stage">
                <span>Nâng cấp</span>
                <strong>Theo nhu cầu</strong>
                <p>Nối automation, delivery, dashboard, webhook khi quy trình đã rõ.</p>
              </div>
            </div>
          </div>
          <AgentKitCheckoutForm />
        </div>
      </section>

      <section id="faq" className="section section-soft">
        <div className="section-inner">
          <SectionHeader tag="Câu hỏi thường gặp" title="Giải đáp thắc mắc của bạn." />
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <details className="glass reveal" key={question}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}. {question}</span>
                  <span className="plus">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-card reveal">
          <span className="section-tag">Bắt đầu từ dữ liệu đang có</span>
          <h2>Đừng để mỗi tuần bắt đầu lại từ một danh sách việc lặp.</h2>
          <p>
            Nhận bộ kit, đưa dữ liệu thật vào folder context, chọn command phù hợp và bắt đầu chuẩn hóa research, content, ads, CRM, checklist, báo cáo theo một hệ thống dễ lặp lại.
          </p>
          <div className="hero-cta">
            <Link href="#dang-ky" className="btn-primary">Nhận bộ kit 359K</Link>
          </div>
        </div>
      </section>

      <div className="sticky-bar">
        <div className="sticky-inner">
          <div>
            <strong>AI Agent Business</strong>
            <p>Offer AI Agent thoát vòng lặp công việc</p>
          </div>
          <Link href="#dang-ky" className="btn-primary">Nhận kit 359K</Link>
        </div>
      </div>
    </main>
  );
}
