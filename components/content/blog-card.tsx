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
      <SoftCard className="group h-full hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-semibold text-[#c77b20]">
          {post.category} · {post.readTime}
        </p>
        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
          {post.title}
        </h2>
        <p className="mt-4 leading-7 text-black/60">{post.excerpt}</p>
        <p className="mt-7 text-sm font-bold text-black/50 transition group-hover:text-black">
          Đọc bài viết →
        </p>
      </SoftCard>
    </Link>
  );
}
