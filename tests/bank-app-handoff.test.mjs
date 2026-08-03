import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

function read(relativePath) {
  return fs.readFileSync(relativePath, "utf8");
}

function loadHelper() {
  const source = read("lib/payments/bank-app-handoff.ts");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  new Function("exports", "module", "require", compiled)(
    cjsModule.exports,
    cjsModule,
    () => {
      throw new Error("No imports expected");
    },
  );
  return cjsModule.exports;
}

test("VietQR app link uses only server-derived transfer values", () => {
  const { buildVietQrBankAppUrl } = loadHelper();
  const url = new URL(buildVietQrBankAppUrl({
    appId: "vcb",
    bankCode: "VPB",
    bankAccountNumber: "0367928921",
    bankAccountName: "THE ANH MARKETING",
    amount: 399000,
    transferContent: "TAMABC123",
    returnUrl: "https://www.theanhmarketing.com/thanh-toan/TAMABC123",
  }));

  assert.equal(url.origin, "https://dl.vietqr.io");
  assert.equal(url.pathname, "/pay");
  assert.equal(url.searchParams.get("app"), "vcb");
  assert.equal(url.searchParams.get("ba"), "0367928921@vpb");
  assert.equal(url.searchParams.get("am"), "399000");
  assert.equal(url.searchParams.get("tn"), "TAMABC123");
  assert.equal(url.searchParams.get("bn"), "THE ANH MARKETING");
  assert.equal(
    url.searchParams.get("url"),
    "https://www.theanhmarketing.com/thanh-toan/TAMABC123",
  );
  assert.throws(
    () => buildVietQrBankAppUrl({
      appId: "vcb&am=1",
      bankCode: "VPB",
      bankAccountNumber: "0367928921",
      bankAccountName: "THE ANH MARKETING",
      amount: 399000,
      transferContent: "TAMABC123",
      returnUrl: "https://evil.example",
    }),
    /invalid_bank_handoff/,
  );
});

test("bank app directory is mobile-platform specific and fails closed", async () => {
  const { loadVietQrBankApps } = loadHelper();
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return new Response(JSON.stringify({
      apps: [
        { appId: "vcb", appName: "VCB Digibank", monthlyInstall: 500000 },
        { appId: "bad&id", appName: "Bad", monthlyInstall: 999999 },
      ],
    }), { status: 200 });
  };

  const ios = await loadVietQrBankApps({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    fetchImpl,
  });
  assert.equal(calls[0], "https://api.vietqr.io/v2/ios-app-deeplinks");
  assert.deepEqual(ios, [{ appId: "vcb", appName: "VCB Digibank" }]);

  assert.deepEqual(await loadVietQrBankApps({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
    fetchImpl,
  }), []);
  assert.deepEqual(await loadVietQrBankApps({
    userAgent: "Mozilla/5.0 (Linux; Android 15)",
    fetchImpl: async () => new Response("no", { status: 503 }),
  }), []);
});

test("payment page activates chooser only for openBank=1 and keeps fallback", () => {
  const page = read("app/thanh-toan/[code]/page.tsx");
  const component = read("components/payment/bank-app-handoff.tsx");

  assert.match(page, /searchParams: Promise/);
  assert.match(page, /openBank\s*===\s*"1"/);
  assert.match(page, /<BankAppHandoff/);
  assert.match(page, /bankAccountNumber=\{sepay\.bankAccountNumber\}/);
  assert.match(page, /amount=\{order\.amount\}/);
  assert.match(page, /transferContent=\{transferContent\}/);
  assert.match(page, /<TransferDetails/);
  assert.match(page, /src=\{qrUrl\}/);
  assert.doesNotMatch(page, /searchParams[\s\S]{0,120}(?:amount|bankAccount|transferContent)/);

  assert.match(component, /Chọn app ngân hàng/);
  assert.match(component, /Không mở được app/);
  assert.doesNotMatch(component, /useEffect|window\.location|location\.assign/);
});
