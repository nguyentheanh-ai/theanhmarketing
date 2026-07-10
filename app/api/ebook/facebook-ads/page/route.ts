import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  FACEBOOK_EBOOK_DEFAULT_BUCKET,
  getFacebookEbookPage,
} from "@/lib/ebook/facebook-ebook";
import { requireFacebookEbookAccess } from "@/lib/ebook/facebook-ebook-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateImageHeaders = {
  "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
  "Content-Type": "image/png",
};

function toPositiveInteger(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function jsonError(message: string, status: number) {
  return Response.json({ ok: false, message }, { status });
}

async function readLocalPageImage(part: number, page: number) {
  const localRoot = process.env.FACEBOOK_EBOOK_LOCAL_ROOT;

  if (!localRoot) {
    return null;
  }

  const resolvedRoot = path.resolve(localRoot);
  const filePath = path.resolve(resolvedRoot, `pages/part-${part}/${page}.png`);

  if (!filePath.startsWith(resolvedRoot + path.sep)) {
    return null;
  }

  return readFile(filePath).catch(() => null);
}

export async function GET(request: NextRequest) {
  const partNumber = toPositiveInteger(request.nextUrl.searchParams.get("part"));
  const pageNumber = toPositiveInteger(request.nextUrl.searchParams.get("page"));

  if (!partNumber || !pageNumber) {
    return jsonError("Trang ebook không hợp lệ.", 400);
  }

  const page = getFacebookEbookPage(partNumber, pageNumber);

  if (!page) {
    return jsonError("Không tìm thấy trang ebook.", 404);
  }

  const access = await requireFacebookEbookAccess(request.nextUrl.pathname);

  if (!access.ok) {
    return jsonError(access.status === 401 ? "Cần đăng nhập để đọc ebook." : "Tài khoản chưa mở quyền đọc ebook.", access.status);
  }

  const localImage = await readLocalPageImage(partNumber, pageNumber);

  if (localImage) {
    return new Response(localImage, {
      headers: {
        ...privateImageHeaders,
        "Content-Disposition": `inline; filename="facebook-ads-part-${partNumber}-page-${pageNumber}.png"`,
      },
    });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return jsonError("Chưa cấu hình kho ảnh ebook.", 503);
  }

  const bucket = process.env.FACEBOOK_EBOOK_STORAGE_BUCKET || FACEBOOK_EBOOK_DEFAULT_BUCKET;
  const { data, error } = await supabase.storage.from(bucket).download(page.storagePath);

  if (error || !data) {
    return jsonError("Chưa tìm thấy ảnh trang ebook trong kho riêng.", 404);
  }

  return new Response(await data.arrayBuffer(), {
    headers: {
      ...privateImageHeaders,
      "Content-Disposition": `inline; filename="facebook-ads-part-${partNumber}-page-${pageNumber}.png"`,
    },
  });
}
