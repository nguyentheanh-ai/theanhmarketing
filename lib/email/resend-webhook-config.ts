const RESEND_API_BASE = "https://api.resend.com";
const DEFAULT_WEBHOOK_ENDPOINT = "https://www.theanhmarketing.com/api/resend/webhook";
const REQUIRED_EMAIL_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
] as const;

type ResendWebhook = {
  id?: string;
  endpoint?: string;
  status?: string;
  events?: string[];
  signing_secret?: string;
};

let cachedWebhookSecret: { value: string; expiresAt: number } | null = null;

export function getResendWebhookEndpoint() {
  return process.env.RESEND_WEBHOOK_URL || DEFAULT_WEBHOOK_ENDPOINT;
}

export async function ensureResendMeasurementWebhook(apiKey = process.env.RESEND_API_KEY ?? "") {
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  const endpoint = getResendWebhookEndpoint();
  const webhooks = await listResendWebhooks(apiKey);
  let webhook = webhooks.find((entry) => entry.endpoint === endpoint);

  if (!webhook) {
    webhook = await resendWebhookRequest<ResendWebhook>(apiKey, "/webhooks", {
      method: "POST",
      body: JSON.stringify({ endpoint, events: [...REQUIRED_EMAIL_EVENTS] }),
    });
  } else if (
    webhook.status !== "enabled" ||
    REQUIRED_EMAIL_EVENTS.some((event) => !webhook?.events?.includes(event))
  ) {
    if (!webhook.id) throw new Error("Resend webhook is missing its id");
    await resendWebhookRequest(apiKey, `/webhooks/${webhook.id}`, {
      method: "PATCH",
      body: JSON.stringify({ endpoint, events: [...REQUIRED_EMAIL_EVENTS], status: "enabled" }),
    });
    webhook = await resendWebhookRequest<ResendWebhook>(apiKey, `/webhooks/${webhook.id}`);
  }

  if (webhook?.id && !webhook.signing_secret) {
    webhook = await resendWebhookRequest<ResendWebhook>(apiKey, `/webhooks/${webhook.id}`);
  }

  const secret = webhook.signing_secret;
  if (!webhook.id || !secret) throw new Error("Resend webhook signing secret is unavailable");
  cacheWebhookSecret(secret);
  return { id: webhook.id, endpoint, events: [...REQUIRED_EMAIL_EVENTS], verified: true };
}

export async function resolveResendWebhookSecret(apiKey = process.env.RESEND_API_KEY ?? "") {
  const envSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (envSecret) return envSecret;
  if (cachedWebhookSecret && cachedWebhookSecret.expiresAt > Date.now()) return cachedWebhookSecret.value;
  if (!apiKey) return "";
  const endpoint = getResendWebhookEndpoint();
  let webhook = (await listResendWebhooks(apiKey)).find((entry) => entry.endpoint === endpoint);
  if (webhook?.id && !webhook.signing_secret) {
    webhook = await resendWebhookRequest<ResendWebhook>(apiKey, `/webhooks/${webhook.id}`);
  }
  const secret = webhook?.status === "enabled" ? webhook.signing_secret ?? "" : "";
  if (secret) cacheWebhookSecret(secret);
  return secret;
}

async function listResendWebhooks(apiKey: string) {
  const payload = await resendWebhookRequest<{ data?: ResendWebhook[] }>(apiKey, "/webhooks?limit=100");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function resendWebhookRequest<T>(apiKey: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error?.message ?? `Resend webhook API returned ${response.status}`);
  }
  return payload;
}

function cacheWebhookSecret(secret: string) {
  cachedWebhookSecret = { value: secret, expiresAt: Date.now() + 5 * 60 * 1000 };
}
