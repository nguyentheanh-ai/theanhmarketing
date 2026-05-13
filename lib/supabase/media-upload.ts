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
  const formData = new FormData();
  formData.set("file", file);
  formData.set("folder", folder);

  const serverUpload = await fetch("/api/admin/media/upload", {
    body: formData,
    method: "POST",
  });

  if (serverUpload.ok) {
    const result = (await serverUpload.json()) as { ok: boolean; url?: string; message?: string };

    if (result.ok && result.url) {
      return result.url;
    }
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${safeSegment(folder) || "uploads"}/${Date.now()}-${safeSegment(
    file.name.replace(/\.[^.]+$/, ""),
  )}.${extension}`;

  const { error } = await supabase.storage.from(mediaBucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: true,
  });

  if (error) {
    let serverMessage = "";
    try {
      const result = (await serverUpload.json()) as { message?: string };
      serverMessage = result.message ? ` Server upload: ${result.message}` : "";
    } catch {
      serverMessage = "";
    }

    throw new Error(
      `${error.message}. Kiểm tra Supabase Storage bucket "${mediaBucket}" và policy upload.${serverMessage}`,
    );
  }

  const { data } = supabase.storage.from(mediaBucket).getPublicUrl(path);
  return data.publicUrl;
}
