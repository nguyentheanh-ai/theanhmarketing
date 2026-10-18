import { resources as fallbackResources } from "@/data/resources";

export type ResourceItem = (typeof fallbackResources)[number] & {
  id?: string;
  thumbnail?: string;
  fileUrl?: string;
};

export type DbResource = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  file_url: string | null;
  access_type: string | null;
  created_at: string | null;
};

const bundledResourceFiles: Record<string, string> = {
  "checklist-audit-tai-khoan-quang-cao": "/tai-lieu/checklist-audit-tai-khoan-quang-cao-meta.xlsx",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function mapDbResource(resource: DbResource): ResourceItem {
  const slug = slugify(resource.title || resource.id);

  return {
    id: resource.id,
    slug,
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
    fileUrl: resource.file_url?.trim() || bundledResourceFiles[slug] || "",
  };
}

