"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { Course } from "@/data/courses";
import { getCourseLessonCount } from "@/data/courses";
import { toYouTubeThumbnailUrl } from "@/lib/youtube";

type FilterKey = "level" | "type" | "price";
type ActiveFilters = Record<FilterKey, string>;

const emptyFilters: ActiveFilters = {
  level: "",
  type: "",
  price: "",
};

const facebookAdsLandingPath = "/hoc-chay-quang-cao-facebook-tu-so-0-tu-chay-ra-don-2026";

const priceRanges = [
  { label: "Dưới 500K", min: 0, max: 499_000 },
  { label: "799K - 1.299K", min: 799_000, max: 1_299_000 },
  { label: "Từ 2 triệu", min: 2_000_000, max: Number.POSITIVE_INFINITY },
];

function getCourseImage(course: Course) {
  return course.thumbnailImageUrl || course.bannerImageUrl || toYouTubeThumbnailUrl(course.videoPreviewUrl) || "";
}

function parseVndPrice(price: string) {
  const normalized = price.replace(/\./g, "").replace(/k/i, "000").replace(/[^\d]/g, "");
  return Number(normalized) || 0;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getCourseHref(course: Course) {
  return course.slug === "facebook-ads-2026" ? facebookAdsLandingPath : `/khoa-hoc/${course.slug}`;
}

export function CourseCatalogGrid({
  courses,
  showFilters = true,
  showToolbar = true,
}: {
  courses: Course[];
  showFilters?: boolean;
  showToolbar?: boolean;
}) {
  const [openGroup, setOpenGroup] = useState<FilterKey | "">("");
  const [filters, setFilters] = useState<ActiveFilters>(emptyFilters);

  const groups = useMemo(
    () => [
      { key: "level" as const, label: "Cấp độ", values: unique(courses.map((course) => course.level)) },
      { key: "type" as const, label: "Loại sản phẩm", values: unique(courses.map((course) => course.eyebrow)) },
      { key: "price" as const, label: "Học phí", values: priceRanges.map((range) => range.label) },
    ],
    [courses],
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (filters.level && course.level !== filters.level) return false;
      if (filters.type && course.eyebrow !== filters.type) return false;

      if (filters.price) {
        const range = priceRanges.find((item) => item.label === filters.price);
        const price = parseVndPrice(course.price);

        if (range && (price < range.min || price > range.max)) return false;
      }

      return true;
    });
  }, [courses, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  function setFilter(key: FilterKey, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key] === value ? "" : value,
    }));
  }

  return (
    <div className={showFilters ? "course-catalog-shell" : "course-catalog-shell course-catalog-shell-simple"}>
      {showFilters ? (
        <aside className="course-catalog-filters" aria-label="Bộ lọc khóa học">
          <div className="course-catalog-filter-head">
            <span className="course-catalog-filter-icon" aria-hidden="true" />
            <strong>Bộ lọc</strong>
          </div>

          {groups.map((group) => {
            const isOpen = openGroup === group.key;

            return (
              <div key={group.key} className="course-catalog-filter-group" data-open={isOpen}>
                <button
                  type="button"
                  className="course-catalog-filter-row"
                  aria-expanded={isOpen}
                  onClick={() => setOpenGroup(isOpen ? "" : group.key)}
                >
                  <span>
                    {group.label}
                    {filters[group.key] ? <small>{filters[group.key]}</small> : null}
                  </span>
                  <span className="course-catalog-chevron" aria-hidden="true" />
                </button>

                <div className="course-catalog-filter-options">
                  <button
                    type="button"
                    className={!filters[group.key] ? "is-active" : ""}
                    onClick={() => setFilters((current) => ({ ...current, [group.key]: "" }))}
                  >
                    Tất cả
                  </button>
                  {group.values.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={filters[group.key] === value ? "is-active" : ""}
                      onClick={() => setFilter(group.key, value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {hasActiveFilters ? (
            <button type="button" className="course-catalog-clear" onClick={() => setFilters(emptyFilters)}>
              Xóa bộ lọc
            </button>
          ) : null}
        </aside>
      ) : null}

      <div className="course-catalog-main">
        {showToolbar ? (
          <div className="course-catalog-toolbar">
            <span>
              {filteredCourses.length}/{courses.length} chương trình phù hợp
            </span>
          </div>
        ) : null}

        {filteredCourses.length > 0 ? (
          <div className="course-catalog-grid">
            {filteredCourses.map((course, index) => {
              const imageUrl = getCourseImage(course);
              const lessonCount = getCourseLessonCount(course);
              const courseHref = getCourseHref(course);

              return (
                <article key={course.slug} className="course-catalog-card">
                  <Link href={courseHref} className="course-catalog-image thumbnail-shine" aria-label={course.title}>
                    <span className="course-catalog-badge">{course.statusLabel || course.eyebrow}</span>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={course.thumbnailLabel || course.title}
                        fill
                        sizes="(min-width: 1280px) 390px, (min-width: 768px) 45vw, 92vw"
                        priority={index < 3}
                        unoptimized
                      />
                    ) : null}
                  </Link>

                  <div className="course-catalog-content">
                    <Link href={courseHref} className="course-catalog-title">
                      {course.title}
                    </Link>
                    <div className="course-catalog-meta">
                      <span>{course.level}</span>
                      <span>{lessonCount} bài học</span>
                    </div>
                    <div className="course-catalog-price-row" aria-label={`Giá ${course.price}`}>
                      <strong>{course.price}</strong>
                      {course.originalPrice ? <span>{course.originalPrice}</span> : null}
                    </div>
                    <div className="course-catalog-actions">
                      {course.slug === "facebook-ads-2026" ? (
                        <Link href={courseHref} className="course-catalog-cart">
                          Đăng ký
                        </Link>
                      ) : (
                        <AddToCartButton
                          slug={course.slug}
                          title={course.title}
                          price={course.price}
                          label="Thêm giỏ"
                          className="course-catalog-cart"
                        />
                      )}
                      <Link href={courseHref}>Chi tiết</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="course-catalog-empty">
            <strong>Chưa có khóa phù hợp</strong>
            <p>Thử bỏ bớt bộ lọc để xem lại toàn bộ chương trình.</p>
          </div>
        )}
      </div>
    </div>
  );
}
