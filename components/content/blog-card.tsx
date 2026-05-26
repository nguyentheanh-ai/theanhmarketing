import Image from "next/image";
import { getAgentThumbnail } from "@/data/agent-thumbnails";
import { ButtonLink } from "@/components/ui/button-link";
import { SoftCard } from "@/components/ui/soft-card";

type BlogPost = {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  thumbnail?: string;
  excerpt: string;
};

export function BlogCard({ post, index = 0 }: { post: BlogPost; index?: number }) {
  const thumbnail = post.thumbnail || getAgentThumbnail(index);

  return (
    <SoftCard className="group flex h-full flex-col overflow-hidden !p-0 hover:border-[#77d7ff]/35">
      <div className="blog-card-thumbnail thumbnail-shine">
        <Image
          src={thumbnail}
          alt={`Thumbnail ${post.title}`}
          fill
          sizes="(min-width: 768px) 30vw, 92vw"
          unoptimized
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="ai-kicker">{post.category} · Agent workflow</p>
        <h2 className="mt-4 text-2xl font-black tracking-[-0.04em]">
          {post.title}
        </h2>
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-black/60">
          {post.excerpt}
        </p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
          {post.readTime}
        </p>
        <div className="mt-auto pt-7">
          <ButtonLink
            href={`/blog/${post.slug}`}
            className="w-full justify-center"
          >
            Đọc bài viết
          </ButtonLink>
        </div>
      </div>
    </SoftCard>
  );
}
