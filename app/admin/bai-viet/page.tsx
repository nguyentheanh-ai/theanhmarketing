import { BlogPostManager } from "@/components/admin/blog-post-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getBlogPosts } from "@/services/blogService";

export default async function AdminPostsPage() {
  const posts = await getBlogPosts();

  return (
    <ProtectedAdminShell nextPath="/admin/bai-viet">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý bài viết.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Bài viết đọc từ Supabase trước, fallback về file tĩnh nếu bảng chưa có
          dữ liệu. Form bên dưới lưu/xóa trực tiếp vào bảng blog_posts.
        </p>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">Blog CMS</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Tạo, sửa, xóa bài viết.
          </h2>
          <BlogPostManager posts={posts} />
        </SoftCard>
      </div>
    </ProtectedAdminShell>
  );
}
