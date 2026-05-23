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

const {
  buildAutoStudentAccountCredentials,
  getPostLoginRedirect,
  shouldRequirePasswordChange,
} = loadTsModule("lib/auth/student-account.ts");

test("builds an auto student account from paid order contact details", () => {
  const credentials = buildAutoStudentAccountCredentials({
    studentName: "Nguyễn Thế Anh",
    email: "  12C1THDTHEANH@GMAIL.COM ",
    phone: "09 0123 4567",
  });

  assert.equal(credentials.email, "12c1thdtheanh@gmail.com");
  assert.equal(credentials.password, "Anh0901234567");
});

test("falls back to a safe Vietnamese-free password when the name is missing", () => {
  const credentials = buildAutoStudentAccountCredentials({
    studentName: "",
    email: "student@example.com",
    phone: "+84 901 234 567",
  });

  assert.equal(credentials.password, "Hocvien84901234567");
});

test("redirects first-login students to the password change screen", () => {
  const user = { user_metadata: { must_change_password: true } };

  assert.equal(shouldRequirePasswordChange(user), true);
  assert.equal(getPostLoginRedirect(user, "/dashboard"), "/doi-mat-khau?next=%2Fdashboard");
  assert.equal(getPostLoginRedirect({ user_metadata: {} }, "/dashboard"), "/dashboard");
});
