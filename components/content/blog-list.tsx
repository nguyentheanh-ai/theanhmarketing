import { AgentThumbnailGallery } from "@/components/content/agent-thumbnail-gallery";
import { BlogCard } from "@/components/content/blog-card";
import type { BlogPostItem } from "@/services/blogService";

export function BlogList({ posts }: { posts: BlogPostItem[] }) {
  return (
    <section className="ai-shell py-12">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post, index) => (
          <BlogCard key={post.slug} post={post} index={index} />
        ))}
      </div>
      <AgentThumbnailGallery className="mt-14" source="blog-agent-gallery" />
    </section>
  );
}
