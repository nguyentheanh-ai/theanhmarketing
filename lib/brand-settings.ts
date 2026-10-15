import {siteConfig} from "@/data/site";
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

export const fallbackBrandSettings: BrandSettings = {
  name: siteConfig.name,
  shortName: siteConfig.shortName,
  logoMark: siteConfig.logoMark,
  logoImage: siteConfig.logoImage,
  tagline: siteConfig.tagline,
  phone: siteConfig.phone,
  email: siteConfig.email,
  primaryCtaLabel: "Khám phá Growth System",
  primaryCtaHref: "/dang-ky",
  heroImageUrl: "",
  heroVideoUrl: "",
};

export function normalizeBrandSettings(value:Partial<BrandSettings>|null):BrandSettings{
 const v=value??{};
 return {...fallbackBrandSettings,...v,logoImage:v.logoImage||fallbackBrandSettings.logoImage,logoMark:v.logoMark||fallbackBrandSettings.logoMark};
}
