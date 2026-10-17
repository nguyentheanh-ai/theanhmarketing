import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

// One codebase, two Workers. Default is staging (unchanged). Production is
// built with CF_DEPLOY_TARGET=production (docs/CLOUDFLARE_PRODUCTION_CUTOVER.md):
// same app on Workers, data still on Supabase, every native gate disabled.
// Custom domains AND Vercel-parity crons switch on together only with
// CF_ATTACH_PRODUCTION_DOMAINS=1 (the approved cutover deploy), so the test
// deploy never runs a cron twice alongside Vercel.
const production = process.env.CF_DEPLOY_TARGET === "production";
const attachDomains = production && process.env.CF_ATTACH_PRODUCTION_DOMAINS === "1";

export default defineConfig({
  worker: defineWorker({
    name: production ? "theanh-main-cf-production" : "theanh-main-cf-staging",
    entrypoint: "./cloudflare-worker.ts",
    ...(attachDomains ? { triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })], domains: ["theanhmarketing.com", "www.theanhmarketing.com"] } : {}),
    compatibilityDate: "2026-10-13",
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    // Vercel parity: /dir/index.html is served at /dir and /dir/ redirects to /dir.
    // Pretty paths serve public/*.html directly (the /academy landings rely on it);
    // rewrites whose path differs from the file name live in STATIC_ASSET_ALIASES.
    assets: { notFoundHandling: "none", htmlHandling: "drop-trailing-slash" },
    observability: { enabled: false, redactQueryString: true },
    env: {
      ASSETS: bindings.assets(),
      AUTH_GUARD_ENABLED: bindings.text("true"),
      // Production keeps Supabase Storage delivery; R2 serves only the oversized public video.
      CF_R2_STAGE_PRIVATE_DELIVERY: bindings.text(production ? "false" : "true"),
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
      CF_CRON_MODE: bindings.text(attachDomains ? "enabled" : "disabled"),
      CF_CRON_ORIGIN: bindings.text(production ? "https://www.theanhmarketing.com" : "https://theanh-main-cf-staging.12c1thdtheanh.workers.dev"),
      // Google secrets are optional while this gate is disabled. The router
      // validates all three at runtime before allowing the Google QA flow.
      NATIVE_AUTH_REFRESH_KEY: bindings.secret(),
      CF_NATIVE_QA_CREDENTIAL_WRITES: bindings.text("disabled"),
      // Production binds the separate Supabase copy D1 (unused while native gates are off).
      NATIVE_AUTH_DB: production ? bindings.d1({ name: "theanh-supabase-copy", id: "f0f2a18e-22c3-4695-99af-a5065aa7dbe5" }) : bindings.d1({ name: "theanh-main-db-staging", id: "694139c9-6cda-4b8c-9228-c973dbcbb719" }),
      NATIVE_AUTH_CREDENTIAL_KEY: bindings.secret(),
      NATIVE_AUTH_LIMITER_KEY: bindings.secret(),
      STUDENT_PORTAL_PROVISION_SECRET: bindings.secret(),
      // Production only: direct A -> B calls (workers.dev Worker-to-Worker fetch is refused).
      ...(production ? { STUDENT_APP: bindings.worker({ worker: "theanh-student-cf-production" }) } : {}),
    },
  }),
});
