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
    slug: "cach-hoc-facebook-ads-cho-nguoi-moi",
    title: "Cách học Facebook Ads cho người mới mà không bị lan man",
    category: "Facebook Ads",
    readTime: "6 phút đọc",
    author: "Thế Anh Marketing",
    excerpt:
      "Một lộ trình ngắn gọn để bắt đầu từ tư duy marketing, cấu trúc chiến dịch và cách đọc số liệu.",
    content:
      "Người mới thường bắt đầu bằng thao tác trong trình quản lý quảng cáo, nhưng phần quan trọng hơn là hiểu khách hàng, offer, dữ liệu và cách ra quyết định. Bài viết này là khung định hướng để học có thứ tự.",
  },
  {
    slug: "ung-dung-ai-trong-marketing-online",
    title: "Ứng dụng AI trong Marketing Online sao cho thực tế",
    category: "AI Marketing",
    readTime: "5 phút đọc",
    author: "Thế Anh Marketing",
    excerpt:
      "AI hữu ích nhất khi bạn có quy trình rõ: nghiên cứu khách hàng, viết angle, tạo biến thể và đo hiệu quả.",
    content:
      "AI không thay thế tư duy marketing, nhưng có thể tăng tốc các bước nghiên cứu, viết nháp, tạo biến thể và tổng hợp dữ liệu. Điều cần có là một quy trình rõ để đầu ra không bị lan man.",
  },
  {
    slug: "doc-chi-so-quang-cao-facebook",
    title: "Đọc chỉ số quảng cáo Facebook: nên nhìn gì trước?",
    category: "Hướng dẫn",
    readTime: "7 phút đọc",
    author: "Thế Anh Marketing",
    excerpt:
      "Không phải chỉ số nào cũng quan trọng như nhau. Hãy bắt đầu từ mục tiêu kinh doanh và tín hiệu chuyển đổi.",
    content:
      "Một chiến dịch không nên được đánh giá chỉ bằng CPM hay CPC. Cần nhìn theo chuỗi tín hiệu: phân phối, tương tác, hành động, chuyển đổi và lợi nhuận kỳ vọng.",
  },
];
