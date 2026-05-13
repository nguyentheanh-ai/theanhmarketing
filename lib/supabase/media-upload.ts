import type { SupabaseClient } from "@supabase/supabase-js";

const mediaBucket = "media";

function safeSegment(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function uploadMediaFile({
  file,
  folder,
  supabase,
}: {
  file: File;
  folder: string;
  supabase: SupabaseClient;
}) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${safeSegment(folder) || "uploads"}/${Date.now()}-${safeSegment(
    file.name.replace(/\.[^.]+$/, ""),
  )}.${extension}`;

  const { error } = await supabase.storage.from(mediaBucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: true,
  });

  if (error) {
    throw new Error(
      `${error.message}. Kiểm tra Supabase Storage bucket "${mediaBucket}" và policy upload.`,
    );
  }

  const { data } = supabase.storage.from(mediaBucket).getPublicUrl(path);
  return data.publicUrl;
}
