"use client";

import Image from "next/image";
import Link from "next/link";
import { agentThumbnailCards } from "@/data/agent-thumbnails";

type AgentThumbnailGalleryProps = {
  className?: string;
  source: string;
};

export function AgentThumbnailGallery({
  className = "",
  source,
}: AgentThumbnailGalleryProps) {
  const marqueeItems = [...agentThumbnailCards, ...agentThumbnailCards];

  return (
    <div className={`agent-gallery ${className}`.trim()}>
      <div className="agent-gallery-head">
        <div>
          <p className="ai-kicker">Agent gallery</p>
          <p className="agent-gallery-count">10 workflow agent đang sẵn sàng triển khai</p>
        </div>
      </div>

      <div className="agent-gallery-marquee" aria-label="Gallery thumbnail agent chạy ngang">
        <div className="agent-gallery-marquee-track">
          {marqueeItems.map((agent, index) => {
            const agentIndex = index % agentThumbnailCards.length;

            return (
              <article key={`${agent.id}-${index}`} className="agent-gallery-card">
                <Link
                  href={`/dang-ky?source=${source}&agent=${agentIndex + 1}`}
                  className="agent-gallery-image thumbnail-shine"
                  aria-label={`Tìm hiểu thêm ${agent.label}`}
                >
                  <Image
                    src={agent.thumbnail}
                    alt={agent.label}
                    fill
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 42vw, 78vw"
                    priority={agentIndex < 3}
                    unoptimized
                  />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
