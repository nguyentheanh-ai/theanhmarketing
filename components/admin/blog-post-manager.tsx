"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BlogPostItem } from "@/services/blogService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const emptyPost: BlogPostItem = {
  slug: "",
  title: "",
  category: "Facebook Ads",
  readTime: "5 phút đọc",
  author: "Thế Anh Marketing",
  excerpt: "",
  content: "",
  status: "published",
};

export function BlogPostManager({ posts }: { posts: BlogPostItem[] }) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState(posts[0]?.slug ?? "new");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedPost = useMemo(() => {
    return posts.find((post) => post.slug === selectedSlug) ?? emptyPost;
  }, [posts, selectedSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "");
    const slug = String(formData.get("slug") ?? slugify(title));
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase. Bài viết chưa được lưu.");
      setIsSaving(false);
      return;
    }

    const payload = {
      slug,
      title,
      category: String(formData.get("category") ?? ""),
      read_time: String(formData.get("readTime") ?? ""),
      author: String(formData.get("author") ?? ""),
      excerpt: String(formData.get("excerpt") ?? ""),
      content: String(formData.get("content") ?? ""),
      status: String(formData.get("status") ?? "published"),
    };

    const query = selectedPost.id
      ? supabase.from("blog_posts").update(payload).eq("id", selectedPost.id)
      : supabase.from("blog_posts").insert(payload);

    const { error } = await query;
    setIsSaving(false);

    if (error) {
      setMessage(
        `Chưa lưu được vào Supabase: ${error.message}. Nếu bảng blog_posts chưa có, chạy SQL trong docs/DATABASE_SETUP.md.`,
      );
      return;
    }

    setMessage("Đã lưu bài viết vào Supabase.");
    router.refresh();
  }

  async function handleDelete() {
    if (!selectedPost.id) {
      setMessage("Bài viết fallback từ file tĩnh chưa có id Supabase để xóa.");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Chưa cấu hình Supabase.");
      return;
    }

    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", selectedPost.id);

    if (error) {
      setMessage(`Chưa xóa được bài viết: ${error.message}`);
      return;
    }

    setSelectedSlug("new");
    setMessage("Đã xóa bài viết.");
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid content-start gap-3">
        <button
          className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
            selectedSlug === "new"
              ? "bg-black text-white"
              : "border border-black/10 bg-white text-black/65"
          }`}
          type="button"
          onClick={() => setSelectedSlug("new")}
        >
          + Tạo bài viết mới
        </button>
        {posts.map((post) => (
          <button
            className={`rounded-2xl px-4 py-3 text-left transition ${
              selectedSlug === post.slug
                ? "bg-black text-white"
                : "border border-black/10 bg-white text-black/65 hover:text-black"
            }`}
            key={post.slug}
            type="button"
            onClick={() => setSelectedSlug(post.slug)}
          >
            <span className="block text-sm font-bold">{post.title}</span>
            <span className="mt-1 block text-xs opacity-70">
              {post.category} · {post.status ?? "published"}
            </span>
          </button>
        ))}
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedPost.title}
            key={`title-${selectedSlug}`}
            name="title"
            placeholder="Tiêu đề"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedPost.slug}
            key={`slug-${selectedSlug}`}
            name="slug"
            placeholder="slug-bai-viet"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedPost.category}
            key={`category-${selectedSlug}`}
            name="category"
            placeholder="Danh mục"
            required
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedPost.readTime}
            key={`read-${selectedSlug}`}
            name="readTime"
            placeholder="5 phút đọc"
          />
          <input
            className="min-h-12 rounded-2xl border border-black/10 px-4"
            defaultValue={selectedPost.author}
            key={`author-${selectedSlug}`}
            name="author"
            placeholder="Tác giả"
          />
          <select
            className="min-h-12 rounded-2xl border border-black/10 bg-white px-4"
            defaultValue={selectedPost.status ?? "published"}
            key={`status-${selectedSlug}`}
            name="status"
          >
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
        <textarea
          className="min-h-24 rounded-2xl border border-black/10 p-4"
          defaultValue={selectedPost.excerpt}
          key={`excerpt-${selectedSlug}`}
          name="excerpt"
          placeholder="Mô tả ngắn"
          required
        />
        <textarea
          className="min-h-48 rounded-2xl border border-black/10 p-4"
          defaultValue={selectedPost.content}
          key={`content-${selectedSlug}`}
          name="content"
          placeholder="Nội dung bài viết"
          required
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="w-fit rounded-full bg-black px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Đang lưu..." : "Lưu bài viết"}
          </button>
          {selectedPost.id ? (
            <button
              className="w-fit rounded-full border border-red-200 bg-red-50 px-6 py-3 text-sm font-bold text-red-700"
              type="button"
              onClick={handleDelete}
            >
              Xóa bài viết
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="rounded-2xl bg-[#f2eadf] px-4 py-3 text-sm font-semibold text-black/65">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
