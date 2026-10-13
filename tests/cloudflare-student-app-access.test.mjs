import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync("lib/cloudflare/student-app-access.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const cjsModule = { exports: {} };
new Function("exports", "module", compiled)(cjsModule.exports, cjsModule);
const { getStudentAppStagingAccessHeaders } = cjsModule.exports;

function withEnv(values, run) {
  const keys = Object.keys(values);
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("staging app receives Access headers only with a complete credential pair", () => {
  withEnv({
    NEXT_PUBLIC_APP_URL: "https://student.example.workers.dev",
    CF_ACCESS_STUDENT_APP_CLIENT_ID: "qa-id",
    CF_ACCESS_STUDENT_APP_CLIENT_SECRET: "qa-secret",
  }, () => {
    assert.deepEqual(getStudentAppStagingAccessHeaders("https://student.example.workers.dev/api/auth/website-login"), {
      "CF-Access-Client-Id": "qa-id",
      "CF-Access-Client-Secret": "qa-secret",
    });
    assert.deepEqual(getStudentAppStagingAccessHeaders("https://other.example.workers.dev/api/auth/website-login"), {});
    assert.deepEqual(getStudentAppStagingAccessHeaders("https://app.theanhmarketing.com/api/auth/website-login"), {});
  });
  withEnv({
    NEXT_PUBLIC_APP_URL: "https://student.example.workers.dev",
    CF_ACCESS_STUDENT_APP_CLIENT_ID: "qa-id",
    CF_ACCESS_STUDENT_APP_CLIENT_SECRET: undefined,
  }, () => assert.deepEqual(getStudentAppStagingAccessHeaders("https://student.example.workers.dev/api/auth/website-login"), {}));
});
