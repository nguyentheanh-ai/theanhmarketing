import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "theanh-main-cf-staging",
    entrypoint: "./cloudflare-worker.ts",
    compatibilityDate: "2026-10-13",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      AUTH_GUARD_ENABLED: bindings.text("true"),
      PRIVATE_ASSETS: bindings.r2({ name: "theanh-main-assets-staging" }),
      R2_PRIVATE_URL_SECRET: bindings.secret(),
    },
  }),
});
