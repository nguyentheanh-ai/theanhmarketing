import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { Course } from "@/data/courses";
import styles from "@/app/home.module.css";

const highlights = [
  { slug: "bo-agent-kit-x10-hieu-suat-cong-viec", label: "ĐỘI NGŨ NHÂN SỰ AI", headline: "Từ một yêu cầu đến một công việc được triển khai.", description: "Bắt đầu bằng video hướng dẫn cài đặt và SOP. Sau đó chọn Agent cho nghiên cứu, kế hoạch, content, thiết kế, video hoặc quảng cáo.", points: ["Bộ kit và prompt thiết lập để bắt đầu sử dụng", "Agent theo từng công việc, có đầu vào và đầu ra rõ ràng", "Hướng dẫn đưa dữ liệu và quy trình riêng vào bộ kit"] },
  { slug: "ebook-facebook-ads-2026", label: "THƯ VIỆN FACEBOOK ADS", headline: "Đang vướng ở đâu, mở đúng phần đó.", description: "Một thư viện để tra cứu trong lúc vận hành: từ mục tiêu, target và content đến Pixel, CAPI, testing, scale và báo cáo.", points: ["Tra cứu theo vấn đề đang gặp khi chạy quảng cáo", "Đọc trực tuyến và tài liệu PDF trong khu vực học viên", "Dùng cùng khóa học để ôn lại khi thực hành"] },
  { slug: "ai-master-x10-hieu-suat", label: "AI MASTER X10 HIỆU SUẤT", headline: "Đưa chuyên môn của anh/chị thành sản phẩm.", description: "Đi từ nghiên cứu khách hàng, đóng gói offer đến sản xuất nội dung và dựng trang bán hàng bằng AI.", points: ["Nghiên cứu insight và xác định giá trị của sản phẩm", "Kết nối offer, content và landing page", "Xây quy trình AI cho công việc lặp lại"] },
];

export function HomeCourseHighlights({ courses }: { courses: Course[] }) {
  const facebook = courses.find(course => course.slug === "facebook-ads-2026");
  return <>
    {facebook?.landingPageUrl ? <section className={styles.feature} aria-labelledby="facebook-feature-title">
      <div className={styles.featureCopy}>
        <p className={styles.eyebrow}>BẮT ĐẦU VỚI FACEBOOK ADS</p>
        <h2 id="facebook-feature-title">Biết chuẩn bị.<br />Biết chạy.<br /><span>Biết đọc số để tối ưu.</span></h2>
        <p>Khóa {facebook.title} đưa anh/chị đi từ nền tảng đến cách vận hành quảng cáo trong công việc thực tế.</p>
        <ol className={styles.learningSteps}>
          <li><span>01</span><div><h3>Chuẩn bị trước khi chi ngân sách</h3><p>Fanpage, content, nghiên cứu đối thủ và kế hoạch quảng cáo.</p></div></li>
          <li><span>02</span><div><h3>Thiết lập và đọc kết quả</h3><p>Tài khoản quảng cáo, target, chỉ số, ngân sách và chiến dịch tin nhắn.</p></div></li>
          <li><span>03</span><div><h3>Kết nối dữ liệu để tối ưu</h3><p>Dataset, Business Suite, Pancake và website/landing page.</p></div></li>
        </ol>
        <Link href={facebook.landingPageUrl} className={styles.primary}>Xem khóa Facebook Ads <ArrowRight size={17} /></Link>
      </div>
      <div className={styles.featureVisual}>
        {facebook.thumbnailImageUrl ? <Image src={facebook.thumbnailImageUrl} alt={facebook.title} width={720} height={720} sizes="(min-width: 1024px) 45vw, 100vw" className={styles.featureImage} /> : null}
        <div className={styles.practiceNote}><p className={styles.eyebrow}>HỌC ĐẾN ĐÂU, CÓ MẪU ĐẾN ĐÓ</p><h3>Prompt. Kế hoạch. Tài liệu mẫu.</h3><p>Thực hành với prompt nghiên cứu đối thủ, kế hoạch content–ads, Google Sheet mẫu và bảng đo lường đi kèm khóa học.</p></div>
      </div>
    </section> : null}
    <section className={styles.highlights} aria-labelledby="highlights-title">
      <div className={styles.heading}><div><p className={styles.eyebrow}>THÊM CÔNG CỤ CHO CÔNG VIỆC</p><h2 id="highlights-title">Học kiến thức.<br />Có công cụ để làm tiếp.</h2></div><p className={styles.sectionIntro}>Chọn chương trình phù hợp với việc anh/chị đang cần giải quyết.</p></div>
      <div className={styles.highlightGrid}>{highlights.map(item => {
        const course = courses.find(course => course.slug === item.slug);
        if (!course?.landingPageUrl) return null;
        return <article key={item.slug} className={styles.highlightCard}>
          <p className={styles.eyebrow}>{item.label}</p><h3>{item.headline}</h3><p>{item.description}</p>
          <ul>{item.points.map(point => <li key={point}><Check size={16} /><span>{point}</span></li>)}</ul>
          <Link href={course.landingPageUrl}>Khám phá chương trình <ArrowRight size={17} /></Link>
        </article>;
      })}</div>
    </section>
  </>;
}
