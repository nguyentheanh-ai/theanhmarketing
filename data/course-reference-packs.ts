export type CourseReferencePack = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  previewUrl: string;
  previewAlt: string;
  downloadUrl: string;
  formats: string[];
};

const packsByCourseSlug: Record<string, CourseReferencePack[]> = {
  "facebook-ads-2026": [
    {
      id: "research",
      eyebrow: "01 · Nghiên cứu",
      title: "Bộ nghiên cứu đối thủ Facebook Ads",
      description:
        "Bản nghiên cứu 5 sheet đã kiểm tra hiển thị, kèm mẫu trắng để tự phân tích từ Meta Ad Library.",
      previewUrl: "/course-resources/facebook-ads-2026/nghien-cuu-doi-thu-facebook-ads.png",
      previewAlt: "Mẫu nghiên cứu đối thủ Facebook Ads",
      downloadUrl: "/course-resources/facebook-ads-2026/bo-nghien-cuu-doi-thu-facebook-ads.zip",
      formats: ["Excel 5 sheet", "Template MD", "Nguồn công khai"],
    },
    {
      id: "planning",
      eyebrow: "02 · Kế hoạch",
      title: "Bộ kế hoạch chiến dịch mẫu",
      description:
        "Plan board 18 phần, content plan, ads plan và design brief để chuyển nghiên cứu thành việc triển khai.",
      previewUrl: "/course-resources/facebook-ads-2026/ke-hoach-chien-dich-facebook-ads.png",
      previewAlt: "Mẫu kế hoạch chiến dịch Facebook Ads",
      downloadUrl: "/course-resources/facebook-ads-2026/bo-ke-hoach-chien-dich-facebook-ads.zip",
      formats: ["Plan HTML", "Content CSV", "Ads + Design brief"],
    },
    {
      id: "visual",
      eyebrow: "03 · Hình ảnh AI",
      title: "Bộ hình ảnh AI tham khảo",
      description:
        "Hình minh họa hệ thống marketing đã lọc bản trùng và không chứa dữ liệu khách hàng thật.",
      previewUrl: "/course-resources/facebook-ads-2026/hinh-anh-ai-tham-khao.png",
      previewAlt: "Hình minh họa hệ thống marketing tạo bằng AI",
      downloadUrl: "/course-resources/facebook-ads-2026/bo-hinh-anh-ai-tham-khao.zip",
      formats: ["PNG chất lượng cao", "Không PII", "AI minh họa"],
    },
  ],
};

export function getCourseReferencePacks(courseSlug: string) {
  return packsByCourseSlug[courseSlug] ?? [];
}

