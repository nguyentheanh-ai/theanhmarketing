import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";
import type { Course } from "@/data/courses";
import { getCourseLessonCount } from "@/data/courses";

export function CoursePriceCard({ course }: { course: Course }) {
  return (
    <SoftCard className="bg-white/92 shadow-[0_24px_80px_rgba(50,34,12,0.07)] lg:sticky lg:top-36">
      <p className="text-sm font-semibold text-[#b56b18]">Học trọn gói</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className="text-4xl font-black tracking-[-0.05em] text-[#1f160d]">
          {course.price}
        </p>
        {course.originalPrice ? (
          <p className="pb-1 text-sm text-black/35 line-through">{course.originalPrice}</p>
        ) : null}
      </div>
      <div className="mt-6 grid gap-3 rounded-3xl bg-[#fff7ea] p-5 text-sm text-black/58 ring-1 ring-[#f3dec0]">
        <p>Bài học: {getCourseLessonCount(course)}</p>
        <p>Thời lượng: {course.duration}</p>
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
