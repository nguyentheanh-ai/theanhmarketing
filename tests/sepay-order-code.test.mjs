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

const { getSepayOrderCode } = loadSepayModule();

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
