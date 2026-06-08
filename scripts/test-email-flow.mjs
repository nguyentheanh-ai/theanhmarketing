import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const defaultRecipient = "12c1thdtheanh@gmail.com";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    if (index <= 0) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] ||= value;
  }
}

function loadTsModule(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", compiled);
  runner(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

async function main() {
  const recipient = process.argv[2]?.trim() || defaultRecipient;
  loadEnv(path.resolve(".env.local"));

  process.env.NEW_LEAD_NOTIFICATION_TO = recipient;
  process.env.REGISTRATION_NOTIFICATION_EMAIL = recipient;
  process.env.NEXT_PUBLIC_SITE_URL ||= "https://theanhmarketing.com";

  const payment = loadTsModule("lib/notifications/payment-success-email.ts");
  const registration = loadTsModule("lib/notifications/registration-email.ts");
  const now = new Date().toISOString();
  const orderCode = `TAMMAIL${Date.now().toString(36).toUpperCase()}`;
  const baseOrder = {
    id: `codex-mail-${Date.now()}`,
    orderCode,
    studentName: "Codex Test Mail",
    email: recipient,
    phone: "0900000000",
    courseSlug: "facebook-ads-2026",
    courseTitle: "Quảng cáo Facebook Master 2026 - Gói Video 399K",
    amount: 399000,
    amountLabel: "399.000đ",
    currency: "VND",
    status: "paid",
    paymentMethod: "sepay",
    paymentQrUrl: "",
    paidAt: now,
    expiresAt: null,
    createdAt: now,
    sepayReferenceCode: null,
    orderItems: [],
    paymentEmailSentAt: null,
    paymentEmailLastError: null,
  };

  const results = [
    {
      flow: "payment_success",
      ...(await payment.sendPaymentSuccessEmail(baseOrder, {
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      })),
    },
    {
      flow: "payment_failed",
      ...(await payment.sendPaymentFailedEmail(
        {
          ...baseOrder,
          orderCode: `${orderCode}F`,
          paidAt: null,
          status: "failed",
        },
        {
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        },
      )),
    },
    {
      flow: "new_student_registration",
      ...(await registration.sendRegistrationNotification({
        studentName: "Codex Test Mail",
        phone: "0900000000",
        email: recipient,
        courseTitle: "Quảng cáo Facebook Master 2026 - Gói Video 399K",
        registeredAt: now,
        source: "Codex email flow test",
      })),
    },
  ];

  console.log(
    JSON.stringify(
      {
        recipient,
        resendApiKey: process.env.RESEND_API_KEY ? "SET" : "MISSING",
        results,
      },
      null,
      2,
    ),
  );

  if (results.some((result) => !result.ok || result.skipped)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
