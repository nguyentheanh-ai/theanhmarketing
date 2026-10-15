import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "theanh-main-cf-staging",
    entrypoint: "./cloudflare-worker.ts",
    compatibilityDate: "2026-10-13",
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    assets: { notFoundHandling: "none" },
    observability: { enabled: false, redactQueryString: true },
    env: {
      ASSETS: bindings.assets(),
      AUTH_GUARD_ENABLED: bindings.text("true"),
      CF_R2_STAGE_PRIVATE_DELIVERY: bindings.text("true"),
      PRIVATE_ASSETS: bindings.r2({ name: "theanh-main-assets-staging" }),
      R2_PRIVATE_URL_SECRET: bindings.secret(),
      CF_NATIVE_MARKETING_MODE: bindings.text("disabled"),
      CF_NATIVE_AUTH_MODE: bindings.text("disabled"),
      CF_NATIVE_AUTH_ORIGIN: bindings.text("https://theanh-main-cf-staging.12c1thdtheanh.workers.dev"),
      CF_NATIVE_QA_USERS: bindings.text("[]"),
      CF_NATIVE_QA_PROGRESS_MODE: bindings.text("disabled"),
      CF_NATIVE_QA_AUTH_CONTEXT_MODE: bindings.text("disabled"),
      CF_NATIVE_QA_REFRESH_MODE: bindings.text("disabled"),
      // Enable only after callback allowlisting and query-log protection are verified.
      CF_NATIVE_QA_GOOGLE_MODE: bindings.text("disabled"),
      // Native SePay settle→access→account→email for listed QA orders only.
      CF_NATIVE_QA_PAYMENT_MODE: bindings.text("disabled"),
      // Native signup confirmation and password recovery for listed QA emails only.
      CF_NATIVE_QA_EMAIL_AUTH_MODE: bindings.text("disabled"),
      // Vercel cron parity; enable only on the production Worker after cutover.
      CF_CRON_MODE: bindings.text("disabled"),
      // Google secrets are optional while this gate is disabled. The router
      // validates all three at runtime before allowing the Google QA flow.
      NATIVE_AUTH_REFRESH_KEY: bindings.secret(),
      CF_NATIVE_QA_CREDENTIAL_WRITES: bindings.text("disabled"),
      NATIVE_AUTH_DB: bindings.d1({ name: "theanh-main-db-staging", id: "694139c9-6cda-4b8c-9228-c973dbcbb719" }),
      NATIVE_AUTH_CREDENTIAL_KEY: bindings.secret(),
      NATIVE_AUTH_LIMITER_KEY: bindings.secret(),
      STUDENT_PORTAL_PROVISION_SECRET: bindings.secret(),
    },
  }),
});
