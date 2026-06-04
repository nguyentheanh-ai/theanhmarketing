import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

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

const { buildStudentPortalProvisioningPayload } = loadTsModule("services/studentPortalProvisioningService.ts");

test("builds the app provisioning payload from a paid website order and auth user", () => {
  const payload = buildStudentPortalProvisioningPayload({
    order: {
      orderCode: "TAM123",
      studentName: " Nguyễn Văn A ",
      email: " HOCVIEN@EXAMPLE.COM ",
      phone: " 0901000001 ",
      courseSlug: "ai-master-x10-hieu-suat,bo-agent-kit-x10-hieu-suat",
    },
    userId: "8b8bd69a-c4f8-4a65-a5e2-1e6f6c6d80bf",
  });

  assert.deepEqual(payload, {
    userId: "8b8bd69a-c4f8-4a65-a5e2-1e6f6c6d80bf",
    email: "hocvien@example.com",
    fullName: "Nguyễn Văn A",
    phone: "0901000001",
    accessKey: "ai-master-x10-hieu-suat,bo-agent-kit-x10-hieu-suat",
    orderCode: "TAM123",
    source: "theanhmarketing.com",
  });
});

test("builds the app provisioning payload even when website has no auth user id", () => {
  const payload = buildStudentPortalProvisioningPayload({
    order: {
      orderCode: "TAM124",
      studentName: "Nguyễn Văn B",
      email: "hocvienb@example.com",
      phone: "0901000002",
      courseSlug: "facebook-ads",
    },
    userId: null,
  });

  assert.deepEqual(payload, {
    email: "hocvienb@example.com",
    fullName: "Nguyễn Văn B",
    phone: "0901000002",
    accessKey: "facebook-ads",
    orderCode: "TAM124",
    source: "theanhmarketing.com",
  });
});
