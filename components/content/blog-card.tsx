import Link from "next/link";
import { SoftCard } from "@/components/ui/soft-card";

type BlogPost = {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
};

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <SoftCard className="group h-full hover:border-[#77d7ff]/35">
        <p className="ai-kicker">
          {post.category} · {post.readTime}
        </p>
        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
          {post.title}
        </h2>
        <p className="ai-muted mt-4 leading-7">{post.excerpt}</p>
        <p className="mt-7 text-sm font-bold text-white/50 transition group-hover:text-white">
          Đọc bài viết →
        </p>
      </SoftCard>
    </Link>
  );
}
