import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

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

test("both order APIs validate and pass normalized invoice details", () => {
  for (const file of ["app/api/orders/route.ts", "app/api/orders/from-session/route.ts"]) {
    const source = read(file);
    assert.match(source, /normalizeInvoiceInput\(body\.invoice\)/, file);
    assert.match(source, /invoice:\s*invoiceResult\.value/, file);
    assert.match(source, /status:\s*400/, file);
  }
});

test("order service persists every invoice field and fails closed for invoice requests", () => {
  const source = read("services/orderService.ts");
  for (const column of [
    "invoice_requested",
    "invoice_tax_code",
    "invoice_company_name",
    "invoice_company_address",
    "invoice_email",
  ]) {
    assert.match(source, new RegExp(column), column);
  }
  assert.match(source, /if \(invoice\.requested\)[\s\S]*?throw new Error/);
});

test("public order polling keeps only the invoice request flag", () => {
  const source = read("lib/security/public-order.ts");
  assert.match(source, /invoice:\s*\{[\s\S]*?requested:\s*order\.invoice\.requested/);
  assert.match(source, /taxCode:\s*""/);
  assert.match(source, /companyName:\s*""/);
  assert.match(source, /companyAddress:\s*""/);
  assert.match(source, /email:\s*""/);
});
