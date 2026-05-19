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

export async function getMarketingSettings(): Promise<MarketingSettings> {
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

export type { MarketingSettings } from "@/lib/marketing-settings";
export { fallbackMarketingSettings, getAbsoluteSocialImage, normalizeMarketingSettings } from "@/lib/marketing-settings";
