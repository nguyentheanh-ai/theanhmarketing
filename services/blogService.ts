import { blogPosts as fallbackBlogPosts, type BlogPost } from "@/data/blog";
import { unstable_cache } from "next/cache";
import { sanitizeCmsHtml } from "@/lib/security/html";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BlogPostItem = BlogPost & {
  id?: string;
  status?: string;
  createdAt?: string;
};

type DbBlogPost = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  read_time: string | null;
  author: string | null;
  excerpt: string | null;
  content: string | null;
  status: string | null;
  created_at: string | null;
};

function mapDbBlogPost(post: DbBlogPost): BlogPostItem {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    category: post.category ?? "Blog",
    readTime: post.read_time ?? "5 phút đọc",
    author: post.author ?? "The Anh Marketing",
    excerpt: post.excerpt ?? "",
    content: sanitizeCmsHtml(post.content ?? ""),
    status: post.status ?? "published",
    createdAt: post.created_at ?? "",
  };
}

async function fetchBlogPosts(): Promise<BlogPostItem[]> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackBlogPosts;
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return fallbackBlogPosts;
  }

  return (data as DbBlogPost[]).map(mapDbBlogPost);
}

export const getBlogPosts = unstable_cache(fetchBlogPosts, ["blog-posts"], {
  revalidate: 120,
  tags: ["content", "blog-posts"],
});

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getBlogStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
