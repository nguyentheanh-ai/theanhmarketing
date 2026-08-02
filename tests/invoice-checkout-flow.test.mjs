import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function compileTypeScript(relativePath, imports = {}) {
  const source = fs.readFileSync(path.resolve(relativePath), "utf8");
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
    if (specifier in imports) return imports[specifier];
    throw new Error(`Unsupported test import: ${specifier}`);
  });
  return cjsModule.exports;
}

const validation = compileTypeScript("lib/security/validation.ts");
const { emptyInvoiceDetails, normalizeInvoiceInput } = compileTypeScript(
  "lib/orders/invoice.ts",
  { "@/lib/security/validation": validation },
);

test("invoice details stay empty when the customer does not request an invoice", () => {
  assert.deepEqual(
    normalizeInvoiceInput({ requested: false, taxCode: "0101234567" }),
    { ok: true, value: emptyInvoiceDetails },
  );
});

test("invoice request requires all four valid business fields", () => {
  assert.equal(normalizeInvoiceInput({ requested: true }).ok, false);
  assert.equal(normalizeInvoiceInput({
    requested: true,
    taxCode: "123",
    companyName: "Công ty TNHH Ví dụ",
    companyAddress: "Hà Nội",
    email: "ketoan@example.com",
  }).ok, false);
});

test("invoice details are normalized for storage", () => {
  assert.deepEqual(normalizeInvoiceInput({
    requested: true,
    taxCode: " 0101234567 ",
    companyName: "  Công ty TNHH Ví dụ ",
    companyAddress: "  12 Phố Huế, Hà Nội ",
    email: "KETOAN@EXAMPLE.COM",
  }), {
    ok: true,
    value: {
      requested: true,
      taxCode: "0101234567",
      companyName: "Công ty TNHH Ví dụ",
      companyAddress: "12 Phố Huế, Hà Nội",
      email: "ketoan@example.com",
    },
  });
});

test("invoice tax code accepts a three-digit branch suffix", () => {
  assert.equal(normalizeInvoiceInput({
    requested: true,
    taxCode: "0101234567-001",
    companyName: "Công ty TNHH Ví dụ",
    companyAddress: "Hà Nội",
    email: "ketoan@example.com",
  }).ok, true);
});
