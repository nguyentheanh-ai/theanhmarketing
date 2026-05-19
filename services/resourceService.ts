import { resources as mockResources } from "@/data/resources";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResourceItem = (typeof mockResources)[number] & {
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

export async function getResources() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return mockResources;
  }

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return mockResources;
  }

  return (data as DbResource[]).map(mapDbResource);
}
