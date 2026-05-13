import Link from "next/link";
import { BrandSettingsManager } from "@/components/admin/brand-settings-manager";
import { OfferSettingsManager } from "@/components/admin/offer-settings-manager";
import { ProtectedAdminShell } from "@/components/app/protected-admin-shell";
import { SoftCard } from "@/components/ui/soft-card";
import { cmsSections } from "@/data/cms";
import { validateCmsContent } from "@/lib/cms-validation";
import { getBlogPosts } from "@/services/blogService";
import { getBrandSettings } from "@/services/brandService";
import { getCourses } from "@/services/courseService";
import { getDatabaseHealth } from "@/services/databaseHealthService";
import { getLeads } from "@/services/leadService";
import { getOfferSettings } from "@/services/offerService";
import { getResources } from "@/services/resourceService";
import { getTestimonials } from "@/services/testimonialService";

const cmsModules = [
  {
    label: "Khóa học",
    description: "Tạo/sửa/xóa khóa học, module, bài học, giá, ảnh và video.",
    href: "/admin/khoa-hoc",
  },
  {
    label: "Tài liệu",
    description: "Tạo/sửa/xóa tài liệu và link file public.",
    href: "/admin/tai-lieu",
  },
  {
    label: "Bài viết",
    description: "Tạo/sửa/xóa bài blog, danh mục, slug và nội dung.",
    href: "/admin/bai-viet",
  },
  {
    label: "Leads",
    description: "Xem lead từ form liên hệ/đăng ký.",
    href: "/admin/leads",
  },
  {
    label: "Feedback",
    description: "Tạo/sửa/xóa feedback học viên hiển thị ở trang public.",
    href: "/admin/feedback",
  },
  {
    label: "Database",
    description: "Kiểm tra bảng Supabase và trạng thái kết nối.",
    href: "/admin/database",
  },
];

export default async function AdminCmsPage() {
  const [brand, offer, courses, resources, posts, testimonials, leads, health] = await Promise.all([
    getBrandSettings(),
    getOfferSettings(),
    getCourses(),
    getResources(),
    getBlogPosts(),
    getTestimonials(),
    getLeads(),
    getDatabaseHealth(),
  ]);
  const issues = validateCmsContent();

  const stats = [
    ["Khóa học", courses.length],
    ["Bài viết", posts.length],
    ["Tài liệu", resources.length],
    ["Feedback", testimonials.length],
    ["Leads", leads.length],
    ["Bảng OK", health.tables.filter((table) => table.ok).length],
  ];

  return (
    <ProtectedAdminShell nextPath="/admin/cms">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-[#c77b20]">CMS</p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em]">
          Website builder cơ bản.
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-black/60">
          Trang này không còn là form mẫu. Các nhóm bên dưới dẫn tới màn quản
          trị có hành động thật: khóa học, tài liệu và bài viết ghi vào
          Supabase khi bảng đã được setup.
        </p>

        <section className="mt-10 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
          {stats.map(([label, value]) => (
            <SoftCard key={label}>
              <p className="text-sm text-black/50">{label}</p>
              <p className="mt-2 text-3xl font-black tracking-[-0.05em]">
                {value}
              </p>
            </SoftCard>
          ))}
        </section>

        <SoftCard className="mt-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#c77b20]">
                Kiểm tra nội dung
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                {issues.length === 0
                  ? "CMS config đang ổn."
                  : `${issues.length} vấn đề cần xử lý.`}
              </h2>
            </div>
            <span className="w-fit rounded-full bg-[#f2eadf] px-4 py-2 text-sm font-bold text-black/70">
              Build-safe validation
            </span>
          </div>
          {issues.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {issues.map((issue) => (
                <div
                  key={`${issue.scope}-${issue.message}`}
                  className="rounded-2xl border border-black/10 p-4 text-sm leading-6 text-black/65"
                >
                  <strong className="text-black">{issue.scope}:</strong>{" "}
                  {issue.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 leading-8 text-black/60">
              Không phát hiện slug trùng, CTA thiếu, related course sai hoặc
              cấu hình domain/email bất thường.
            </p>
          )}
        </SoftCard>

        <SoftCard className="mt-5">
          <p className="text-sm font-semibold text-[#c77b20]">Thương hiệu</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Logo, CTA, hình ảnh và video.
          </h2>
          <p className="mt-3 max-w-3xl leading-8 text-black/60">
            Cập nhật nhận diện thương hiệu dùng ở header, footer và media hero
            trang chủ. Nếu Supabase chưa có bảng site_settings, website vẫn
            fallback về cấu hình trong file.
          </p>
          <BrandSettingsManager settings={brand} />
        </SoftCard>

        <SoftCard className="mt-5">
          <p className="text-sm font-semibold text-[#2f8f62]">Ưu đãi</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Popup ưu đãi và mã giảm giá.
          </h2>
          <p className="mt-3 max-w-3xl leading-8 text-black/60">
            Cập nhật nội dung popup trên trang khóa học: tiêu đề, mô tả, quyền lợi,
            mã giảm giá và link CTA. Nếu chưa có dữ liệu trong Supabase, website sẽ
            dùng cấu hình mặc định.
          </p>
          <OfferSettingsManager settings={offer} />
        </SoftCard>

        <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cmsModules.map((module) => (
            <Link key={module.href} href={module.href}>
              <SoftCard className="h-full hover:shadow-[0_28px_80px_rgba(0,0,0,0.08)]">
                <p className="text-sm font-semibold text-[#c77b20]">CMS module</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">
                  {module.label}
                </h2>
                <p className="mt-3 leading-7 text-black/60">
                  {module.description}
                </p>
                <p className="mt-6 text-sm font-bold text-black/50">
                  Mở quản trị →
                </p>
              </SoftCard>
            </Link>
          ))}
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cmsSections.map((section) => (
            <SoftCard key={section.file}>
              <p className="text-sm font-semibold text-[#c77b20]">
                {section.file}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">
                {section.label}
              </h2>
              <p className="mt-3 leading-7 text-black/60">
                {section.description}
              </p>
            </SoftCard>
          ))}
        </section>
      </div>
    </ProtectedAdminShell>
  );
}
