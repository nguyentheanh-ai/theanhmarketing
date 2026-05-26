import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("admin student grant can create credentials and send the paid access email", () => {
  const route = read("app/api/admin/students/grant/route.ts");

  assert.match(route, /temporaryPassword/);
  assert.match(route, /ensureStudentAccountForPaidOrder/);
  assert.match(route, /sendPaymentSuccessEmail/);
  assert.match(route, /markPaymentEmailSent/);
  assert.match(route, /markPaymentEmailError/);
  assert.match(route, /forcePasswordUpdate:\s*true/);
});

test("admin student intake form exposes an optional password field", () => {
  const form = read("components/admin/student-intake-form.tsx");

  assert.match(form, /name="temporaryPassword"/);
  assert.match(form, /temporaryPassword/);
  assert.match(form, /Mật khẩu/);
  assert.match(form, /để trống/i);
});
