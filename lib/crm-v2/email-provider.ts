export type EmailAddress = {
  email: string;
  name?: string;
};

export type EmailPayload = {
  to: EmailAddress[];
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type BroadcastPayload = {
  name: string;
  segmentId?: string;
  templateId?: string;
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
};

export type EmailProviderResult = {
  ok: boolean;
  provider: "mock" | "resend";
  id?: string;
  mocked?: boolean;
  error?: string;
};

export type NormalizedEmailWebhookEvent = {
  provider: "resend" | "mock";
  type: string;
  providerEventId?: string;
  providerMessageId?: string;
  recipient?: string;
  occurredAt: string;
  payload: unknown;
};

export interface EmailProvider {
  sendTransactionalEmail(payload: EmailPayload): Promise<EmailProviderResult>;
  sendMarketingEmail(payload: EmailPayload): Promise<EmailProviderResult>;
  sendBatch(payloads: EmailPayload[]): Promise<EmailProviderResult[]>;
  createBroadcast(payload: BroadcastPayload): Promise<EmailProviderResult>;
  scheduleBroadcast(payload: BroadcastPayload): Promise<EmailProviderResult>;
  handleWebhook(payload: unknown): Promise<NormalizedEmailWebhookEvent[]>;
}

export class MockEmailProvider implements EmailProvider {
  async sendTransactionalEmail(payload: EmailPayload) {
    return { ok: true, provider: "mock" as const, id: payload.idempotencyKey ?? `mock_${Date.now()}`, mocked: true };
  }

  async sendMarketingEmail(payload: EmailPayload) {
    return { ok: true, provider: "mock" as const, id: payload.idempotencyKey ?? `mock_${Date.now()}`, mocked: true };
  }

  async sendBatch(payloads: EmailPayload[]) {
    return Promise.all(payloads.map((payload) => this.sendMarketingEmail(payload)));
  }

  async createBroadcast(payload: BroadcastPayload) {
    return { ok: true, provider: "mock" as const, id: payload.name, mocked: true };
  }

  async scheduleBroadcast(payload: BroadcastPayload) {
    return { ok: true, provider: "mock" as const, id: payload.name, mocked: true };
  }

  async handleWebhook(payload: unknown) {
    return [
      {
        provider: "mock" as const,
        type: "received",
        occurredAt: new Date().toISOString(),
        payload,
      },
    ];
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async sendTransactionalEmail(payload: EmailPayload) {
    return this.sendEmail(payload);
  }

  async sendMarketingEmail(payload: EmailPayload) {
    return this.sendEmail(payload);
  }

  async sendBatch(payloads: EmailPayload[]) {
    return Promise.all(payloads.map((payload) => this.sendEmail(payload)));
  }

  async createBroadcast(payload: BroadcastPayload) {
    return { ok: true, provider: "resend" as const, id: payload.name };
  }

  async scheduleBroadcast(payload: BroadcastPayload) {
    return { ok: true, provider: "resend" as const, id: payload.name };
  }

  async handleWebhook(payload: unknown) {
    const event = payload as {
      type?: string;
      created_at?: string;
      data?: { id?: string; email_id?: string; to?: string[]; email?: string; created_at?: string };
    };

    return [
      {
        provider: "resend" as const,
        type: event.type ?? "unknown",
        providerEventId: event.data?.id,
        providerMessageId: event.data?.email_id,
        recipient: event.data?.email ?? event.data?.to?.[0],
        occurredAt: event.created_at ?? event.data?.created_at ?? new Date().toISOString(),
        payload,
      },
    ];
  }

  private async sendEmail(payload: EmailPayload): Promise<EmailProviderResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "The Anh Marketing <no-reply@theanhmarketing.com>",
        to: payload.to.map((recipient) => (recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email)),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        headers: payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : undefined,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) {
      return { ok: false, provider: "resend", error: data.message ?? response.statusText };
    }

    return { ok: true, provider: "resend", id: data.id };
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return new MockEmailProvider();
  return new ResendEmailProvider(apiKey);
}
