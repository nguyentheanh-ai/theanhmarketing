import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseAuthServerClient, getCurrentAuth, isAuthGuardEnabled } from "@/lib/auth/session";
import { normalizeMarketingSettings } from "@/lib/marketing-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowedKeys = new Set(["brand", "offer", "marketing"]);

function cleanSettingsValue(key: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Dữ liệu cấu hình không hợp lệ.");
  }

  if (key === "marketing") {
    return normalizeMarketingSettings(value);
  }

  return value;
}

export async function POST(request: Request) {
  const { isAdmin } = await getCurrentAuth();

  if (isAuthGuardEnabled() && !isAdmin) {
    return NextResponse.json(
      { ok: false, message: "Bạn cần đăng nhập admin để lưu cấu hình." },
      { status: 403 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    key?: string;
    value?: unknown;
  } | null;
  const key = String(payload?.key ?? "").trim();

  if (!allowedKeys.has(key)) {
    return NextResponse.json(
      { ok: false, message: "Nhóm cấu hình không hợp lệ." },
      { status: 400 },
    );
  }

  let value: unknown;

  try {
    value = cleanSettingsValue(key, payload?.value);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Dữ liệu cấu hình không hợp lệ." },
      { status: 400 },
    );
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseAdminClient()
    : await createSupabaseAuthServerClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Chưa cấu hình Supabase để lưu cấu hình website." },
      { status: 500 },
    );
  }

  const { error } = await supabase.from("site_settings").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error.message.includes("row-level security")
            ? "Supabase đang chặn ghi site_settings. Hãy đăng nhập admin có trong admin_users hoặc cấu hình SUPABASE_SERVICE_ROLE_KEY cho server."
            : error.message,
      },
      { status: 500 },
    );
  }

  revalidateTag("site-settings", "max");
  revalidateTag(`site-settings:${key}`, "max");

  return NextResponse.json({ ok: true });
}
