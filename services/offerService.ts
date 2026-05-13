import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OfferSettings = {
  enabled: boolean;
  title: string;
  description: string;
  couponCode: string;
  discountLabel: string;
  items: string[];
  ctaLabel: string;
  ctaHref: string;
};

type DbSetting = {
  key: string;
  value: Partial<OfferSettings> | null;
};

export const fallbackOfferSettings: OfferSettings = {
  enabled: true,
  title: "Ưu đãi dành cho bạn",
  description: "Nhận tư vấn lộ trình, tài liệu thực hành và mã giảm giá khi đăng ký khóa học.",
  couponCode: "THEANH200",
  discountLabel: "Giảm 200.000đ",
  items: [
    "Tặng checklist triển khai sau khóa học",
    "Tặng template kế hoạch 30 ngày",
    "Tư vấn chọn lộ trình phù hợp",
  ],
  ctaLabel: "Nhận ưu đãi",
  ctaHref: "/dang-ky",
};

export async function getOfferSettings(): Promise<OfferSettings> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackOfferSettings;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .eq("key", "offer")
    .maybeSingle();

  if (error || !data) {
    return fallbackOfferSettings;
  }

  const setting = data as DbSetting;
  const value = setting.value ?? {};

  return {
    ...fallbackOfferSettings,
    ...value,
    items: Array.isArray(value.items) && value.items.length > 0 ? value.items : fallbackOfferSettings.items,
  };
}
