import { createHmac, timingSafeEqual } from "node:crypto";

import { getEmailProvider } from "@/lib/crm-v2/email-provider";
import { recordCrmEmailWebhookEvent } from "@/lib/crm-v2/data";
import { refreshEmailCampaignMetrics } from "@/lib/email/scheduled-campaign";
import { resolveResendWebhookSecret } from "@/lib/email/resend-webhook-config";
import { updateEmailLogFromResendEvent } from "@/services/emailLogService";

export function verifyResendWebhookRequest(
  payload: string,
  headers: { id?: string | null; timestamp?: string | null; signature?: string | null },
  webhookSecret: string,
) {
  const id = headers.id ?? "";
  const timestamp = headers.timestamp ?? "";
  const signatureHeader = headers.signature ?? "";
  if (!id || !timestamp || !signatureHeader || !webhookSecret) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) return false;

  const encodedSecret = webhookSecret.startsWith("whsec_") ? webhookSecret.slice(6) : webhookSecret;
  let secret: Buffer;
  try {
    secret = Buffer.from(encodedSecret, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secret).update(`${id}.${timestamp}.${payload}`).digest("base64");
  return signatureHeader.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  });
}

export async function handleResendWebhookRequest(request: Request) {
  const payload = await request.text();
  const headers = {
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  };
  const secret = await resolveResendWebhookSecret();
  if (!secret || !verifyResendWebhookRequest(payload, headers, secret)) {
    return { ok: false, status: 401, events: 0, message: "Invalid webhook signature" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { ok: false, status: 400, events: 0, message: "Invalid webhook payload" };
  }

  const events = (await getEmailProvider().handleWebhook(parsed)).map((event) => ({
    ...event,
    providerEventId: headers.id || event.providerEventId,
  }));
  const crmResults = await Promise.all(events.map((event) => recordCrmEmailWebhookEvent(event)));
  const eventPayload = parsed as { type: string; data?: { email_id?: string; to?: string[]; subject?: string } };
  const legacyResult = await updateEmailLogFromResendEvent(eventPayload);
  const campaignIds = Array.from(
    new Set(crmResults.map((result) => result.campaignId).filter((id): id is string => Boolean(id))),
  );
  await Promise.all(
    campaignIds.map(async (campaignId) => {
      const client = (await import("@/lib/supabase/admin")).createSupabaseAdminClient();
      if (client) await refreshEmailCampaignMetrics(client, campaignId);
    }),
  );
  const crmOk = crmResults.every((result) => result.ok);
  return {
    ok: crmOk,
    status: crmOk ? 200 : 503,
    events: events.length,
    legacyLogUpdated: legacyResult.ok && !("skipped" in legacyResult && legacyResult.skipped),
  };
}
