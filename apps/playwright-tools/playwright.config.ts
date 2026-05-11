import { defineConfig, devices } from "@playwright/test";

/**
 * Promotion pages are real browser apps; tests hit the public web (opt-in per run).
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    locale: "sv-SE",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
