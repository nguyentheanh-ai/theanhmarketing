export const marketingAiServices = [
  {
    id: "offline-1-1-hcm",
    title: "Học Offline 1 kèm 1 tại TP.HCM",
    format: "Offline tại TP.HCM",
    description: "Học trực tiếp theo mục tiêu cá nhân, tập trung vào Marketing và AI có thể áp dụng ngay vào công việc.",
  },
  {
    id: "training-doanh-nghiep",
    title: "Training doanh nghiệp Online/Offline",
    format: "Online hoặc tại doanh nghiệp",
    description: "Thiết kế nội dung đào tạo Marketing và AI theo đội ngũ, ngành hàng và vấn đề doanh nghiệp đang cần xử lý.",
  },
  {
    id: "chuyen-sau-1-1",
    title: "Khóa học chuyên sâu 1 kèm 1",
    format: "Lộ trình riêng theo mục tiêu",
    description: "Đồng hành chuyên sâu để nâng năng lực Marketing, AI và triển khai trên dự án thật của bạn.",
  },
] as const;

export type MarketingAiServiceId = (typeof marketingAiServices)[number]["id"];
