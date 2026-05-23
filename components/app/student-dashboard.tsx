"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/site/brand-mark";
import type { Course } from "@/data/courses";
import { getCourseLessonCount, getCourseModuleCount } from "@/data/courses";
import { siteConfig } from "@/data/site";
import { formatCurrency, getDiscountPercent, parsePrice } from "@/lib/price";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";
import type { ResourceItem } from "@/services/resourceService";

type StudentDashboardProps = {
  courses: Course[];
  ownedSlugs: string[];
  resources: ResourceItem[];
  studentName: string;
  studentEmail: string;
};

function getCourseImage(course: Course) {
  return (
    course.thumbnailImageUrl ||
    course.bannerImageUrl ||
    toYouTubeThumbnailUrl(course.videoPreviewUrl) ||
    ""
  );
}

function getFirstLessonHref(course: Course) {
  const firstLesson = course.modules
    .flatMap((module) => module.lessons)
    .sort((a, b) => a.order - b.order)[0];

  return firstLesson ? `/learn/${course.slug}/${firstLesson.id}` : `/khoa-hoc/${course.slug}`;
}

function getStudentOfferPrice(course: Course) {
  const price = parsePrice(course.price);

  if (!price) {
    return "";
  }

  return formatCurrency(Math.round(price * 0.95));
}

function CourseTile({
  course,
  isOwned,
  isDark,
}: {
  course: Course;
  isOwned: boolean;
  isDark: boolean;
}) {
  const discountPercent = getDiscountPercent(course.price, course.originalPrice);
  const studentOfferPrice = getStudentOfferPrice(course);
  const imageUrl = getCourseImage(course);
  const lessonCount = getCourseLessonCount(course);
  const moduleCount = getCourseModuleCount(course);

  return (
    <article
      className={`overflow-hidden rounded-[18px] ring-1 transition-colors ${
        isOwned
          ? isDark
            ? "bg-[#26252c] ring-white/10"
            : "bg-white ring-black/8 shadow-[0_18px_55px_rgba(29,24,16,0.08)]"
          : isDark
            ? "bg-[#17171c] opacity-78 ring-white/8"
            : "bg-[#f1eee8] opacity-88 ring-black/8"
      }`}
    >
      <div className="relative aspect-video overflow-hidden bg-[#101116]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={course.title}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            unoptimized
            className={`h-full w-full object-contain ${isOwned ? "" : "brightness-[0.74] saturate-[0.82]"}`}
          />
        ) : (
          <div className={`h-full w-full ${isOwned ? "bg-[#2f8f62]" : "bg-[#222126]"}`} />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black ${
              isOwned ? "bg-[#49b77a] text-white" : "bg-[#e6c672] text-[#30250c]"
            }`}
          >
            {isOwned ? "Đã sở hữu" : "Chưa mở quyền"}
          </span>
          {!isOwned && studentOfferPrice ? (
            <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black text-[#1f5e41]">
              Ưu đãi Growth Hub -5%
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <span className={isDark ? "text-white/54" : "text-black/48"}>
            {moduleCount} module - {lessonCount} bài học
          </span>
          {discountPercent > 0 ? (
            <span className="rounded-full bg-[#e8f7ec] px-2.5 py-1 text-[#208253]">
              -{discountPercent}%
            </span>
          ) : null}
        </div>

        <Link href={`/khoa-hoc/${course.slug}`} className="mt-3 block">
          <h3 className={`text-xl font-black leading-tight ${isDark ? "text-white" : "text-black"}`}>
            {course.title}
          </h3>
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${isDark ? "text-white/62" : "text-black/58"}`}>
            {course.shortDescription || course.description}
          </p>
        </Link>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className={`text-xs font-bold uppercase ${isDark ? "text-white/45" : "text-black/42"}`}>
              {isOwned ? "Quyền học" : "Giá Growth Hub"}
            </p>
            <p className={`mt-1 text-lg font-black ${isDark ? "text-white" : "text-black"}`}>
              {isOwned ? "Đã mở" : studentOfferPrice || course.price}
            </p>
            {!isOwned && course.price && studentOfferPrice ? (
              <p className={`text-xs line-through ${isDark ? "text-white/36" : "text-black/36"}`}>
                {course.price}
              </p>
            ) : null}
          </div>

          {isOwned ? (
            <Link
              href={getFirstLessonHref(course)}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#49b77a] px-5 text-sm font-black text-white transition-colors hover:bg-[#3aa86c]"
            >
              Vào workflow
            </Link>
          ) : course.status === "open" ? (
            <AddToCartButton
              slug={course.slug}
              title={course.title}
              price={studentOfferPrice || course.price}
              label="Nâng cấp"
              className="min-h-11 bg-white px-5 text-sm text-black"
            />
          ) : (
            <Link
              href={`/khoa-hoc/${course.slug}`}
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-black ${
                isDark ? "bg-white/10 text-white" : "bg-white text-black"
              }`}
            >
              Xem chương trình
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function StudentDashboard({
  courses,
  ownedSlugs,
  resources,
  studentName,
  studentEmail,
}: StudentDashboardProps) {
  const [isDark, setIsDark] = useState(true);
  const ownedSet = useMemo(() => new Set(ownedSlugs), [ownedSlugs]);
  const ownedCourses = courses.filter((course) => ownedSet.has(course.slug));
  const suggestedCourses = courses.filter((course) => !ownedSet.has(course.slug));
  const activeCourse = ownedCourses[0] ?? courses[0];
  const nextLessonHref = activeCourse ? getFirstLessonHref(activeCourse) : "/khoa-hoc";
  const completion = activeCourse ? Math.min(100, Math.max(8, Math.round((1 / Math.max(getCourseLessonCount(activeCourse), 1)) * 100))) : 0;

  const shellClass = isDark
    ? "bg-[#202026] text-white"
    : "bg-[#f7f4ee] text-[#111114]";
  const panelClass = isDark
    ? "bg-[#26252c] text-white ring-white/8"
    : "bg-white text-[#111114] ring-black/8 shadow-[0_16px_55px_rgba(38,28,16,0.06)]";
  const mutedText = isDark ? "text-white/62" : "text-black/58";

  return (
    <main className={`min-h-screen ${shellClass}`}>
      <aside className={`fixed inset-y-0 left-0 z-20 hidden w-[268px] border-r p-5 lg:block ${isDark ? "border-white/8 bg-[#242329]" : "border-black/8 bg-white"}`}>
        <Link href="/" className="flex items-center gap-3 rounded-lg bg-white p-3 text-[#111114]">
          <BrandMark className="grid size-10 place-items-center overflow-hidden rounded-md bg-white p-1 ring-1 ring-black/8" />
          <span>
            <span className="block text-sm font-black leading-tight">{siteConfig.shortName}</span>
            <span className="block text-[11px] font-bold text-black/48">Growth Hub</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-1 text-sm font-bold">
          {[
            ["Tổng quan", "/dashboard"],
            ["Chương trình", "#khoa-hoc"],
            ["Toolkit", "#tai-lieu"],
            ["Hỗ trợ", "#ho-tro"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-4 py-3 transition-colors ${
                isDark ? "text-white/72 hover:bg-white/8 hover:text-white" : "text-black/62 hover:bg-black/5 hover:text-black"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 grid gap-3">
          <button
            type="button"
            onClick={() => setIsDark((value) => !value)}
            className={`flex min-h-11 items-center justify-between rounded-full px-4 text-sm font-black ${
              isDark ? "bg-[#7c3aed] text-white" : "bg-[#111114] text-white"
            }`}
          >
            <span>Giao diện tối</span>
            <span className="grid size-6 place-items-center rounded-full bg-white text-xs text-black">
              {isDark ? "Bật" : "Tắt"}
            </span>
          </button>
          <SignOutButton className={`rounded-full px-4 py-3 text-left text-sm font-bold transition-colors ${isDark ? "bg-white/8 text-white/72 hover:bg-white/12 hover:text-white" : "bg-black/5 text-black/62 hover:bg-black/10 hover:text-black"}`} />
        </div>
      </aside>

      <section className="min-h-screen px-4 py-5 lg:ml-[268px] lg:px-8">
        <header className={`mb-5 flex flex-col gap-3 rounded-[18px] p-4 ring-1 md:flex-row md:items-center md:justify-between ${panelClass}`}>
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.16em] ${isDark ? "text-[#b79cff]" : "text-[#7a4ad8]"}`}>
              AI Operator Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              Chào {studentName || "học viên"}
            </h1>
            <p className={`mt-1 text-sm ${mutedText}`}>{studentEmail || "Theo dõi chương trình, toolkit và hỗ trợ tại đây."}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsDark((value) => !value)}
              className={`min-h-11 rounded-full px-4 text-sm font-black lg:hidden ${isDark ? "bg-white text-black" : "bg-black text-white"}`}
            >
              {isDark ? "Sáng" : "Tối"}
            </button>
            <Link
              href={nextLessonHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#49b77a] px-5 text-sm font-black text-white transition-colors hover:bg-[#3aa86c]"
            >
              Học tiếp
            </Link>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={`overflow-hidden rounded-[18px] ring-1 ${panelClass}`}>
            <div className="relative aspect-video bg-[#101116]">
              {activeCourse && getCourseImage(activeCourse) ? (
                <Image
                  src={getCourseImage(activeCourse)}
                  alt={activeCourse.title}
                  fill
                  sizes="(min-width: 1280px) calc(100vw - 660px), 100vw"
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="h-full w-full bg-[#26252c]" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 to-transparent p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/68">Engine đang học</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">{activeCourse?.title ?? "Chưa có chương trình"}</h2>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#49b77a]" style={{ width: `${completion}%` }} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className={`text-sm leading-6 ${mutedText}`}>
                  {activeCourse?.shortDescription || activeCourse?.description || "Khi sở hữu chương trình, bài học và workflow sẽ xuất hiện tại đây."}
                </p>
                <p className={`mt-2 text-sm font-bold ${isDark ? "text-white/78" : "text-black/68"}`}>
                  Tiến độ hiện tại: {completion}%
                </p>
              </div>
              <Link
                href={nextLessonHref}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-black ring-1 ring-black/8"
              >
                Vào phòng học
              </Link>
            </div>
          </div>

          <div className="grid gap-5">
            <section id="ho-tro" className={`rounded-[18px] p-5 ring-1 ${panelClass}`}>
              <p className={`text-xs font-black uppercase tracking-[0.14em] ${isDark ? "text-[#b79cff]" : "text-[#7a4ad8]"}`}>
                Hỗ trợ
              </p>
              <h2 className="mt-2 text-xl font-black">Cần hỗ trợ khi triển khai?</h2>
              <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
                Gửi câu hỏi về bài học, tài khoản, thanh toán hoặc điểm nghẽn trong Growth System. Đội ngũ sẽ phản hồi theo kênh bạn chọn.
              </p>
              <div className="mt-4 grid gap-2">
                <Link href={siteConfig.emailHref} className="rounded-full bg-[#49b77a] px-4 py-3 text-center text-sm font-black text-white">
                  Gửi email hỗ trợ
                </Link>
                <Link href={siteConfig.phoneHref} className={`rounded-full px-4 py-3 text-center text-sm font-black ring-1 ${isDark ? "bg-white/8 text-white ring-white/10" : "bg-white text-black ring-black/10"}`}>
                  Liên hệ Zalo
                </Link>
              </div>
            </section>

          </div>
        </section>

        <section id="khoa-hoc" className="mt-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.16em] ${isDark ? "text-[#b79cff]" : "text-[#7a4ad8]"}`}>
                Chương trình
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Engine đã sở hữu và chương trình có thể nâng cấp</h2>
            </div>
            <p className={`max-w-xl text-sm leading-6 ${mutedText}`}>
              Chương trình chưa mở quyền được làm tối hơn và áp dụng ưu đãi riêng 5% cho học viên đang có tài khoản.
            </p>
          </div>

          {ownedCourses.length > 0 ? (
            <>
              <h3 className={`mt-6 text-sm font-black uppercase tracking-[0.14em] ${isDark ? "text-white/58" : "text-black/48"}`}>
                Đã sở hữu
              </h3>
              <div className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {ownedCourses.map((course) => (
                  <CourseTile key={course.slug} course={course} isOwned isDark={isDark} />
                ))}
              </div>
            </>
          ) : null}

          <h3 className={`mt-7 text-sm font-black uppercase tracking-[0.14em] ${isDark ? "text-white/58" : "text-black/48"}`}>
            Có thể nâng cấp
          </h3>
          <div className="mt-3 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {suggestedCourses.map((course) => (
              <CourseTile key={course.slug} course={course} isOwned={false} isDark={isDark} />
            ))}
          </div>
        </section>

        <section id="tai-lieu" className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className={`rounded-[18px] p-5 ring-1 ${panelClass}`}>
            <p className={`text-xs font-black uppercase tracking-[0.14em] ${isDark ? "text-[#b79cff]" : "text-[#7a4ad8]"}`}>
              Toolkit
            </p>
            <h2 className="mt-2 text-2xl font-black">Toolkit học viên</h2>
            <div className="mt-4 grid gap-3">
              {resources.slice(0, 4).map((item) => (
                <Link
                  key={item.title}
                  href="/blog#tai-lieu"
                  className={`rounded-xl p-4 ring-1 ${isDark ? "bg-white/5 ring-white/8 hover:bg-white/8" : "bg-[#f6f1e8] ring-black/6 hover:bg-[#f2eadf]"}`}
                >
                  <p className="font-black">{item.title}</p>
                  <p className={`mt-1 text-sm ${mutedText}`}>{item.type}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className={`rounded-[18px] p-5 ring-1 ${panelClass}`}>
            <p className={`text-xs font-black uppercase tracking-[0.14em] ${isDark ? "text-[#b79cff]" : "text-[#7a4ad8]"}`}>
              Hồ sơ
            </p>
            <h2 className="mt-2 text-2xl font-black">Thông tin Growth Hub</h2>
            <div className={`mt-4 grid gap-3 text-sm ${mutedText}`}>
              <p>Họ tên: {studentName || "Học viên"}</p>
              <p>Email: {studentEmail || "Chưa đăng nhập email"}</p>
              <p>Chương trình đã mở quyền: {ownedCourses.length}</p>
              <p>Chương trình có thể nâng cấp: {suggestedCourses.length}</p>
            </div>
          </div>
        </section>
      </section>

      <nav
        className={`student-mobile-action ${isDark ? "student-mobile-action--dark" : ""}`}
        aria-label="Hành động học nhanh trên điện thoại"
      >
        <Link href={nextLessonHref}>Học tiếp</Link>
        <Link href="#khoa-hoc">Khóa học</Link>
        <Link href="#tai-lieu">Toolkit</Link>
      </nav>
    </main>
  );
}

