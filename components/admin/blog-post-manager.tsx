"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { BlogPostItem } from "@/services/blogService";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { uploadMediaFile } from "@/lib/supabase/media-upload";

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
        <BlogHtmlEditor
          key={`content-editor-${selectedSlug}`}
          initialContent={selectedPost.content}
          postSlug={selectedPost.slug || "new-post"}
          postTitle={selectedPost.title || "Ảnh bài viết"}
          onMessage={setMessage}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="w-fit" isLoading={isSaving} loadingLabel="Đang lưu..." type="submit">
            Lưu bài viết
          </Button>
          {selectedPost.id ? (
            <Button className="w-fit" variant="danger" type="button" onClick={handleDelete}>
              Xóa bài viết
            </Button>
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

function BlogHtmlEditor({
  initialContent,
  onMessage,
  postSlug,
  postTitle,
}: {
  initialContent: string;
  onMessage: (message: string) => void;
  postSlug: string;
  postTitle: string;
}) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(initialContent ?? "");
  const [isUploading, setIsUploading] = useState(false);

  function insertHtml(snippet: string) {
    const textarea = contentRef.current;
    if (!textarea) {
      setContent((current) => `${current}\n${snippet}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    setContent(nextContent);

    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  async function uploadAndInsertImage(file: File | undefined) {
    if (!file) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      onMessage("Chưa cấu hình Supabase. Không thể upload ảnh.");
      return;
    }

    setIsUploading(true);
    onMessage("");

    try {
      const url = await uploadMediaFile({
        file,
        folder: `blog/${postSlug}`,
        supabase,
      });
      insertHtml(
        `<figure><img src="${url}" alt="${postTitle}" /><figcaption>Chú thích ảnh</figcaption></figure>`,
      );
      onMessage("Đã upload ảnh, chèn URL vào nội dung HTML. Bấm lưu để ghi vào database.");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "Không upload được ảnh.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-black">Editor nội dung HTML</p>
          <p className="mt-1 text-sm leading-6 text-black/55">
            Upload ảnh để lấy URL rồi chèn vào bài, hoặc dán HTML trực tiếp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="button" variant="secondary" onClick={() => insertHtml("<h2>Tiêu đề phần</h2>")}>
            H2
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => insertHtml("<h3>Tiêu đề nhỏ</h3>")}>
            H3
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => insertHtml("<p>Đoạn nội dung...</p>")}>
            Đoạn
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => insertHtml("<blockquote>Trích dẫn nổi bật...</blockquote>")}>
            Quote
          </Button>
        </div>
      </div>
      <label className="mt-4 grid gap-2 rounded-2xl bg-[#f7f3ec] p-4 text-sm font-semibold text-black/60">
        Upload ảnh vào bài viết
        <input
          accept="image/*"
          type="file"
          onChange={(event) => uploadAndInsertImage(event.target.files?.[0])}
        />
        {isUploading ? <span>Đang upload ảnh...</span> : null}
      </label>
      <textarea
        ref={contentRef}
        className="mt-4 min-h-64 w-full rounded-2xl border border-black/10 p-4 font-mono text-sm leading-7"
        name="content"
        placeholder="<h2>Tiêu đề</h2><p>Nội dung bài viết...</p>"
        required
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      {content ? (
        <div className="mt-4 rounded-2xl border border-black/10 bg-[#fbfaf7] p-5">
          <p className="mb-4 text-sm font-bold text-black/55">Preview</p>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      ) : null}
    </div>
  );
}
