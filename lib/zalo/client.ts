import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PendingPaymentZbsPayload } from "@/lib/zalo/pending-payment";
import zbsContract from "@/tests/fixtures/zalo-zbs-contract.json";

type ZaloClientResult =
  | {
      ok: true;
      retryable: false;
      reason: null;
      status: number;
      messageId: string;
    }
  | {
      ok: false;
      retryable: boolean;
      reason: string;
      status?: number;
    };

type StoredCredentials =
  | {
      state: "ready";
      accessToken: string;
      refreshToken: string;
      accessExpiresAt: string;
    }
  | { state: "missing" }
  | { state: "error" };

type RefreshClaim =
  | { state: "fresh"; accessToken: string; accessExpiresAt: string }
  | { state: "claimed"; leaseToken: string; refreshToken: string }
  | { state: "busy" }
  | { state: "missing" }
  | { state: "error" };

type RefreshFinish = { state: "ready" | "lost_lease" | "error" };

export type ZaloCredentialStore = {
  get(): Promise<StoredCredentials>;
  claimRefresh(force: boolean): Promise<RefreshClaim>;
  finishRefresh(input: {
    leaseToken: string;
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
  }): Promise<RefreshFinish>;
};

type ClientOptions = {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  credentialStore?: ZaloCredentialStore;
};

type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; retryable: boolean; reason: string; status?: number };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown) {
  const timestamp = Date.parse(text(value));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function createSupabaseCredentialStore(): ZaloCredentialStore {
  return {
    async get() {
      const client = createSupabaseAdminClient();
      if (!client) return { state: "error" };
      const result = await client.rpc("get_zalo_oauth_credentials");
      if (result.error) return { state: "error" };
      const row = asRecord(result.data);
      if (row.credential_state === "missing") return { state: "missing" };
      const accessToken = text(row.access_token);
      const refreshToken = text(row.refresh_token);
      const accessExpiresAt = text(row.access_expires_at);
      if (!accessToken || !refreshToken || !parseDate(accessExpiresAt)) {
        return { state: "error" };
      }
      return { state: "ready", accessToken, refreshToken, accessExpiresAt };
    },

    async claimRefresh(force) {
      const client = createSupabaseAdminClient();
      if (!client) return { state: "error" };
      const result = await client.rpc("claim_zalo_oauth_refresh", {
        p_force: force,
      });
      if (result.error) return { state: "error" };
      const row = asRecord(result.data);
      if (row.refresh_state === "missing") return { state: "missing" };
      if (row.refresh_state === "busy") return { state: "busy" };
      if (row.refresh_state === "fresh") {
        const accessToken = text(row.access_token);
        const accessExpiresAt = text(row.access_expires_at);
        return accessToken && parseDate(accessExpiresAt)
          ? { state: "fresh", accessToken, accessExpiresAt }
          : { state: "error" };
      }
      if (row.refresh_state === "claimed") {
        const leaseToken = text(row.lease_token);
        const refreshToken = text(row.refresh_token);
        return leaseToken && refreshToken
          ? { state: "claimed", leaseToken, refreshToken }
          : { state: "error" };
      }
      return { state: "error" };
    },

    async finishRefresh(input) {
      const client = createSupabaseAdminClient();
      if (!client) return { state: "error" };
      const result = await client.rpc("finish_zalo_oauth_refresh", {
        p_lease_token: input.leaseToken,
        p_access_token: input.accessToken,
        p_refresh_token: input.refreshToken,
        p_access_expires_at: input.accessExpiresAt,
      });
      if (result.error) return { state: "error" };
      const state = text(asRecord(result.data).refresh_state);
      return state === "ready" || state === "lost_lease"
        ? { state }
        : { state: "error" };
    },
  };
}

function providerFailure(
  status: number,
): Extract<ZaloClientResult, { ok: false }> {
  if (status === 429 || status >= 500) {
    return {
      ok: false,
      retryable: true,
      reason: "zalo_provider_unavailable",
      status,
    };
  }
  return {
    ok: false,
    retryable: false,
    reason: "zalo_request_rejected",
    status,
  };
}

export function createZaloZbsClient(options: ClientOptions = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const credentialStore = options.credentialStore ?? createSupabaseCredentialStore();
  const appId = text(env.ZALO_APP_ID);
  const appSecret = text(env.ZALO_APP_SECRET);
  const templateId = text(env.ZALO_ZNS_PENDING_PAYMENT_TEMPLATE_ID);

  async function refreshAccessToken(force: boolean): Promise<AccessTokenResult> {
    const claim = await credentialStore.claimRefresh(force);
    if (claim.state === "fresh") {
      return { ok: true, accessToken: claim.accessToken };
    }
    if (claim.state === "busy") {
      return { ok: false, retryable: true, reason: "zalo_refresh_busy" };
    }
    if (claim.state === "missing") {
      return { ok: false, retryable: false, reason: "missing_zalo_credentials" };
    }
    if (claim.state === "error") {
      return { ok: false, retryable: true, reason: "zalo_credential_store_unavailable" };
    }

    let response: Response;
    try {
      response = await fetchImpl(zbsContract.oauth_refresh.url, {
        method: zbsContract.oauth_refresh.method,
        headers: {
          "Content-Type": zbsContract.oauth_refresh.content_type,
          [zbsContract.oauth_refresh.secret_header]: appSecret,
        },
        body: new URLSearchParams({
          refresh_token: claim.refreshToken,
          app_id: appId,
          grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        reason: error instanceof Error && error.name === "AbortError"
          ? "zalo_timeout"
          : "zalo_network_error",
      };
    }

    if (!response.ok) {
      return providerFailure(response.status);
    }

    let body: Record<string, unknown>;
    try {
      body = asRecord(await response.json());
    } catch {
      return { ok: false, retryable: true, reason: "zalo_invalid_refresh_response" };
    }
    const accessToken = text(body.access_token);
    const refreshToken = text(body.refresh_token);
    const expiresIn = Number(body.expires_in);
    if (
      accessToken.length < 16 ||
      refreshToken.length < 16 ||
      !Number.isFinite(expiresIn) ||
      expiresIn <= 0
    ) {
      return { ok: false, retryable: true, reason: "zalo_invalid_refresh_response" };
    }

    const accessExpiresAt = new Date(now() + expiresIn * 1000).toISOString();
    const finish = await credentialStore.finishRefresh({
      leaseToken: claim.leaseToken,
      accessToken,
      refreshToken,
      accessExpiresAt,
    });
    if (finish.state !== "ready") {
      return { ok: false, retryable: true, reason: "zalo_refresh_lost_lease" };
    }

    return { ok: true, accessToken };
  }

  async function getAccessToken(): Promise<AccessTokenResult> {
    const credentials = await credentialStore.get();
    if (credentials.state === "missing") {
      return { ok: false, retryable: false, reason: "missing_zalo_credentials" };
    }
    if (credentials.state === "error") {
      return { ok: false, retryable: true, reason: "zalo_credential_store_unavailable" };
    }
    if (parseDate(credentials.accessExpiresAt) > now() + 5 * 60_000) {
      return { ok: true, accessToken: credentials.accessToken };
    }
    return refreshAccessToken(false);
  }

  async function sendOnce(
    payload: PendingPaymentZbsPayload,
    accessToken: string,
  ): Promise<ZaloClientResult> {
    let response: Response;
    try {
      response = await fetchImpl(zbsContract.send.url, {
        method: zbsContract.send.method,
        headers: {
          "Content-Type": zbsContract.send.content_type,
          [zbsContract.send.access_token_header]: accessToken,
        },
        body: JSON.stringify({
          phone: payload.phone,
          template_id: templateId,
          template_data: payload.templateData,
          tracking_id: payload.trackingId,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      return {
        ok: false,
        retryable: true,
        reason: error instanceof Error && error.name === "AbortError"
          ? "zalo_timeout"
          : "zalo_network_error",
      };
    }

    if (!response.ok) return providerFailure(response.status);

    let body: Record<string, unknown>;
    try {
      body = asRecord(await response.json());
    } catch {
      return {
        ok: false,
        retryable: true,
        reason: "zalo_invalid_provider_response",
        status: response.status,
      };
    }

    if (Number(body.error) !== 0) {
      return {
        ok: false,
        retryable: false,
        reason: "zalo_provider_rejected",
        status: response.status,
      };
    }

    const messageId = text(asRecord(body.data).msg_id);
    if (!messageId || messageId.length > 160) {
      return {
        ok: false,
        retryable: true,
        reason: "zalo_invalid_provider_response",
        status: response.status,
      };
    }

    return {
      ok: true,
      retryable: false,
      reason: null,
      status: response.status,
      messageId,
    };
  }

  async function sendPendingPaymentZbs(
    payload: PendingPaymentZbsPayload,
  ): Promise<ZaloClientResult> {
    if (!appId || !appSecret || !templateId) {
      return { ok: false, retryable: false, reason: "missing_zalo_config" };
    }

    const token = await getAccessToken();
    if (!token.ok) return token;

    const first = await sendOnce(payload, token.accessToken);
    if (first.ok || first.status !== 401) return first;

    const refreshed = await refreshAccessToken(true);
    if (!refreshed.ok) return refreshed;
    return sendOnce(payload, refreshed.accessToken);
  }

  return { sendPendingPaymentZbs };
}

export async function sendPendingPaymentZbs(payload: PendingPaymentZbsPayload) {
  return createZaloZbsClient().sendPendingPaymentZbs(payload);
}
