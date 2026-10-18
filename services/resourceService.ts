import { resources as fallbackResources } from "@/data/resources";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {mapDbResource,type DbResource} from "@/lib/resources/resource-projection";
export type {ResourceItem} from "@/lib/resources/resource-projection";
const resourceSelectFields = "id,title,description,thumbnail,file_url,access_type,created_at" as const;

async function fetchResources() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return fallbackResources;
  }

  const { data, error } = await supabase
    .from("resources")
    .select(resourceSelectFields)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return fallbackResources;
  }

  return (data as DbResource[]).map(mapDbResource);
}

export const getResources = unstable_cache(fetchResources, ["resources"], {
  revalidate: 120,
  tags: ["content", "resources"],
});
