"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CourseCard } from "@/components/content/course-card";
import type { Course } from "@/data/courses";

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

export function CourseCatalogBrowser({ courses }: { courses: Course[] }) {
  const [keyword, setKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  const categories = useMemo(
    () => ["Tất cả", ...new Set(courses.map((course) => course.eyebrow).filter(Boolean))],
    [courses],
  );

  const filteredCourses = useMemo(() => {
    const query = normalizeCatalogText(keyword);
    return courses.filter((course) => {
      if (activeCategory !== "Tất cả" && course.eyebrow !== activeCategory) return false;
      if (!query) return true;
      const haystack = normalizeCatalogText([
        course.title,
        course.shortDescription,
        course.description,
        course.eyebrow,
        ...course.topics,
      ].join(" "));
      return haystack.includes(query);
    });
  }, [activeCategory, courses, keyword]);

  const hasFilters = keyword.trim() !== "" || activeCategory !== "Tất cả";
  const clearFilters = () => {
    setKeyword("");
    setActiveCategory("Tất cả");
  };

  return (
    <div>
      <div className="tam-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-md">
            <span className="sr-only">Tìm kiếm chương trình</span>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
            <input
              className="min-h-12 w-full rounded-full border border-[var(--tam-line)] bg-[#f8fbfd] pl-11 pr-4 text-sm font-semibold text-[var(--tam-ink)] outline-none transition placeholder:text-slate-400 focus:border-[#159cfb]/40 focus:ring-4 focus:ring-[#159cfb]/10"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên, chủ đề hoặc kỹ năng..."
              type="search"
              value={keyword}
            />
          </label>
          <div className="flex items-center gap-2 text-xs font-black text-[var(--tam-muted)]">
            <SlidersHorizontal size={16} aria-hidden="true" />
            {filteredCourses.length} chương trình phù hợp
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Danh mục khóa học">
          {categories.map((category) => (
            <button
              aria-pressed={activeCategory === category}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                activeCategory === category
                  ? "border-[var(--tam-accent)] bg-[var(--tam-accent)] text-white shadow-[0_8px_18px_rgba(21,156,251,.2)]"
                  : "border-[var(--tam-line)] bg-white text-[var(--tam-muted)] hover:border-[#159cfb]/30 hover:text-[var(--tam-ink)]"
              }`}
              key={category}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
          {hasFilters ? (
            <button className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-black text-[var(--tam-accent-strong)]" onClick={clearFilters} type="button">
              <X size={14} aria-hidden="true" /> Xóa bộ lọc
            </button>
          ) : null}
        </div>
      </div>

      {filteredCourses.length > 0 ? (
        <div className="tam-stagger mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => <CourseCard course={course} key={course.slug} />)}
        </div>
      ) : (
        <div className="tam-card mt-8 px-6 py-14 text-center">
          <p className="text-xl font-black text-[var(--tam-ink)]">Chưa tìm thấy chương trình phù hợp</p>
          <p className="mt-2 text-sm text-[var(--tam-muted)]">Thử một từ khóa khác hoặc xem lại toàn bộ chương trình.</p>
          <button className="mt-5 rounded-full bg-[var(--tam-accent)] px-5 py-3 text-sm font-black text-white" onClick={clearFilters} type="button">
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
