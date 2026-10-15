import {readNativeMarketingSettings} from '@/lib/cloudflare/native-marketing-settings';
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
    return normalizeMarketingSettings(fallbackMarketingSettings);
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .eq("key", "marketing")
    .maybeSingle();

  if (error || !data) {
    return normalizeMarketingSettings(fallbackMarketingSettings);
  }

  const setting = data as DbSetting;
  return normalizeMarketingSettings(setting.value);
}

const getSourceMarketingSettings = unstable_cache(fetchMarketingSettings, ["site-settings-marketing"], {
  revalidate: 300,
  tags: ["site-settings", "site-settings:marketing"],
});

// Select the provider before entering the legacy cache. A warm Source entry
// must not mask native settings, and native outages must not change tracking.
export async function getMarketingSettings():Promise<MarketingSettings>{
 const native=await readNativeMarketingSettings();
 return native??getSourceMarketingSettings();
}

export type { MarketingSettings } from "@/lib/marketing-settings";
export { fallbackMarketingSettings, getAbsoluteSocialImage, normalizeMarketingSettings } from "@/lib/marketing-settings";
