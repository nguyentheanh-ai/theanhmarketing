import { resources as fallbackResources } from "@/data/resources";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResourceItem = (typeof fallbackResources)[number] & {
  id?: string;
  thumbnail?: string;
  fileUrl?: string;
};

type DbResource = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  file_url: string | null;
  access_type: string | null;
  created_at: string | null;
};

const resourceSelectFields = "id,title,description,thumbnail,file_url,access_type,created_at" as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapDbResource(resource: DbResource): ResourceItem {
  return {
    id: resource.id,
    slug: slugify(resource.title || resource.id),
    title: resource.title,
    type: "Toolkit",
    access:
      resource.access_type === "enrolled_only"
        ? "Chỉ học viên"
        : resource.access_type === "paid"
          ? "Trả phí"
          : "Miễn phí",
    description: resource.description ?? "",
    thumbnail: resource.thumbnail ?? "",
    fileUrl: resource.file_url ?? "",
  };
}

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
