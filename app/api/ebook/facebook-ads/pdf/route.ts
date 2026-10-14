import { NextRequest, NextResponse } from "next/server";
import {
  FACEBOOK_EBOOK_PDF_DEFAULT_BUCKET,
  FACEBOOK_EBOOK_PDF_FILE_NAME,
  FACEBOOK_EBOOK_PDF_OBJECT_PATH,
} from "@/lib/ebook/facebook-ebook";
import { requireFacebookEbookAccess } from "@/lib/ebook/facebook-ebook-access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signedStagingStorageUrl } from "@/lib/cloudflare/storage-r2-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function hasAcceptedTerms(request: NextRequest) {
  const accepted = request.nextUrl.searchParams.get("accepted");
  return accepted === "1" || accepted === "true";
}

function wantsJson(request: NextRequest) {
  return request.nextUrl.searchParams.get("format") === "json";
}

export async function GET(request: NextRequest) {
  if (!hasAcceptedTerms(request)) {
    return jsonError("Vui lòng đọc và đồng ý điều khoản trước khi tải file PDF.", 412);
  }

  const access = await requireFacebookEbookAccess(request.nextUrl.pathname);

  if (!access.ok) {
    return jsonError(
      access.status === 401
        ? "Cần đăng nhập để tải file PDF."
        : "Tài khoản chưa mở quyền tải file PDF.",
      access.status,
    );
  }

  const bucket = process.env.FACEBOOK_EBOOK_PDF_STORAGE_BUCKET || FACEBOOK_EBOOK_PDF_DEFAULT_BUCKET;
  const objectPath = process.env.FACEBOOK_EBOOK_PDF_OBJECT_PATH || FACEBOOK_EBOOK_PDF_OBJECT_PATH;
  if (process.env.CF_R2_STAGE_PRIVATE_DELIVERY === "true") {
    // The existing entitlement check above must succeed before creating any link.
    if (!access.userId && !access.isAdmin) return jsonError("Cần đăng nhập để tải file PDF.", 401);
    const secret = process.env.R2_PRIVATE_URL_SECRET;
    if (!secret) return jsonError("Chưa cấu hình kho lưu trữ PDF ebook.", 503);
    const url = await signedStagingStorageUrl(request.nextUrl.origin, bucket, objectPath, secret, FACEBOOK_EBOOK_PDF_FILE_NAME);
    if (wantsJson(request)) {
      return NextResponse.json({ ok: true, url }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return jsonError("Chưa cấu hình kho lưu trữ PDF ebook.", 503);
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 600, {
    download: FACEBOOK_EBOOK_PDF_FILE_NAME,
  });

  if (error || !data?.signedUrl) {
    return jsonError("Chưa tìm thấy file PDF ebook trong kho riêng.", 404);
  }

  if (wantsJson(request)) {
    return NextResponse.json({ ok: true, url: data.signedUrl });
  }

  return NextResponse.redirect(data.signedUrl, 302);
}
