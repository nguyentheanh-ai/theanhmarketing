import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";

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

async function ensureAdminAccess() {
  if (!isAuthGuardEnabled()) {
    return true;
  }

  const { isAdmin } = await getCurrentAuth();
  return isAdmin;
}

export async function POST(request: Request) {
  if (!(await ensureAdminAccess())) {
    return NextResponse.json(
      { ok: false, message: "Bạn không có quyền upload media." },
      { status: 403 },
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !serviceRoleKey) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Thiếu SUPABASE_SERVICE_ROLE_KEY nên server không thể tự tạo bucket/upload media.",
      },
      { status: 501 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = safeSegment(String(formData.get("folder") ?? "uploads")) || "uploads";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Không tìm thấy file upload." },
      { status: 400 },
    );
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    return NextResponse.json(
      { ok: false, message: `Không đọc được bucket Supabase: ${listError.message}` },
      { status: 500 },
    );
  }

  if (!buckets.some((bucket) => bucket.name === mediaBucket)) {
    const { error: createError } = await supabase.storage.createBucket(mediaBucket, {
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
      fileSizeLimit: "8MB",
      public: true,
    });

    if (createError) {
      return NextResponse.json(
        { ok: false, message: `Không tạo được bucket media: ${createError.message}` },
        { status: 500 },
      );
    }
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const name = safeSegment(file.name.replace(/\.[^.]+$/, "")) || "image";
  const path = `${folder}/${Date.now()}-${name}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(mediaBucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, message: `Không upload được ảnh: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { data } = supabase.storage.from(mediaBucket).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
