import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const bucketName = process.env.FACEBOOK_EBOOK_STORAGE_BUCKET || "facebook-ads-ebook-2026";
const manifestPath = process.env.FACEBOOK_EBOOK_MANIFEST_PATH || "E:/Kinh doanh Ebook/ebook-data/manifest.json";
const sourceRoot = process.env.FACEBOOK_EBOOK_SOURCE_ROOT || "E:/Kinh doanh Ebook";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensurePrivateBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Cannot list Supabase buckets: ${listError.message}`);
  }

  if (buckets?.some((bucket) => bucket.name === bucketName)) {
    return;
  }

  const { error } = await supabase.storage.createBucket(bucketName, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "application/json"],
  });

  if (error) {
    throw new Error(`Cannot create private bucket ${bucketName}: ${error.message}`);
  }
}

async function uploadFile(objectPath, filePath, contentType) {
  const body = await fs.readFile(filePath);
  const { error } = await supabase.storage.from(bucketName).upload(objectPath, body, {
    cacheControl: "31536000",
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed for ${objectPath}: ${error.message}`);
  }
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  let uploaded = 0;

  await ensurePrivateBucket();
  await supabase.storage.from(bucketName).upload("manifest.json", JSON.stringify(manifest, null, 2), {
    cacheControl: "300",
    contentType: "application/json",
    upsert: true,
  });

  for (const part of manifest.parts) {
    for (const page of part.pages) {
      const imagePath = path.resolve(sourceRoot, page.image);
      const objectPath = `pages/part-${part.part}/${page.page}.png`;

      await uploadFile(objectPath, imagePath, "image/png");
      uploaded += 1;

      if (uploaded % 25 === 0 || uploaded === manifest.totalPages) {
        console.log(`Uploaded ${uploaded}/${manifest.totalPages} ebook pages.`);
      }
    }
  }

  console.log(`Done. Private bucket: ${bucketName}. Pages uploaded: ${uploaded}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
