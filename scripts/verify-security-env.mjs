import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const env = { ...process.env };
const isProductionCheck =
  process.argv.includes("--production") || env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
const envFiles = isProductionCheck
  ? [".env", ".env.local", ".env.production"]
  : [".env", ".env.production", ".env.local"];
const protectedEnvKeys = new Set(Object.keys(process.env));

for (const file of envFiles) {
  const filePath = path.join(cwd, file);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!protectedEnvKeys.has(key)) {
      env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

const requiredForLocal = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const requiredForProduction = [
  ...requiredForLocal,
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_GUARD_ENABLED",
  "ADMIN_EMAILS",
  "RESEND_API_KEY",
  "NEW_LEAD_NOTIFICATION_TO",
  "REGISTRATION_NOTIFICATION_EMAIL",
  "REGISTRATION_NOTIFICATION_FROM",
  "PENDING_PAYMENT_EMAIL_FROM",
  "PAYMENT_SUCCESS_EMAIL_FROM",
  "SEPAY_BANK_CODE",
  "SEPAY_BANK_ACCOUNT_NUMBER",
  "SEPAY_WEBHOOK_API_KEY",
];

const required = isProductionCheck ? requiredForProduction : requiredForLocal;
const missing = required.filter((key) => !env[key]);
const weak = [];

if (isProductionCheck && env.AUTH_GUARD_ENABLED !== "true") {
  weak.push("AUTH_GUARD_ENABLED should be true in production.");
}

if (isProductionCheck && env.SEPAY_WEBHOOK_API_KEY && env.SEPAY_WEBHOOK_API_KEY.length < 32) {
  weak.push("SEPAY_WEBHOOK_API_KEY should be at least 32 characters.");
}

if (env.ADMIN_EMAILS?.includes("owner@example.com")) {
  weak.push("ADMIN_EMAILS still contains the placeholder owner@example.com.");
}

const emailSenderKeys = [
  "REGISTRATION_NOTIFICATION_FROM",
  "PENDING_PAYMENT_EMAIL_FROM",
  "PAYMENT_SUCCESS_EMAIL_FROM",
];

for (const key of emailSenderKeys) {
  if (isProductionCheck && env[key]?.includes("onboarding@resend.dev")) {
    weak.push(`${key} still uses the Resend sandbox sender onboarding@resend.dev.`);
  }
}

if (isProductionCheck && env.REGISTRATION_NOTIFICATION_EMAIL?.includes("12c1thdtheanh@gmail.com")) {
  weak.push("REGISTRATION_NOTIFICATION_EMAIL still points to the old test recipient.");
}

if (missing.length || weak.length) {
  console.error(
    isProductionCheck
      ? "Production security environment check failed."
      : "Local security environment check failed.",
  );

  for (const key of missing) {
    console.error(`Missing: ${key}`);
  }

  for (const warning of weak) {
    console.error(`Weak: ${warning}`);
  }

  process.exit(1);
}

console.log(
  isProductionCheck
    ? "Production security environment check passed."
    : "Local security environment check passed.",
);
