import { notifyAccountingForPaidOrder } from "@/services/accountingNotificationService";
import { listAccountingBackfillCandidates } from "@/services/orderService";

const SINCE = "2026-08-01T17:00:00.000Z";
const SEND = process.argv.includes("--send");
const approvedArgument = process.argv.find((value) => value.startsWith("--approve-ambiguous="));
const approvedAmbiguous = new Set(
  (approvedArgument?.split("=").slice(1).join("=") ?? "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
);

function digits(value: string | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function requireLiveConfiguration() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SEPAY_BANK_ACCOUNT_NUMBER",
    "ACCOUNTING_NOTIFICATION_EMAIL",
    "RESEND_API_KEY",
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing live configuration: ${missing.join(", ")}`);
  }
}

async function main() {
  if (SEND) requireLiveConfiguration();

  const expectedAccount = digits(process.env.SEPAY_BANK_ACCOUNT_NUMBER);
  if (!expectedAccount) {
    throw new Error("Missing SEPAY_BANK_ACCOUNT_NUMBER for Greezhub account matching");
  }

  const candidates = await listAccountingBackfillCandidates({ since: SINCE, limit: 1000 });
  const eligible = [];
  const ambiguousOrderCodes: string[] = [];
  let alreadySent = 0;
  let ineligible = 0;

  for (const candidate of candidates) {
    if (candidate.order.accountingEmailSentAt) {
      alreadySent += 1;
      continue;
    }

    const receivedAccount = digits(candidate.receivedAccountNumber);
    if (receivedAccount && receivedAccount !== expectedAccount) {
      ineligible += 1;
      continue;
    }

    if (!receivedAccount && !approvedAmbiguous.has(candidate.order.orderCode)) {
      ambiguousOrderCodes.push(candidate.order.orderCode);
      continue;
    }

    eligible.push(candidate.order);
  }

  if (SEND && ambiguousOrderCodes.length > 0) {
    throw new Error(
      `Ambiguous receiving-account evidence requires explicit review: ${ambiguousOrderCodes.join(",")}`,
    );
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  if (SEND) {
    for (const order of eligible) {
      const result = await notifyAccountingForPaidOrder(order);
      if (result.ok && !result.skipped) sent += 1;
      else if (result.skipped) skipped += 1;
      else failed += 1;
    }
  }

  const totalEligibleVnd = eligible.reduce((total, order) => total + order.amount, 0);
  process.stdout.write(`${JSON.stringify({
    mode: SEND ? "send" : "dry-run",
    since: SINCE,
    scanned: candidates.length,
    eligible: eligible.length,
    totalEligibleVnd,
    alreadySent,
    ineligible,
    ambiguous: ambiguousOrderCodes.length,
    ambiguousOrderCodes,
    attempted: SEND ? eligible.length : 0,
    sent,
    skipped,
    failed,
  })}\n`);

  if (SEND && failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Accounting backfill failed";
  process.stderr.write(`${message.slice(0, 2000)}\n`);
  process.exitCode = 1;
});
