export type AcademyProduct = {
  slug: string;
  courseSlug: string;
  title: string;
  shortTitle: string;
  price: string;
  originalPrice: string;
  badge: string;
  eyebrow: string;
  audience: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  thumbnail: string;
  nextOffer: string;
  trust: string[];
  pains: string[];
  opportunity: string;
  mechanismTitle: string;
  mechanism: Array<{ step: string; title: string; result: string }>;
  outputs: string[];
  curriculum: Array<{ title: string; benefit: string; output: string }>;
  bonuses: string[];
  fit: string[];
  notFit: string[];
  offerItems: string[];
  faqs: Array<{ question: string; answer: string }>;
};

export const facebookAdsAcademyProduct: AcademyProduct = {
  slug: "facebook-ads-master-2026",
  courseSlug: "facebook-ads-2026",
  title: "Quảng cáo Facebook Master 2026",
  shortTitle: "Facebook Ads Master 2026",
  price: "99K",
  originalPrice: "799K",
  badge: "Facebook Ads 2026 · AI Ads Engine · Giá mở khóa 99K",
  eyebrow: "AI Ads Engine",
  audience: "Người mới, chủ shop nhỏ, freelancer, marketer junior và solopreneur.",
  headline: "Chạy Facebook Ads có hệ thống, không đốt tiền mò mẫm.",
  subheadline:
    "Mình giúp các bạn chuẩn bị offer, viết content ads, setup chiến dịch cơ bản và đọc chỉ số để biết nên giữ, tắt hay sửa mẫu nào.",
  primaryCta: "Đăng ký ngay - chỉ 99K",
  secondaryCta: "Xem nội dung khóa học",
  thumbnail: "/course-thumbnails/quang-cao-facebook-master-2026.webp",
  nextOffer: "Performance Marketing With AI - 799K",
  trust: ["AI Ads Engine", "Checklist setup chiến dịch", "Mẫu content quảng cáo", "Upsell path rõ ràng"],
  pains: [
    "Chạy theo cảm tính, thấy ai làm gì thì bắt chước vậy.",
    "Viết ads nhưng không biết hook nào kéo đúng khách.",
    "Không đọc được CTR, CPC, CPL, CPA nên không biết ads fail vì đâu.",
    "Đổi target, đổi ngân sách liên tục nhưng thiếu quy trình test.",
    "Có tin nhắn nhưng khách hỏi rồi im vì offer hoặc inbox chưa rõ.",
  ],
  opportunity:
    "Facebook Ads 2026 không chỉ là chọn target. Muốn ra lead/đơn, các bạn cần một hệ nhỏ: insight đúng, offer rõ, content đúng nỗi đau, campaign gọn và dữ liệu đủ để ra quyết định.",
  mechanismTitle: "AI Ads Engine 5 bước",
  mechanism: [
    { step: "01", title: "Research", result: "Xác định khách hàng, nỗi đau, mong muốn." },
    { step: "02", title: "Offer", result: "Chuyển sản phẩm thành lời chào mua dễ hiểu." },
    { step: "03", title: "Creative", result: "Viết hook, content, script quảng cáo bằng AI." },
    { step: "04", title: "Campaign", result: "Setup chiến dịch cơ bản theo mục tiêu." },
    { step: "05", title: "Data", result: "Đọc chỉ số và ra quyết định tắt, sửa hoặc tăng." },
  ],
  outputs: [
    "Tự chuẩn bị checklist trước khi chạy ads.",
    "Viết được 3 mẫu content quảng cáo đầu tiên.",
    "Biết setup chiến dịch message hoặc conversion cơ bản.",
    "Biết đọc CTR, CPC, CPL, CPA và ROAS ở mức nền tảng.",
    "Biết cách test 3 mẫu ads trong 3-7 ngày.",
  ],
  curriculum: [
    { title: "Tư duy Facebook Ads 2026", benefit: "Không chỉ bấm nút, phải có offer và phễu.", output: "Bản đồ tư duy ads theo hệ thống." },
    { title: "Chuẩn bị trước khi chạy", benefit: "Sản phẩm, insight, avatar khách, thông điệp.", output: "Checklist sẵn sàng chạy ads." },
    { title: "Cấu trúc chiến dịch cơ bản", benefit: "Awareness, message, conversion, retarget.", output: "Khung campaign dễ triển khai." },
    { title: "Viết content quảng cáo bằng AI", benefit: "Hook, pain, proof, CTA.", output: "3 mẫu content ads đầu tiên." },
    { title: "Đọc chỉ số cơ bản", benefit: "CTR, CPC, CPL, CPA, ROAS.", output: "Bảng đọc tín hiệu chiến dịch." },
    { title: "Checklist test 3 mẫu ads", benefit: "Biết thử nghiệm trong 3-7 ngày.", output: "Plan test ads 7 ngày." },
  ],
  bonuses: [
    "10 hook quảng cáo Facebook cho người mới.",
    "Checklist setup chiến dịch đầu tiên.",
    "Prompt AI viết content quảng cáo.",
    "Bảng đọc chỉ số ads cơ bản.",
    "Mẫu plan test ads 7 ngày.",
  ],
  fit: [
    "Các bạn mới bắt đầu chạy Facebook Ads.",
    "Các bạn có sản phẩm nhưng chưa biết viết quảng cáo.",
    "Các bạn từng boost bài nhưng không biết đo hiệu quả.",
    "Các bạn muốn hiểu nền tảng trước khi học sâu Performance Marketing.",
  ],
  notFit: [
    "Các bạn muốn khóa chuyên sâu scale ngân sách lớn.",
    "Các bạn cần đội ngũ làm ads thay.",
    "Các bạn chưa có sản phẩm hoặc offer nào để test.",
  ],
  offerItems: [
    "Khóa học video ngắn.",
    "Checklist chạy ads đầu tiên.",
    "Mẫu content quảng cáo.",
    "Prompt AI viết ads.",
    "Quyền cập nhật tài liệu khi khóa được nâng cấp.",
  ],
  faqs: [
    { question: "Người mới hoàn toàn có học được không?", answer: "Có. Khóa này được thiết kế cho người mới, chủ shop nhỏ và người cần hiểu nền tảng trước khi đổ ngân sách." },
    { question: "Có cần tài khoản quảng cáo sẵn không?", answer: "Không bắt buộc. Nếu có sẵn tài khoản, các bạn sẽ áp dụng nhanh hơn khi làm checklist và bài test." },
    { question: "Có cần ngân sách lớn không?", answer: "Không. Mục tiêu là biết cách test nhỏ, đọc dữ liệu và tránh đốt tiền trước khi tăng ngân sách." },
    { question: "Khóa này có dạy chuyên sâu scale ads không?", answer: "Không phải khóa scale chuyên sâu. Sau khóa này, lộ trình phù hợp là Performance Marketing With AI." },
    { question: "Học xong có được cập nhật tài liệu không?", answer: "Có. Khi nội dung được nâng cấp, tài liệu trong hệ học viên sẽ được cập nhật theo." },
    { question: "Sau khóa này nên học tiếp gì?", answer: "Performance Marketing With AI để đi sâu hơn vào tracking, landing page, CRM và tối ưu chuyển đổi." },
  ],
};
