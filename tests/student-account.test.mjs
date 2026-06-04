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

function loadTsModuleWithMocks(relativePath, mocks) {
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
  const runner = new Function("exports", "module", "require", compiled);
  runner(cjsModule.exports, cjsModule, (id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unexpected require: ${id}`);
  });
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

test("auto-created paid student accounts do not depend on listing auth users", async () => {
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  let listUsersCalls = 0;
  let createUserCalls = 0;

  const { ensureStudentAccountForPaidOrder } = loadTsModuleWithMocks("services/studentAccountService.ts", {
    "@/lib/auth/student-account": {
      buildAutoStudentAccountCredentials() {
        return {
          email: "student@example.com",
          password: "Anh0900000000",
        };
      },
    },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient() {
        return {
          auth: {
            admin: {
              async listUsers() {
                listUsersCalls += 1;
                throw new Error("Database error finding users");
              },
              async createUser() {
                createUserCalls += 1;
                return { data: { user: { id: "user-1" } }, error: null };
              },
            },
          },
        };
      },
    },
  });

  try {
    const result = await ensureStudentAccountForPaidOrder({
      studentName: "Nguyen Van A",
      email: "student@example.com",
      phone: "0900000000",
      status: "paid",
      orderCode: "TAM123",
      courseSlug: "facebook-ads-2026",
      courseTitle: "Facebook Ads Master",
    });

    assert.equal(result.ok, true);
    assert.equal(result.created, true);
    assert.equal(result.temporaryPassword, "Anh0900000000");
    assert.equal(result.userId, "user-1");
    assert.equal(createUserCalls, 1);
    assert.equal(listUsersCalls, 0);
  } finally {
    if (previousServiceRole) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  }
});
