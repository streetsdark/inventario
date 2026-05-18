import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración Playwright para tests E2E smoke.
 * - Solo Chromium (la app es web SPA, no necesitamos cobertura cross-browser
 *   en smoke; añadiremos webkit/firefox en E2E completos cuando haya billing).
 * - webServer arranca `npm run dev` automáticamente.
 * - reuseExistingServer en dev local para iterar más rápido.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "es-ES",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
