import { siteConfig } from "@/data/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BrandSettings = {
  name: string;
  shortName: string;
  logoMark: string;
  logoImage: string;
  tagline: string;
  phone: string;
  email: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  heroImageUrl: string;
  heroVideoUrl: string;
};

type DbSetting = {
  key: string;
  value: BrandSettings | null;
};

export const fallbackBrandSettings: BrandSettings = {
  name: siteConfig.name,
  shortName: siteConfig.shortName,
  logoMark: siteConfig.logoMark,
  logoImage: siteConfig.logoImage,
  tagline: siteConfig.tagline,
  phone: siteConfig.phone,
  email: siteConfig.email,
  primaryCtaLabel: "Khám phá hệ sinh thái",
  primaryCtaHref: "/khoa-hoc",
  heroImageUrl: "",
  heroVideoUrl: "",
};

export async function getBrandSettings(): Promise<BrandSettings> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackBrandSettings;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .eq("key", "brand")
    .maybeSingle();

  if (error || !data) {
    return fallbackBrandSettings;
  }

  const setting = data as DbSetting;

  const value: Partial<BrandSettings> = setting.value ?? {};

  return {
    ...fallbackBrandSettings,
    ...value,
    logoImage: value.logoImage || fallbackBrandSettings.logoImage,
    logoMark: value.logoMark || fallbackBrandSettings.logoMark,
  };
}
