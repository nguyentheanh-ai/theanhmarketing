import Image from "next/image";
import { getAgentThumbnail } from "@/data/agent-thumbnails";
import { ButtonLink } from "@/components/ui/button-link";
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
        <div className="mt-auto pt-7">
          <ButtonLink
            href={`/dang-ky?source=agent-thumbnail&topic=${post.slug}`}
            className="w-full justify-center"
          >
            Tìm hiểu thêm
          </ButtonLink>
        </div>
      </div>
    </SoftCard>
  );
}
