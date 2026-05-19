import { unstable_cache } from "next/cache";
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
  title: "Nhận AI Growth Toolkit",
  description: "Đăng ký để nhận toolkit, chẩn đoán lộ trình và ưu đãi khi bắt đầu với AI Ads Engine hoặc workshop.",
  couponCode: "THEANH200",
  discountLabel: "Ưu đãi 200.000đ",
  items: [
    "Tặng AI Growth System Audit Checklist",
    "Tặng Funnel Template 7 ngày",
    "Tư vấn chọn lộ trình Growth System phù hợp",
  ],
  ctaLabel: "Nhận toolkit",
  ctaHref: "/dang-ky",
};

async function fetchOfferSettings(): Promise<OfferSettings> {
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

export const getOfferSettings = unstable_cache(fetchOfferSettings, ["site-settings-offer"], {
  revalidate: 300,
  tags: ["site-settings", "site-settings:offer"],
});
