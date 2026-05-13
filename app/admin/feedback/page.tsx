import { TestimonialManager } from "@/components/admin/testimonial-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { getTestimonials } from "@/services/testimonialService";

export default async function AdminFeedbackPage() {
  const testimonials = await getTestimonials();

  return (
    <ProtectedAdminShell nextPath="/admin/feedback">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">Admin</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Quản lý feedback.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Feedback đọc từ Supabase trước, fallback về file tĩnh nếu bảng chưa có
          dữ liệu. Form bên dưới tạo/sửa/xóa trực tiếp trong bảng testimonials.
        </p>

        <SoftCard className="mt-10">
          <p className="text-sm font-semibold text-[#c77b20]">
            Testimonial CMS
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Tạo, sửa, xóa feedback học viên.
          </h2>
          <TestimonialManager testimonials={testimonials} />
        </SoftCard>
      </div>
    </ProtectedAdminShell>
  );
}
