import {unstable_cache} from "next/cache";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {fallbackBrandSettings,normalizeBrandSettings,type BrandSettings} from '@/lib/brand-settings';
import {readNativeBrandSettings} from '@/lib/cloudflare/native-marketing-settings';
export {fallbackBrandSettings,type BrandSettings} from '@/lib/brand-settings';
async function fetchBrandSettings(): Promise<BrandSettings> {
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

  const setting = data as {key:string;value:BrandSettings|null};

  return normalizeBrandSettings(setting.value);
}

const getSourceBrandSettings = unstable_cache(fetchBrandSettings, ["site-settings-brand"], {
  revalidate: 300,
  tags: ["site-settings", "site-settings:brand"],
});

export async function getBrandSettings():Promise<BrandSettings>{const native=await readNativeBrandSettings();return native??getSourceBrandSettings();}
