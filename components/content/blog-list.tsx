"use client";

import { AgentThumbnailGallery } from "@/components/content/agent-thumbnail-gallery";

export function BlogList() {
  return (
    <section className="ai-shell py-12">
      <AgentThumbnailGallery source="blog-agent-gallery" />
    </section>
  );
}
