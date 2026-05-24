import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { canAccessAdminRole, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { logSecurityEvent } from "@/lib/security/audit-log";

const mediaBucket = "media";
const maxUploadBytes = 8 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const extensionByType: Record<(typeof allowedImageTypes)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function safeSegment(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || fallback;
}

async function ensureAdminAccess() {
  if (!isAuthGuardEnabled() && process.env.NODE_ENV === "development") {
    return true;
  }

  const { adminRole } = await getCurrentAuth();
  return canAccessAdminRole(adminRole, ["owner", "editor"]);
}

function isAllowedImageType(type: string): type is (typeof allowedImageTypes)[number] {
  return allowedImageTypes.includes(type as (typeof allowedImageTypes)[number]);
}

function hasBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === "image/jpeg") {
    return hasBytes(bytes, [0xff, 0xd8, 0xff]);
  }

  if (file.type === "image/png") {
    return hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (file.type === "image/gif") {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }

  if (file.type === "image/webp") {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

export async function POST(request: Request) {
  const isAllowed = await ensureAdminAccess();

  if (!isAllowed) {
    logSecurityEvent({ action: "admin_media_upload_forbidden", request });
    return NextResponse.json(
      { ok: false, message: "Bạn không có quyền tải ảnh lên." },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, message: "Chưa cấu hình Supabase Storage." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = safeSegment(String(formData.get("folder") ?? "blog"), "blog");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Không tìm thấy file ảnh." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > maxUploadBytes) {
    logSecurityEvent({
      action: "admin_media_upload_bad_size",
      request,
      detail: { size: file.size },
    });
    return NextResponse.json(
      { ok: false, message: "Ảnh phải nhỏ hơn 8MB." },
      { status: 400 },
    );
  }

  if (!isAllowedImageType(file.type) || !(await hasValidImageSignature(file))) {
    logSecurityEvent({
      action: "admin_media_upload_bad_type",
      request,
      detail: { type: file.type || "unknown" },
    });
    return NextResponse.json(
      { ok: false, message: "Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF hợp lệ." },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    return NextResponse.json(
      { ok: false, message: "Không kiểm tra được Storage bucket." },
      { status: 500 },
    );
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === mediaBucket);

  if (!bucketExists) {
    const { error: bucketError } = await supabase.storage.createBucket(mediaBucket, {
      public: true,
      fileSizeLimit: String(maxUploadBytes),
      allowedMimeTypes: [...allowedImageTypes],
    });

    if (bucketError) {
      return NextResponse.json(
        { ok: false, message: "Không tạo được Storage bucket." },
        { status: 500 },
      );
    }
  }

  const name = safeSegment(file.name.replace(/\.[^.]+$/, ""), "image");
  const extension = extensionByType[file.type];
  const path = `${folder}/${Date.now()}-${randomUUID()}-${name}.${extension}`;
  const { error } = await supabase.storage.from(mediaBucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    logSecurityEvent({ action: "admin_media_upload_storage_error", request });
    return NextResponse.json(
      { ok: false, message: "Không tải được ảnh lên Storage." },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(mediaBucket).getPublicUrl(path);

  return NextResponse.json({ ok: true, url: publicUrl, path });
}
