import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadSepayModule() {
  const fullPath = path.resolve("lib/payments/sepay.ts");
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (specifier) => {
    if (specifier === "crypto") {
      return crypto;
    }

    throw new Error(`Unsupported test import: ${specifier}`);
  });
  return cjsModule.exports;
}

const { getSepayOrderCode, resolveSepayFallbackOrderCode } = loadSepayModule();

const vpBankPayloadWithoutOrderCode = {
  id: 71238092,
  gateway: "VPBank",
  transactionDate: "2026-08-02 18:34:00",
  accountNumber: "0367928921",
  code: null,
  content: "NHAN TU 3450260542 TRACE 224764 ND TRAN THI MAI QUYNH Chuyen tien",
  transferType: "in",
  description:
    "BankAPINotify NHAN TU 3450260542 TRACE 224764 ND TRAN THI MAI QUYNH Chuyen tien",
  transferAmount: 799000,
  referenceCode: "FT26215034507918",
};

test("uses the full TAM order code from transfer content when SePay code is a bank shorthand", () => {
  assert.equal(
    getSepayOrderCode({
      code: "DH707",
      content: "NHAN TU 0962160396 TRACE 605178 ND TAMMRWSYDH707D7T",
    }),
    "TAMMRWSYDH707D7T",
  );
});

test("keeps using a valid TAM order code supplied directly by SePay", () => {
  assert.equal(getSepayOrderCode({ code: "tammrwsydh707d7t" }), "TAMMRWSYDH707D7T");
});

test("does not treat a bank shorthand as a website order when content has no TAM code", () => {
  assert.equal(getSepayOrderCode({ code: "DH707", content: "TRANSFER DH707" }), "");
});

test("matches a VPBank payment without TAM code to one recent exact order", () => {
  assert.equal(
    resolveSepayFallbackOrderCode(vpBankPayloadWithoutOrderCode, [
      {
        orderCode: "TAMMSBQ1Z85TMVA6",
        studentName: "Trần Thị Mai Quỳnh",
        amount: 799000,
        status: "pending",
        createdAt: "2026-08-02T11:33:25.000Z",
      },
    ]),
    "TAMMSBQ1Z85TMVA6",
  );
});

test("fails closed when a code-less payment matches more than one order", () => {
  const candidate = {
    studentName: "Trần Thị Mai Quỳnh",
    amount: 799000,
    status: "pending",
    createdAt: "2026-08-02T11:33:25.000Z",
  };

  assert.equal(
    resolveSepayFallbackOrderCode(vpBankPayloadWithoutOrderCode, [
      { ...candidate, orderCode: "TAMFIRST" },
      { ...candidate, orderCode: "TAMSECOND" },
    ]),
    "",
  );
});

test("does not match a code-less payment when payer identity differs", () => {
  assert.equal(
    resolveSepayFallbackOrderCode(vpBankPayloadWithoutOrderCode, [
      {
        orderCode: "TAMOTHER",
        studentName: "Nguyễn Văn Khác",
        amount: 799000,
        status: "pending",
        createdAt: "2026-08-02T11:33:25.000Z",
      },
    ]),
    "",
  );
});
