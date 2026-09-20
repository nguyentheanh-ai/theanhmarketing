import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, FileText, Headphones } from "lucide-react";
import { HomeCourseHighlights } from "@/components/content/home-course-highlights";
import { HomeMotion } from "@/components/home/home-motion";
import { PageShell } from "@/components/site/page-shell";
import { getCourses } from "@/services/courseService";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
const imageRoot = "/doi-ngu-nhan-su-ai/images/generated";
const skills = ["FACEBOOK ADS", "CONTENT", "AI AGENT", "LANDING PAGE", "VIDEO", "MARKETING"];

export default async function Home() {
  const courses = await getCourses({ summaryOnly: true });
  const availableCourses = courses.filter(course => course.status === "open" && course.landingPageUrl);
  return <HomeMotion><PageShell><div className={styles.home}>
    <div className={styles.announcement} aria-label="Học marketing và ứng dụng AI cùng Thế Anh">
      <div className={styles.announcementTrack} aria-hidden="true">{[0, 1].map(copy => <div key={copy}><span>HỌC CÙNG THẾ ANH</span><b>✳</b><span>MARKETING & AI THỰC HÀNH</span><b>✳</b><span>TỪ KIẾN THỨC ĐẾN CÔNG VIỆC</span><b>✳</b></div>)}</div>
    </div>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroPhoto}><Image src={`${imageRoot}/hero-operator.webp`} alt="Thế Anh làm việc với laptop và sổ ghi chép" fill priority sizes="(min-width: 1024px) 75vw, 100vw" /></div>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}><span /> THE ANH MARKETING</p>
          <h1 id="home-title" aria-label="Giỏi Marketing. Làm chủ AI. Làm được việc."><span className={styles.titleLine} aria-hidden="true"><span>Giỏi Marketing.</span></span><span className={styles.titleLine} aria-hidden="true"><span>Làm chủ <em>AI.</em></span></span><span className={styles.titleLine} aria-hidden="true"><span>Làm được việc.</span></span></h1>
          <p className={styles.intro}>Học cách chạy quảng cáo, làm nội dung và đưa AI vào công việc. Cùng Thế Anh đi từng bước, từ cách nghĩ đến cách làm.</p>
          <div className={styles.actions}><Link href="#chuong-trinh" className={styles.primary}><span>Tìm khóa học phù hợp</span><ArrowUpRight size={20} /></Link><Link href="/dashboard" className={styles.heroSecondary}><span>Vào học</span><ArrowRight size={18} /></Link></div>
        </div>
        <div className={styles.heroSignature}><span>NGƯỜI ĐỒNG HÀNH</span><strong>Thế Anh.</strong><p>Marketing · Quảng cáo · Ứng dụng AI</p></div>
        <a href="#cach-hoc" className={styles.scrollCue}><ArrowDown size={16} /><span>Khám phá cách học</span></a>
      </div>
    </section>
    <section className={styles.manifesto} id="cach-hoc">
      <div className={styles.sectionIndex} data-reveal><span>01 / HỌC ĐỂ LÀM</span><span>THE ANH ACADEMY ↗</span></div>
      <div className={styles.manifestoGrid}>
        <h2 data-reveal>Kiến thức chỉ có giá trị<br />khi anh/chị <em>áp dụng được.</em></h2>
        <div data-reveal><p>Một chiến dịch cần lên kế hoạch. Một sản phẩm cần giới thiệu. Một công việc đang mất quá nhiều thời gian.</p><p>Bắt đầu từ việc anh/chị cần làm. Chọn kiến thức phù hợp, thực hành với tài liệu mẫu và dùng AI để hỗ trợ từng bước.</p><Link href="#chuong-trinh" className={styles.textLink}>Xem các chương trình <ArrowUpRight size={20} /></Link></div>
      </div>
      <div className={styles.methodGrid}>
        {[{image:"role-marketing.webp",number:"01",title:"Hiểu việc trước khi làm",copy:"Xác định khách hàng, mục tiêu và cách triển khai. Có kế hoạch để biết mình đang làm gì.",href:"/academy/facebook-ads-master-2026"},{image:"role-design.webp",number:"02",title:"Học đến đâu, thực hành đến đó",copy:"Làm nội dung, thiết kế, quảng cáo với bài học và tài liệu mẫu ngay trong khóa học.",href:"/khoa-hoc"},{image:"role-report.webp",number:"03",title:"Có AI cùng làm việc",copy:"Giao việc từ dữ liệu và quy trình của mình. Kiểm tra đầu ra trước khi đưa vào sử dụng.",href:"/academy/bo-kit-agent-doanh-nghiep"}].map(item => <Link href={item.href} key={item.number} className={styles.methodCard} data-reveal><div className={styles.methodImage}><Image src={`${imageRoot}/${item.image}`} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" /><span>{item.number}</span><span className={styles.circleArrow}><ArrowUpRight size={22} /></span></div><h3>{item.title}</h3><p>{item.copy}</p></Link>)}
      </div>
    </section>
    <div className={styles.skillBand} aria-label="Facebook Ads, Content, AI Agent, Landing Page, Video và Marketing"><div className={styles.skillTrack} aria-hidden="true">{[0,1].map(copy=><div key={copy}>{skills.map(skill=><span key={skill}>{skill}<b>✳</b></span>)}</div>)}</div><div className={`${styles.skillTrack} ${styles.reverse}`} aria-hidden="true">{[0,1].map(copy=><div key={copy}>{["HỌC", "THỰC HÀNH", "ỨNG DỤNG"].map(word=><span key={word}>{word}<b>↗</b></span>)}</div>)}</div></div>
    <HomeCourseHighlights courses={availableCourses} />
    <section id="chuong-trinh" className={styles.programs}>
      <div className={styles.sectionIndex} data-reveal><span>03 / CHỌN CHƯƠNG TRÌNH</span><span>BẮT ĐẦU TỪ VIỆC CỦA ANH/CHỊ</span></div>
      <div className={styles.heading} data-reveal><h2>Một kỹ năng mới.<br /><em>Nhiều việc làm được hơn.</em></h2><Link href="/khoa-hoc" className={styles.textLink}>Tất cả khóa học <ArrowUpRight size={20} /></Link></div>
      <div className={styles.courseGrid}>{availableCourses.map((course,index)=><article key={course.slug} className={styles.courseCard} data-reveal><Link href={course.landingPageUrl!} className={styles.courseImage} aria-label={`Xem ${course.title}`}>{course.thumbnailImageUrl ? <Image src={course.thumbnailImageUrl} alt={course.title} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" /> : <BookOpen size={50}/>}<span>0{index+1}</span></Link><div className={styles.courseBody}><p>{course.statusLabel}</p><Link href={course.landingPageUrl!}><h3>{course.title}</h3></Link><p className={styles.courseDescription}>{course.shortDescription}</p><div className={styles.courseBottom}><strong>{course.price}</strong><Link href={course.landingPageUrl!} aria-label={`Xem chi tiết ${course.title}`}><ArrowUpRight size={23}/></Link></div></div></article>)}</div>
    </section>
    <section className={styles.student} data-reveal><div><p className={styles.eyebrow}>KHÔNG GIAN HỌC TẬP CỦA ANH/CHỊ</p><h2>Đang học dở?<br /><em>Mình tiếp tục nhé.</em></h2><p>Khóa học, tài liệu và bộ Agent đã sở hữu đều nằm trong tài khoản học viên.</p><Link href="/dashboard" className={styles.primary}><span>Vào khu vực học viên</span><ArrowUpRight size={20}/></Link></div><div className={styles.studentSteps}><div><BookOpen size={23}/><span><strong>Tiếp tục bài học</strong><small>Mở đúng khóa và phần đang học.</small></span></div><div><FileText size={23}/><span><strong>Tìm tài liệu thực hành</strong><small>Prompt, checklist và các mẫu đi kèm.</small></span></div><div><Headphones size={23}/><span><strong>Trao đổi khi cần hỗ trợ</strong><small>Đặt lịch giải quyết vấn đề cụ thể.</small></span></div></div></section>
    <section className={styles.help} data-reveal><p className={styles.eyebrow}>CÙNG THẾ ANH TÌM BƯỚC TIẾP THEO</p><h2>Việc anh/chị đang muốn<br />làm tốt hơn <em>là gì?</em></h2><Link href="/dat-lich-ho-tro" className={styles.primary}><span>Trao đổi cùng Thế Anh</span><ArrowUpRight size={23}/></Link><span className={styles.helpMark} aria-hidden="true">↗</span></section>
  </div></PageShell></HomeMotion>;
}
