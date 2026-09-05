export const SUPPORT_PRODUCT_SLUG = "support-session-30m";
export const SUPPORT_PRODUCT_TITLE = "Buổi hỗ trợ 1:1 cùng The Anh - 30 phút";
export const SUPPORT_PRICE_VND = 1_000_000;
export const SUPPORT_PRICE_LABEL = "1.000.000đ";
export const SUPPORT_DURATION_MINUTES = 30;
export const SUPPORT_HOLD_MINUTES = 20;
export const SUPPORT_MIN_LEAD_DAYS = 3;
export const SUPPORT_MAX_LEAD_DAYS = 30;
export const SUPPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const SUPPORT_TOPICS = [
  { value: "kiem-tra-quang-cao", label: "Kiểm tra quảng cáo" },
  { value: "len-quang-cao-mau", label: "Lên quảng cáo mẫu" },
  { value: "tu-van-xay-dung-he-thong", label: "Tư vấn xây dựng hệ thống" },
  { value: "noi-dung-khac", label: "Nội dung khác" },
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number]["value"];
