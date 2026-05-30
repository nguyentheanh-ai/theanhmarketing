import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const tokenVersion = "v1";

type StoredProviderTokenRow = {
  user_id: string;
  facebook_user_id?: string | null;
  access_token_encrypted: string;
  token_expires_at?: string | null;
  granted_scopes?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export function isMissingFacebookProviderTokensTableError(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42P01" || message.includes("facebook_provider_tokens") || message.includes("schema cache");
}

function getVaultKey() {
  const secret = process.env.META_APP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Thiếu META_APP_SECRET hoặc SUPABASE_SERVICE_ROLE_KEY để giải mã token Facebook.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function decryptStoredFacebookToken(payload: string) {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split(".");

  if (version !== tokenVersion || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Không giải mã được token Facebook đã lưu.");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getVaultKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function normalizeStoredToken(data: StoredProviderTokenRow | null) {
  if (!data) {
    return null;
  }

  if (data.token_expires_at && new Date(data.token_expires_at).getTime() <= Date.now()) {
    return null;
  }

  return {
    userId: data.user_id,
    facebookUserId: data.facebook_user_id || null,
    accessToken: decryptStoredFacebookToken(data.access_token_encrypted),
    expiresAt: data.token_expires_at || null,
    grantedScopes: data.granted_scopes ?? [],
  };
}

export async function getLatestStoredFacebookProviderToken() {
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("facebook_provider_tokens")
    .select("user_id,facebook_user_id,access_token_encrypted,token_expires_at,granted_scopes,created_at,updated_at")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) {
    if (isMissingFacebookProviderTokensTableError(error)) {
      return null;
    }

    throw error;
  }

  for (const row of (data ?? []) as StoredProviderTokenRow[]) {
    const token = normalizeStoredToken(row);

    if (token?.grantedScopes.includes("ads_read")) {
      return token;
    }
  }

  return null;
}
