import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { CourseMedia } from "@/components/course/course-media";
import { CoursePriceCard } from "@/components/course/course-price-card";
import { CourseTabs } from "@/components/course/course-tabs";
import { Curriculum } from "@/components/course/curriculum";
import { RelatedCourses } from "@/components/course/related-courses";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { SoftCard } from "@/components/ui/soft-card";
import type { Course } from "@/data/courses";
import { getCourseLessonCount } from "@/data/courses";

export function CourseDetail({ course }: { course: Course }) {
  return (
    <>
      <section className="mx-auto max-w-[1440px] px-5 pb-14 pt-36 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[#c77b20]">
              {course.eyebrow} · {course.statusLabel}
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
              {course.title}
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-9 text-black/65">
              {course.shortDescription}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#giao-trinh">Học thử miễn phí</ButtonLink>
              <AddToCartButton slug={course.slug} title={course.title} price={course.price} />
              <ButtonLink href="/dang-ky" variant="secondary">
                Tạo tài khoản
              </ButtonLink>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-4">
              {[
                ["Bài học", String(getCourseLessonCount(course))],
                ["Thời lượng", course.duration],
                ["Cấp độ", course.level],
                ["Cập nhật", course.updatedAt],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">
                    {label}
                  </p>
                  <p className="mt-2 font-black tracking-[-0.03em]">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-5">
            <CourseMedia course={course} />
            <div className="hidden lg:block">
              <CoursePriceCard course={course} />
            </div>
          </div>
        </div>
        <div className="mt-8 lg:hidden">
          <CoursePriceCard course={course} />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <CourseTabs />
      </section>

      <section id="tong-quan" className="mx-auto max-w-[1440px] scroll-mt-40 px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow="Tổng quan"
          title="Khóa học này giúp bạn học có hệ thống, không học mẹo rời rạc."
          description={course.description}
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {course.outcomes.map((item) => (
            <SoftCard key={item} className="leading-8 text-black/65">
              {item}
            </SoftCard>
          ))}
        </div>
      </section>

      <section id="quyen-loi" className="mx-auto max-w-[1440px] scroll-mt-40 px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Quyền lợi" title="Những gì học viên nhận được." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[...course.benefits, ...course.includes].map((item) => (
            <SoftCard key={item} className="leading-8 text-black/65">
              {item}
            </SoftCard>
          ))}
        </div>
      </section>

      <section id="giao-trinh" className="mx-auto max-w-[1440px] scroll-mt-40 px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Giáo trình" title="Curriculum dạng module/bài học." />
        <div className="mt-10">
          <Curriculum course={course} />
        </div>
      </section>

      <section id="giang-vien" className="mx-auto max-w-[1440px] scroll-mt-40 px-5 py-20 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="Giảng viên" title={course.instructor.name} />
          <SoftCard>
            <p className="text-sm font-semibold text-[#c77b20]">
              {course.instructor.title}
            </p>
            <p className="mt-4 text-lg leading-9 text-black/65">
              {course.instructor.bio}
            </p>
          </SoftCard>
        </div>
      </section>

      <section id="danh-gia" className="mx-auto max-w-[1440px] scroll-mt-40 px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Đánh giá" title="Feedback từ học viên." align="center" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {course.reviews.map((review) => (
            <SoftCard key={review.name}>
              <p className="text-lg leading-8 text-black/70">“{review.quote}”</p>
              <p className="mt-6 font-bold">{review.name}</p>
              <p className="mt-1 text-sm text-black/50">{review.role}</p>
            </SoftCard>
          ))}
        </div>
      </section>

      <RelatedCourses course={course} />
    </>
  );
}
