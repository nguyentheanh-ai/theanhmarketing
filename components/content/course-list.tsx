"use client";

import { useMemo, useState } from "react";
import { CourseCard } from "@/components/content/course-card";
import type { Course } from "@/data/courses";

type CourseListProps = {
  courses: Course[];
  filters: string[];
};

function matchesFilter(course: Course, filter: string, index: number) {
  if (index === 0) {
    return true;
  }

  const normalized = filter.toLowerCase();

  if (normalized.includes("record")) {
    return course.format.toLowerCase().includes("video");
  }

  if (normalized.includes("sắp") || normalized.includes("sap")) {
    return course.status === "coming-soon";
  }

  return course.topics.some((topic) => topic.toLowerCase().includes(normalized));
}

export function CourseList({ courses, filters }: CourseListProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyword, setKeyword] = useState("");

  const visibleCourses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return courses.filter((course) => {
      if (!matchesFilter(course, filters[activeIndex], activeIndex)) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return (
        course.title.toLowerCase().includes(normalizedKeyword) ||
        course.shortDescription.toLowerCase().includes(normalizedKeyword) ||
        course.description.toLowerCase().includes(normalizedKeyword)
      );
    });
  }, [activeIndex, courses, filters, keyword]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter, index) => (
            <button
              key={filter}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeIndex === index
                  ? "bg-[#159cfb] text-white shadow-[0_0_24px_rgba(56,189,248,0.24)]"
                  : "border border-white/12 bg-white/6 text-white/65 hover:border-[#77d7ff]/30 hover:text-white"
              }`}
              type="button"
              onClick={() => setActiveIndex(index)}
            >
              {filter}
            </button>
          ))}
        </div>
        <input
          className="min-h-11 w-full rounded-xl border border-white/12 bg-white/8 px-4 text-sm text-white outline-none transition placeholder:text-white/38 focus:border-[#77d7ff]/40 lg:w-[340px]"
          placeholder="Tìm kiếm khóa học..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleCourses.map((course) => (
          <CourseCard key={course.slug} course={course} />
        ))}
      </div>

      {visibleCourses.length === 0 ? (
        <div className="ai-panel mt-8 p-6 text-sm font-semibold text-white/60">
          Chưa có khóa học phù hợp với bộ lọc hoặc từ khóa này.
        </div>
      ) : null}
    </>
  );
}
