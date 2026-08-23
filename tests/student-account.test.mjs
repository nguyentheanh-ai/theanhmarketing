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

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
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
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  let listUsersCalls = 0;
  let createUserCalls = 0;
  let normalizeCalls = 0;
  let signInCalls = 0;

  const { ensureStudentAccountForPaidOrder } = loadTsModuleWithMocks("services/studentAccountService.ts", {
    "@supabase/supabase-js": {
      createClient() {
        return {
          auth: {
            async signInWithPassword(credentials) {
              signInCalls += 1;
              assert.deepEqual(credentials, {
                email: "student@example.com",
                password: "Anh0900000000",
              });
              return { data: { user: { id: "user-1" } }, error: null };
            },
            async signOut() {
              return { error: null };
            },
          },
        };
      },
    },
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
          schema(schemaName) {
            assert.equal(schemaName, "auth");
            return {
              from(tableName) {
                assert.equal(tableName, "users");
                return {
                  update(payload) {
                    normalizeCalls += 1;
                    assert.equal(payload.confirmation_token, "");
                    assert.equal(payload.email_change_token_current, "");
                    assert.equal(payload.email_change, "");
                    assert.equal(payload.aud, "authenticated");
                    assert.equal(payload.role, "authenticated");
                    return {
                      eq(columnName, userId) {
                        assert.equal(columnName, "id");
                        assert.equal(userId, "user-1");
                        return {
                          select(columns) {
                            assert.equal(columns, "id");
                            return {
                              async maybeSingle() {
                                return { data: { id: userId }, error: null };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
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
    "@/services/activityLogService": {
      async logStudentActivity() {
        return { ok: true, skipped: false, error: null };
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
    assert.equal(result.loginVerified, true);
    assert.equal(createUserCalls, 1);
    assert.equal(listUsersCalls, 0);
    assert.equal(normalizeCalls, 1);
    assert.equal(signInCalls, 1);
  } finally {
    if (previousServiceRole) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (previousSupabaseUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (previousSupabaseAnonKey) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousSupabaseAnonKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }
});

test("paid order provisioning resets password for existing auth users", async () => {
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  let createUserCalls = 0;
  let listUsersCalls = 0;
  let updateUserByIdCalls = 0;
  let normalizeCalls = 0;
  let signInCalls = 0;

  const { ensureStudentAccountForPaidOrder } = loadTsModuleWithMocks("services/studentAccountService.ts", {
    "@supabase/supabase-js": {
      createClient() {
        return {
          auth: {
            async signInWithPassword(credentials) {
              signInCalls += 1;
              assert.deepEqual(credentials, {
                email: "oauth-student@example.com",
                password: "Tinh0344123443",
              });
              return { data: { user: { id: "oauth-user-1" } }, error: null };
            },
            async signOut() {
              return { error: null };
            },
          },
        };
      },
    },
    "@/lib/auth/student-account": {
      buildAutoStudentAccountCredentials() {
        return {
          email: "oauth-student@example.com",
          password: "Tinh0344123443",
        };
      },
    },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient() {
        return {
          schema(schemaName) {
            assert.equal(schemaName, "auth");
            return {
              from(tableName) {
                assert.equal(tableName, "users");
                return {
                  update(payload) {
                    normalizeCalls += 1;
                    assert.equal(payload.recovery_token, "");
                    assert.equal(payload.phone_change_token, "");
                    assert.equal(payload.reauthentication_token, "");
                    assert.equal(payload.aud, "authenticated");
                    assert.equal(payload.role, "authenticated");
                    return {
                      eq(columnName, userId) {
                        assert.equal(columnName, "id");
                        assert.equal(userId, "oauth-user-1");
                        return {
                          select(columns) {
                            assert.equal(columns, "id");
                            return {
                              async maybeSingle() {
                                return { data: { id: userId }, error: null };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          auth: {
            admin: {
              async createUser() {
                createUserCalls += 1;
                return { data: { user: null }, error: { message: "User already registered" } };
              },
              async listUsers() {
                listUsersCalls += 1;
                return {
                  data: {
                    users: [
                      {
                        id: "oauth-user-1",
                        email: "oauth-student@example.com",
                        user_metadata: { provider_id: "google-1" },
                      },
                    ],
                  },
                  error: null,
                };
              },
              async updateUserById(userId, payload) {
                updateUserByIdCalls += 1;
                assert.equal(userId, "oauth-user-1");
                assert.equal(payload.password, "Tinh0344123443");
                assert.equal(payload.email_confirm, true);
                assert.equal(payload.user_metadata.must_change_password, true);
                assert.equal(payload.user_metadata.password_set_by_admin, true);
                return { data: { user: { id: userId } }, error: null };
              },
            },
          },
        };
      },
    },
    "@/services/activityLogService": {
      async logStudentActivity() {
        return { ok: true, skipped: false, error: null };
      },
    },
  });

  try {
    const result = await ensureStudentAccountForPaidOrder({
      studentName: "Phạm Thành Tính",
      email: "oauth-student@example.com",
      phone: "0344123443",
      status: "paid",
      orderCode: "TAM123",
      courseSlug: "facebook-ads-2026",
      courseTitle: "Facebook Ads Master",
    });

    assert.equal(result.ok, true);
    assert.equal(result.skipped, false);
    assert.equal(result.created, false);
    assert.equal(result.temporaryPassword, "Tinh0344123443");
    assert.equal(result.userId, "oauth-user-1");
    assert.equal(result.loginVerified, true);
    assert.equal(createUserCalls, 1);
    assert.equal(listUsersCalls, 1);
    assert.equal(updateUserByIdCalls, 1);
    assert.equal(normalizeCalls, 1);
    assert.equal(signInCalls, 1);
  } finally {
    if (previousServiceRole) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (previousSupabaseUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (previousSupabaseAnonKey) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousSupabaseAnonKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }
});

test("provisioning retry reuses only the credential created by the same operation without resetting auth", async () => {
  const previous = {
    role: process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  let updates = 0;
  let signIns = 0;
  const { ensureStudentAccountForPaidOrder } = loadTsModuleWithMocks("services/studentAccountService.ts", {
    "@supabase/supabase-js": { createClient: () => ({ auth: {
      signInWithPassword: async () => { signIns += 1; return { data: { user: { id: "user-1" } }, error: null }; },
      signOut: async () => ({ error: null }),
    } }) },
    "@/lib/auth/student-account": { buildAutoStudentAccountCredentials: () => ({ email: "student@example.com", password: "Stable0900000000" }) },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({
      schema: () => ({ from: () => ({ update: () => ({ eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "user-1" }, error: null }) }) }) }) }) }),
      auth: { admin: {
        createUser: async () => ({ data: { user: null }, error: { message: "User already registered" } }),
        listUsers: async () => ({ data: { users: [{
          id: "user-1", email: "student@example.com",
          user_metadata: { provisioning_operation_id: "operation-task7-123" },
        }] }, error: null }),
        updateUserById: async () => { updates += 1; return { data: null, error: null }; },
      } },
    }) },
    "@/services/activityLogService": { logStudentActivity: async () => ({ ok: true }) },
  });
  try {
    const result = await ensureStudentAccountForPaidOrder({
      studentName: "Hoc Vien", email: "student@example.com", phone: "0900000000", status: "paid",
      orderCode: "ORDER-100", courseSlug: "course-a", courseTitle: "Course A",
    }, { preserveExistingAuth: true, provisioningOperationId: "operation-task7-123" });
    assert.equal(result.ok, true);
    assert.equal(result.temporaryPassword, "Stable0900000000");
    assert.equal(updates, 0);
    assert.equal(signIns, 1);
  } finally {
    for (const [key, value] of [["SUPABASE_SERVICE_ROLE_KEY", previous.role], ["NEXT_PUBLIC_SUPABASE_URL", previous.url], ["NEXT_PUBLIC_SUPABASE_ANON_KEY", previous.anon]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("paid order provisioning fails closed when the issued password cannot log in", async () => {
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  let activityLogCalls = 0;

  const { ensureStudentAccountForPaidOrder } = loadTsModuleWithMocks("services/studentAccountService.ts", {
    "@supabase/supabase-js": {
      createClient() {
        return {
          auth: {
            async signInWithPassword() {
              return { data: { user: null }, error: { message: "Database error querying schema" } };
            },
            async signOut() {
              return { error: null };
            },
          },
        };
      },
    },
    "@/lib/auth/student-account": {
      buildAutoStudentAccountCredentials() {
        return {
          email: "broken-auth@example.com",
          password: "Anh0900000000",
        };
      },
    },
    "@/lib/supabase/admin": {
      createSupabaseAdminClient() {
        return {
          schema() {
            return {
              from() {
                return {
                  update() {
                    return {
                      eq() {
                        return {
                          select() {
                            return {
                              async maybeSingle() {
                                return { data: { id: "user-1" }, error: null };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          auth: {
            admin: {
              async createUser() {
                return { data: { user: { id: "user-1" } }, error: null };
              },
            },
          },
        };
      },
    },
    "@/services/activityLogService": {
      async logStudentActivity() {
        activityLogCalls += 1;
        return { ok: true, skipped: false, error: null };
      },
    },
  });

  try {
    const result = await ensureStudentAccountForPaidOrder({
      studentName: "Nguyen Van A",
      email: "broken-auth@example.com",
      phone: "0900000000",
      status: "paid",
      orderCode: "TAM123",
      courseSlug: "facebook-ads-2026",
      courseTitle: "Facebook Ads Master",
    });

    assert.equal(result.ok, false);
    assert.equal(result.created, false);
    assert.equal(result.temporaryPassword, null);
    assert.equal(result.loginVerified, false);
    assert.match(result.reason ?? "", /Password login verification failed/);
    assert.equal(activityLogCalls, 0);
  } finally {
    if (previousServiceRole) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (previousSupabaseUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (previousSupabaseAnonKey) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousSupabaseAnonKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }
});

test("student account provisioning centralizes auth normalization and password login verification", () => {
  const service = read("services/studentAccountService.ts");
  const resetRoute = read("app/api/admin/students/password-reset/route.ts");

  assert.match(service, /normalizeAuthUserForPasswordLogin/);
  assert.match(service, /confirmation_token/);
  assert.match(service, /email_change_token_current/);
  assert.match(service, /email_change_token_new/);
  assert.match(service, /reauthentication_token/);
  assert.match(service, /schema\("auth"\)/);
  assert.match(service, /signInWithPassword/);
  assert.match(service, /loginVerified/);
  assert.doesNotMatch(resetRoute, /signInWithPassword/);
});

test("SePay paid email includes account password when an existing user was reset", () => {
  const route = read("app/api/sepay/webhook/route.ts");

  assert.match(route, /studentAccount\?\.temporaryPassword|provisionedAccount\.temporaryPassword/);
  assert.doesNotMatch(route, /account:\s*studentAccount\.created/);
});

test("SePay student success email is blocked until a verified login account is available", () => {
  const route = read("app/api/sepay/webhook/route.ts");

  assert.match(route, /if \(!preorderDepositOrder && !studentAccount\?\.temporaryPassword\)/);
  assert.match(route, /Payment success email requires a verified student login account\./);
  assert.doesNotMatch(route, /requiresVerifiedLoginAccount/);
  assert.match(
    route,
    /if \(!preorderDepositOrder && !studentAccount\?\.temporaryPassword\)[\s\S]*?markPaymentEmailError[\s\S]*?else \{[\s\S]*?sendPaymentSuccessEmail/,
  );
});
