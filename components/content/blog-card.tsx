import Image from "next/image";
import Link from "next/link";
import { getAgentThumbnail } from "@/data/agent-thumbnails";
import { SoftCard } from "@/components/ui/soft-card";

type BlogPost = {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
};

export function BlogCard({ post, index = 0 }: { post: BlogPost; index?: number }) {
  const thumbnail = getAgentThumbnail(index);

  return (
    <Link href={`/blog/${post.slug}`}>
      <SoftCard className="group h-full overflow-hidden !p-0 hover:border-[#77d7ff]/35">
        <div className="blog-card-thumbnail thumbnail-shine">
          <Image
            src={thumbnail}
            alt={`Thumbnail ${post.title}`}
            fill
            sizes="(min-width: 768px) 30vw, 92vw"
            unoptimized
          />
        </div>
        <div className="p-6">
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
        </div>
      </SoftCard>
    </Link>
  );
}
