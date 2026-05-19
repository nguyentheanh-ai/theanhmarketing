export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  author: string;
  excerpt: string;
  content: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "sme-khong-thieu-tool-thieu-growth-system",
    title: "SME không thiếu tool. SME thiếu Growth System.",
    category: "AI Growth System",
    readTime: "6 phút đọc",
    author: "The Anh Marketing",
    excerpt:
      "Vì sao content nhiều, ads vẫn chạy, AI vẫn dùng nhưng doanh thu không ổn định nếu thiếu hệ thống phía sau.",
    content:
      "Khi content, ads, AI và CRM hoạt động rời rạc, founder rất dễ nghĩ rằng mình thiếu tool hoặc thiếu người. Thực tế vấn đề thường nằm ở hệ thống: chưa có hành trình lead, chưa có nurture, chưa có dữ liệu ra quyết định và chưa có workflow lặp lại. Growth System giúp nối các mảnh đó thành một cơ chế vận hành.",
  },
  {
    slug: "ags-framework-attract-grow-scale",
    title: "A.G.S Framework: Attract, Grow, Scale",
    category: "AI Growth System",
    readTime: "5 phút đọc",
    author: "The Anh Marketing",
    excerpt:
      "Khung 3 bước để biến AI, content, ads, funnel, automation và CRM thành một hệ thống tăng trưởng.",
    content:
      "ATTRACT tạo traffic bằng content, AI workflow và paid media. GROW chuyển người quan tâm thành lead có niềm tin bằng funnel, nurture và authority. SCALE chuẩn hóa bằng automation, dashboard, SOP và tối ưu theo dữ liệu. Đây là cách dùng AI như hạ tầng vận hành thay vì chỉ là công cụ viết prompt.",
  },
  {
    slug: "facebook-ads-2026-trong-ai-ads-engine",
    title: "Facebook Ads 2026 trong AI Ads Engine nên nhìn gì trước?",
    category: "Performance Ads",
    readTime: "7 phút đọc",
    author: "The Anh Marketing",
    excerpt:
      "Không phải chỉ số nào cũng quan trọng như nhau. Hãy bắt đầu từ chất lượng lead, hành trình funnel và tín hiệu chuyển đổi.",
    content:
      "Một chiến dịch Facebook Ads không nên được đánh giá chỉ bằng CPM hay CPC. Cần nhìn theo chuỗi tín hiệu: traffic có đúng tệp không, content có tạo ý định không, lead có được nurture không, CRM có ghi nhận hành vi không và conversion có đủ lợi nhuận kỳ vọng không.",
  },
];
