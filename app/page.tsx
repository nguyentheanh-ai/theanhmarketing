import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, FileText, Headphones } from "lucide-react";
import { CourseCard } from "@/components/content/course-card";
import { PageShell } from "@/components/site/page-shell";
import { getCourses } from "@/services/courseService";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = await getCourses({ summaryOnly: true });
  const availableCourses = courses.filter((course) => course.status === "open" && course.landingPageUrl);
  return <PageShell><div className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}><span /> THE ANH MARKETING</p>
        <h1>Học Marketing.<br />Làm chủ AI.<br /><span>Ứng dụng mỗi ngày.</span></h1>
        <p className={styles.intro}>Khóa học, tài liệu và bộ Agent giúp anh/chị đưa kiến thức vào công việc — từ quảng cáo Facebook đến ứng dụng AI.</p>
        <div className={styles.actions}><Link href="#chuong-trinh" className={styles.primary}>Khám phá chương trình <ArrowRight size={17} /></Link><Link href="/dashboard" className={styles.secondary}>Vào khu vực học viên <ArrowUpRight size={17} /></Link></div>
        <p className={styles.heroNote}>Đã có tài khoản? Các khóa học của anh/chị nằm trong khu vực học viên.</p>
      </div>
      <div className={styles.heroPanel}>
        <div className={styles.panelTop}><span>THE ANH / ACADEMY</span><BookOpen size={21} /></div>
        <p className={styles.panelEyebrow}>BẮT ĐẦU TỪ ĐIỀU ANH/CHỊ CẦN</p><h2>Kiến thức thực hành.<br />Công cụ dùng được.</h2>
        <div className={styles.paths}>
          <Link href="/khoa-hoc"><span>01</span><div><strong>Học một kỹ năng mới</strong><small>Khám phá chương trình đang mở</small></div><ArrowUpRight size={20} /></Link>
          <Link href="/tai-lieu"><span>02</span><div><strong>Tìm tài liệu thực hành</strong><small>Checklist và tài nguyên marketing</small></div><ArrowUpRight size={20} /></Link>
          <Link href="/dashboard"><span>03</span><div><strong>Tiếp tục khóa học của mình</strong><small>Bài học, bộ kit và tài liệu đã sở hữu</small></div><ArrowUpRight size={20} /></Link>
        </div>
        <div className={styles.panelBottom}><span>Một nơi để học và thực hành.</span><span>↗</span></div>
      </div>
    </section>
    <section id="chuong-trinh" className={styles.programs}>
      <div className={styles.heading}><div><p className={styles.eyebrow}>CHƯƠNG TRÌNH ĐANG MỞ</p><h2>Chọn điều anh/chị muốn làm tốt hơn.</h2></div><Link href="/khoa-hoc">Tất cả chương trình <ArrowRight size={16} /></Link></div>
      {availableCourses.length ? <div className={styles.courseGrid}>{availableCourses.map((course) => <CourseCard course={course} key={course.slug} />)}</div> : <p className={styles.empty}>Các chương trình đang được cập nhật. <Link href="/khoa-hoc">Xem danh sách khóa học →</Link></p>}
    </section>
    <section className={styles.student}><div><p className={styles.eyebrow}>DÀNH CHO HỌC VIÊN</p><h2>Mở đúng khóa học.<br />Bắt đầu việc tiếp theo.</h2><p>Tất cả khóa học đã sở hữu, tiến độ học tập và lối vào bộ Agent được tập trung trong tài khoản của anh/chị.</p><Link href="/dashboard" className={styles.primary}>Mở khóa học của tôi <ArrowRight size={17} /></Link></div><div className={styles.studentSteps}><div><BookOpen size={22} /><span><strong>Khóa học đã sở hữu</strong><small>Vào thẳng bài học và chương trình của mình.</small></span></div><div><FileText size={22} /><span><strong>Tài liệu luôn dễ tìm</strong><small>Mở thư viện hoặc tài liệu đi kèm khóa học.</small></span></div><div><Headphones size={22} /><span><strong>Hỗ trợ khi cần</strong><small>Đặt lịch trao đổi về vấn đề đang gặp.</small></span></div></div></section>
    <section className={styles.help}><div><p className={styles.eyebrow}>CÙNG TÌM BƯỚC TIẾP THEO</p><h2>Đang vướng ở một bài toán cụ thể?</h2><p>Chọn lịch phù hợp để trao đổi về quảng cáo và cách triển khai vào công việc.</p></div><Link href="/dat-lich-ho-tro" className={styles.secondary}>Xem lịch hỗ trợ <ArrowUpRight size={17} /></Link></section>
  </div></PageShell>;
}
