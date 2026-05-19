"use client";

import { useMemo, useState } from "react";
import { BlogCard } from "@/components/content/blog-card";
import type { BlogPost } from "@/data/blog";

type BlogListProps = {
  posts: BlogPost[];
  categories: string[];
};

export function BlogList({ posts, categories }: BlogListProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "Tất cả");

  const visiblePosts = useMemo(() => {
    if (activeCategory === categories[0]) {
      return posts;
    }

    return posts.filter((post) => post.category === activeCategory);
  }, [activeCategory, categories, posts]);

  return (
    <>
      <div className="mt-10 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button
            key={item}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeCategory === item
                ? "bg-[#159cfb] text-white"
                : "border border-white/12 bg-white/6 text-white/65 hover:text-white"
            }`}
            type="button"
            onClick={() => setActiveCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {visiblePosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
        {visiblePosts.length === 0 ? (
          <div className="ai-panel p-6 text-sm font-semibold text-white/60">
            Chưa có bài viết trong danh mục này.
          </div>
        ) : null}
      </section>
    </>
  );
}
