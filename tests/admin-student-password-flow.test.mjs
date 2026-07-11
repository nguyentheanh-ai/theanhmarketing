import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin student grant delegates credential and paid email work without exposing credentials", () => {
  const route = read("app/api/admin/students/grant/route.ts");
  const orchestrator = read("services/studentProvisioningService.ts");

  assert.match(route, /provisionStudent/);
  assert.match(route, /delete safeResult\.temporaryCredential/);
  assert.doesNotMatch(route, /temporaryPassword|ensureStudentAccountForPaidOrder|sendPaymentSuccessEmail/);
  assert.match(orchestrator, /ensurePaidAccount/);
  assert.match(orchestrator, /sendPaidEmail/);
  assert.match(orchestrator, /markPaidEmailSent/);
  assert.match(orchestrator, /preserveExistingAuth:\s*true/);
});

test("legacy student intake entry delegates to the unified wizard without a password field", () => {
  const form = read("components/admin/student-intake-form.tsx");

  assert.match(form, /StudentProvisioningWizard/);
  assert.doesNotMatch(form, /temporaryPassword|Mật khẩu/);
});
