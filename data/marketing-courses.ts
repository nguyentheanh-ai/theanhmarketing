import type { Course } from "@/data/courses";

// Demo/generated marketing courses were removed from the public catalog.
// Keep this export stable because the service layer imports it.
//
// Sản phẩm phần mềm bán qua landing tĩnh (không phải khóa học). Production lấy danh mục khóa học từ Supabase nên các
// mục ở đây KHÔNG hiện trong /khoa-hoc; `getCourseBySlug` vẫn tìm thấy để `/api/orders` tạo đơn với giá do server quyết định.
export const BOT247_SLUG = "bot-24-7";

export const marketingCourses: Course[] = [
  {
    slug: BOT247_SLUG,
    title: "Bot 24/7 - Đội nhân viên AI cho doanh nghiệp",
    eyebrow: "Phần mềm",
    description:
      "Bot 24/7 là đội 8 nhân viên AI chạy trên máy tính của khách: trả lời khách đa kênh, lên lịch đăng, làm video, website, đọc báo cáo quảng cáo; mọi việc ra ngoài đều chờ chủ duyệt.",
    shortDescription: "Đội nhân viên AI chạy trên máy của bạn, dùng gói Claude/ChatGPT sẵn có.",
    price: "990K",
    originalPrice: "",
    status: "open",
    statusLabel: "Đang mở bán",
    ctaText: "Mua Bot 24/7",
    duration: "Phần mềm cài trên máy",
    level: "Phần mềm",
    updatedAt: "23/10/2026",
    format: "Bộ cài Mac/Windows + mã kích hoạt + hướng dẫn cài",
    bannerImageUrl: "",
    thumbnailImageUrl: "",
    videoPreviewUrl: "",
    videoPreviewEmbedUrl: "",
    thumbnailLabel: "Bot 24/7",
    previewNote: "",
    topics: ["AI Agent", "Chăm khách", "Tự động hoá"],
    audience: ["Chủ shop, doanh nghiệp nhỏ, người kinh doanh online muốn có nhân viên AI trực 24/7."],
    outcomes: ["Bot trả lời khách, lên lịch đăng, làm video và website; chủ chỉ cần duyệt."],
    benefits: [],
    includes: ["Bộ cài Mac và Windows", "Mã kích hoạt", "Hướng dẫn cài đặt"],
    requirements: ["Máy Mac (macOS 13+) hoặc Windows 10/11", "Gói Claude Pro/Max hoặc ChatGPT Plus/Pro"],
    modules: [],
    instructor: { name: "Nguyễn Thế Anh", title: "Thế Anh Marketing", bio: "" },
    reviews: [],
    relatedSlugs: [],
  },
];
