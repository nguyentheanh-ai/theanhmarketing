import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";
import type { Course } from "@/data/courses";
import { getCourseLessonCount, getCourseModuleCount } from "@/data/courses";

export function CoursePriceCard({ course }: { course: Course }) {
  return (
    <SoftCard className="ai-panel-strong lg:sticky lg:top-36">
      <p className="ai-kicker">Học trọn gói</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className="text-4xl font-black tracking-[-0.05em] text-white">
          {course.price}
        </p>
        {course.originalPrice ? (
          <p className="pb-1 text-sm text-white/35 line-through">{course.originalPrice}</p>
        ) : null}
      </div>
      <div className="mt-6 grid gap-3 rounded-xl bg-white/7 p-5 text-sm text-white/58 ring-1 ring-white/10">
        <p>Bài học: {getCourseLessonCount(course)}</p>
        <p>Module: {getCourseModuleCount(course)}</p>
        <p>Cấp độ: {course.level}</p>
        <p>Cập nhật: {course.updatedAt}</p>
      </div>
      <div className="mt-6 grid gap-3">
        <ButtonLink href="/dang-ky" className="w-full">
          Tạo tài khoản
        </ButtonLink>
        <AddToCartButton slug={course.slug} title={course.title} price={course.price} className="w-full" />
        <ButtonLink href="#giao-trinh" variant="secondary" className="w-full">
          Học thử miễn phí
        </ButtonLink>
      </div>
    </SoftCard>
  );
}
