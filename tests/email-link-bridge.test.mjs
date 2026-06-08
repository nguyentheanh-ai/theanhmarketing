import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const fullPath = path.resolve(relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  const runner = new Function("exports", "module", compiled);
  runner(cjsModule.exports, cjsModule);
  return cjsModule.exports;
}

test("email links are wrapped through the public bridge and keep a strict allowlist", () => {
  const { buildEmailLink, getAllowedEmailLinkTarget } = loadTsModule("lib/notifications/email-link-bridge.ts");

  assert.equal(
    buildEmailLink("https://www.theanhmarketing.com/vao-khoa-hoc", "https://www.theanhmarketing.com"),
    "https://theanhmarketing.com/go?to=https%3A%2F%2Ftheanhmarketing.com%2Fvao-khoa-hoc",
  );
  assert.equal(
    getAllowedEmailLinkTarget("https://docs.google.com/document/d/abc/edit"),
    "https://docs.google.com/document/d/abc/edit",
  );
  assert.equal(getAllowedEmailLinkTarget("https://evil.example.com/phish"), null);
  assert.equal(getAllowedEmailLinkTarget("javascript:alert(1)"), null);
});

test("email link bridge route is public, noindex, and has manual fallback copy", () => {
  const page = read("app/go/page.tsx");
  const client = read("components/site/email-open-client.tsx");
  const proxy = read("proxy.ts");

  assert.match(page, /getAllowedEmailLinkTarget/);
  assert.match(page, /robots:[\s\S]*index:\s*false/);
  assert.match(page, /targetUrl/);
  assert.match(page, /Mo lien ket/);
  assert.match(page, /break-all/);
  assert.match(client, /window\.location\.assign\(targetUrl\)/);
  assert.match(proxy, /pathname === "\/vao-khoa-hoc" \|\| pathname === "\/go"/);
});
