import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3020",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm.cmd run dev -- --hostname 127.0.0.1 --port 3020",
    url: "http://127.0.0.1:3020",
    reuseExistingServer: true,
    env: {
      CRM_V2_ENABLED: "true",
      AUTH_GUARD_ENABLED: "false",
      CRM_V2_USE_DEMO_DATA: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
