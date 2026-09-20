import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Check, FileText, Headphones } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { StudentAreaShell } from "./student-area-shell";
import type { Course } from "@/data/courses";
import { getCourseLessonCount } from "@/data/courses";
import { FACEBOOK_EBOOK_COURSE_SLUG, FACEBOOK_EBOOK_PDF_HREF, FACEBOOK_EBOOK_READER_HREF } from "@/lib/ebook/facebook-ebook";
import { formatCurrency, parsePrice } from "@/lib/price";
import { getOwnedCoursesInAccessOrder, getPrimaryDashboardCourse, getSuggestedCoursesForDashboard } from "@/lib/student-dashboard-courses";
import { getStudentCourseHref } from "@/lib/student-course-navigation";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";
import type { ResourceItem } from "@/services/resourceService";
import styles from "./student-dashboard.module.css";

type StudentDashboardProps = {
  courses: Course[]; ownedSlugs: string[]; progressBySlug: Record<string, number>;
  resources: ResourceItem[]; studentName: string; studentEmail: string;
};
const courseImage = (course: Course) => course.thumbnailImageUrl || course.bannerImageUrl || toYouTubeThumbnailUrl(course.videoPreviewUrl) || "";
const boundedProgress = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;

function CourseTile({ course, progress }: { course: Course; progress: number }) {
  const href = getStudentCourseHref(course);
  const ebook = course.slug === FACEBOOK_EBOOK_COURSE_SLUG;
  const image = courseImage(course);
  return <article className={`${styles.course} ${course.status !== "open" ? "grayscale" : ""}`}>
    <Link href={href} className={styles.cover} aria-label={`Vào học: ${course.title}`}>
      {image ? <Image src={image} alt={course.title} fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" unoptimized className="object-contain" /> : <BookOpen size={48} aria-hidden="true" />}
      <span className={styles.owned}><Check size={12} aria-hidden="true" /> Đã sở hữu</span>
    </Link>
    <div className={styles.courseBody}>
      <p className={styles.meta}>{course.status !== "open" ? "Chưa mở bán · " : ""}{ebook ? "Thư viện tra cứu" : `${getCourseLessonCount(course)} bài học`}</p>
      <Link href={href}><h3>{course.title}</h3></Link>
      <p className={styles.description}>{course.shortDescription || course.description}</p>
      <div className={styles.progressLabel}><span>Tiến độ học tập</span><strong>{progress}%</strong></div>
      <div className={styles.progress} role="progressbar" aria-label={`Tiến độ ${course.title}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
      <div className={styles.courseActions}>
        <Link href={ebook ? FACEBOOK_EBOOK_READER_HREF : href} className={styles.primary}>{ebook ? "Đọc online" : "Vào học"}<ArrowRight size={16} aria-hidden="true" /></Link>
        {ebook ? <Link href={FACEBOOK_EBOOK_PDF_HREF} className={styles.secondary}>Tải PDF</Link> : null}
      </div>
    </div>
  </article>;
}

export function StudentDashboard({ courses, ownedSlugs, progressBySlug, resources, studentName, studentEmail }: StudentDashboardProps) {
  const ownedCourses = getOwnedCoursesInAccessOrder(courses, ownedSlugs);
  const suggestedCourses = getSuggestedCoursesForDashboard(courses, ownedSlugs).filter((course) => course.status === "open");
  const activeCourse = getPrimaryDashboardCourse(courses, ownedSlugs);
  const nextLessonHref = activeCourse ? getStudentCourseHref(activeCourse) : "/khoa-hoc";
  const availableResources = resources.filter((item) => item.fileUrl && item.access === "Miễn phí").slice(0, 4);
  return <StudentAreaShell ownedCount={ownedCourses.length} studentName={studentName} studentEmail={studentEmail}>
        <section className={styles.welcome}>
          <div><p className={styles.eyebrow}>HỌC. THỰC HÀNH. TIẾN BỘ.</p><h1>Chào {studentName || "anh/chị"}<span className={styles.greetingDot}>.</span></h1><p>Tiếp tục từ điều anh/chị đang học, áp dụng vào công việc hôm nay.</p></div>
          <Link href={nextLessonHref} className={styles.primary}>{activeCourse ? "Tiếp tục học" : "Khám phá khóa học"}<ArrowRight size={18} /></Link>
        </section>
        {activeCourse ? <section className={styles.resume} aria-label="Học tiếp">
          <span className={styles.resumeIcon}><BookOpen size={25} /></span><div><p>TIẾP TỤC HÀNH TRÌNH</p><h2>{activeCourse.title}</h2></div><Link href={nextLessonHref}>Mở khóa học <ArrowRight size={17} /></Link>
        </section> : null}
        <section id="khoa-hoc" className={styles.section}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>THƯ VIỆN CỦA ANH/CHỊ</p><h2>Khóa học của tôi <span>{ownedCourses.length}</span></h2></div><Link href="/khoa-hoc">Xem tất cả chương trình <ArrowRight size={15} /></Link></div>
          {ownedCourses.length ? <div className={styles.courseGrid}>{ownedCourses.map((course) => <CourseTile key={course.slug} course={course} progress={boundedProgress(progressBySlug[course.slug] ?? 0)} />)}</div> : <div className={styles.empty}><BookOpen size={32} /><h3>Chưa có khóa học được mở quyền</h3><p>Nếu anh/chị đã thanh toán, hãy kiểm tra tài khoản đang đăng nhập hoặc liên hệ hỗ trợ.</p><Link href="/tai-khoan" className={styles.secondary}>Kiểm tra tài khoản</Link></div>}
        </section>
        <div className={styles.bottomGrid}>
          <section id="tai-lieu" className={styles.panel}><div className={styles.sectionHeading}><h2>Tài liệu thực hành</h2><FileText size={20} /></div><p className={styles.muted}>Checklist và tài nguyên để áp dụng vào công việc.</p><div className={styles.resourceList}>{availableResources.map((item) => <a key={item.slug} href={item.fileUrl} className={styles.resource}><span className={styles.fileIcon}><FileText size={20} /></span><span><strong>{item.title}</strong><small>{item.type} · Miễn phí</small></span><ArrowRight size={17} /></a>)}</div><Link href="/tai-lieu" className={styles.textLink}>Mở thư viện tài liệu <ArrowRight size={16} /></Link></section>
          <section id="ho-tro" className={`${styles.panel} ${styles.support}`}><span className={styles.supportIcon}><Headphones size={24} /></span><p className={styles.eyebrow}>ĐỒNG HÀNH CÙNG ANH/CHỊ</p><h2>Cần hỗ trợ khi học?</h2><p>Trao đổi trực tiếp để giải quyết vướng mắc về bài học, quảng cáo và cách triển khai.</p><Link href="/dat-lich-ho-tro" className={styles.secondary}>Đặt lịch hỗ trợ <ArrowRight size={16} /></Link></section>
        </div>
        {suggestedCourses.length ? <section className={styles.section} aria-label="Chương trình khác"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>BƯỚC TIẾP THEO</p><h2>Khám phá thêm</h2></div></div><div className={styles.suggestionGrid}>{suggestedCourses.map((course) => {
          const price = parsePrice(course.price); const studentPrice = price ? formatCurrency(Math.round(price * 0.95)) : course.price;
          return <article key={course.slug} className={styles.suggestion}><p className={styles.meta}>Chưa mua · Ưu đãi học viên -5%</p><Link href={`/khoa-hoc/${course.slug}`}><h3>{course.title}</h3></Link><p>{course.shortDescription || course.description}</p><div><strong>{studentPrice}</strong><AddToCartButton slug={course.slug} title={course.title} price={studentPrice} label="Thêm vào giỏ" className={styles.secondary} /></div></article>;
        })}</div></section> : null}
  </StudentAreaShell>;
}
