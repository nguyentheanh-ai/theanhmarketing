import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const courseCopy = {
  "ai-fullstack-marketing-system": {
    short_description:
      "Học cách xây hệ thống marketing ứng dụng AI từ chiến lược, nội dung, quảng cáo đến đo lường hiệu quả.",
    description:
      "Khóa học giúp bạn nhìn marketing như một hệ thống vận hành trọn vẹn: xây offer, tạo nội dung, triển khai traffic, dùng dữ liệu và AI workflow để tối ưu tăng trưởng thực tế.",
    cta_text: "Đăng ký khóa học",
  },
  "performance-marketing-and-growth-ads": {
    short_description:
      "Xây nền tảng Performance Marketing và Growth Ads để chạy chiến dịch có mục tiêu, có dữ liệu và có kỷ luật.",
    description:
      "Khóa học tập trung vào tư duy tăng trưởng, cấu trúc chiến dịch, test creative, đo lường hiệu quả và cách dùng AI để rút ngắn vòng lặp tối ưu.",
    cta_text: "Đăng ký khóa học",
  },
  "content-traffic-engine": {
    short_description:
      "Thiết kế hệ thống nội dung tạo traffic bền vững cho thương hiệu, sản phẩm và phễu bán hàng.",
    description:
      "Bạn sẽ học cách xây trụ cột nội dung, lịch xuất bản, quy trình sản xuất, phân phối đa kênh và dùng AI để tăng tốc nhưng vẫn giữ chất lượng.",
    cta_text: "Đăng ký khóa học",
  },
  "marketing-data-analytics": {
    short_description:
      "Biến dữ liệu marketing thành insight rõ ràng để ra quyết định tốt hơn trong chiến dịch thực tế.",
    description:
      "Khóa học hướng dẫn cách đọc số liệu, thiết kế dashboard, hiểu chỉ số cốt lõi và dùng dữ liệu để tối ưu nội dung, quảng cáo, funnel và doanh thu.",
    cta_text: "Đăng ký khóa học",
  },
  "brandformance-foundation": {
    short_description:
      "Kết hợp nền tảng thương hiệu với hiệu quả bán hàng để marketing vừa có chiều sâu vừa có kết quả.",
    description:
      "Khóa học giúp bạn xây định vị, thông điệp, hệ nội dung và chiến dịch theo hướng Brandformance: không chỉ đẹp, mà còn đo được tác động kinh doanh.",
    cta_text: "Đăng ký khóa học",
  },
  "founder-marketing-blueprint": {
    short_description:
      "Lộ trình marketing dành cho founder muốn hiểu đúng khách hàng, offer, kênh tăng trưởng và cách triển khai gọn.",
    description:
      "Khóa học giúp founder xây bản đồ marketing thực dụng: từ định vị, thông điệp, nội dung, traffic đến hệ thống đo lường để ra quyết định nhanh hơn.",
    cta_text: "Đăng ký khóa học",
  },
  "ai-content-and-automation-workflow": {
    short_description:
      "Xây workflow nội dung và tự động hóa bằng AI để tiết kiệm thời gian mà vẫn giữ chất lượng triển khai.",
    description:
      "Bạn sẽ học cách dùng AI trong nghiên cứu, viết nháp, biến đổi định dạng, quản lý lịch nội dung và tự động hóa các bước lặp lại trong marketing.",
    cta_text: "Đăng ký khóa học",
  },
  "full-funnel-campaign-strategy": {
    short_description:
      "Thiết kế chiến dịch full funnel từ nhận biết, cân nhắc đến chuyển đổi và chăm sóc sau mua.",
    description:
      "Khóa học giúp bạn hiểu vai trò từng tầng phễu, chọn thông điệp phù hợp, phân bổ kênh, đo lường và tối ưu campaign theo mục tiêu kinh doanh.",
    cta_text: "Đăng ký khóa học",
  },
  "marketing-operation-management": {
    short_description:
      "Xây hệ vận hành marketing có quy trình, người phụ trách, tài liệu và nhịp đo lường rõ ràng.",
    description:
      "Khóa học giúp đội marketing làm việc có hệ thống hơn: lập kế hoạch, giao việc, quản lý tài sản nội dung, theo dõi số liệu và cải tiến quy trình bằng AI.",
    cta_text: "Đăng ký khóa học",
  },
  "facebook-ads-2026": {
    short_description:
      "Học cách xây hệ thống Marketing và AI ứng dụng cho quảng cáo, nội dung, dữ liệu và tối ưu tăng trưởng theo lộ trình thực chiến.",
    description:
      "Khóa học giúp bạn hiểu marketing như một hệ thống: tư duy khách hàng, offer, nội dung, traffic, dữ liệu, AI workflow và cách tối ưu chiến dịch để áp dụng vào công việc thật.",
    cta_text: "Đăng ký khóa học",
  },
};

for (const [slug, payload] of Object.entries(courseCopy)) {
  const { error } = await supabase.from("courses").update(payload).eq("slug", slug);
  if (error) {
    throw new Error(`${slug}: ${error.message}`);
  }
  console.log(`Updated ${slug}`);
}
