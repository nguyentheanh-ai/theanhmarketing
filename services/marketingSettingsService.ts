import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fallbackMarketingSettings,
  normalizeMarketingSettings,
  type MarketingSettings,
} from "@/lib/marketing-settings";

type DbSetting = {
  key: string;
  value: Partial<MarketingSettings> | null;
};

async function fetchMarketingSettings(): Promise<MarketingSettings> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackMarketingSettings;
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .eq("key", "marketing")
    .maybeSingle();

  if (error || !data) {
    return fallbackMarketingSettings;
  }

  const setting = data as DbSetting;
  return normalizeMarketingSettings(setting.value);
}

export const getMarketingSettings = unstable_cache(fetchMarketingSettings, ["site-settings-marketing"], {
  revalidate: 300,
  tags: ["site-settings", "site-settings:marketing"],
});

export type { MarketingSettings } from "@/lib/marketing-settings";
export { fallbackMarketingSettings, getAbsoluteSocialImage, normalizeMarketingSettings } from "@/lib/marketing-settings";
