import "dotenv/config";
import { randomInt } from "node:crypto";
import { defineConfig } from "@playwright/test";
import { FAKE_SERVICES_ORIGIN } from "./e2e/fake-services-url";

// Checkout and login are rate-limited in memory per client IP, read from the
// cf-connecting-ip header. Without it every request shares one "unknown"
// bucket, so a random IP per run keeps specs from throttling each other.
const clientIp = Array.from({ length: 4 }, () => randomInt(1, 255)).join(".");

const BASE_URL = "http://localhost:3000";
// The web server command includes a full production build.
const WEB_SERVER_TIMEOUT_MS = 300_000;

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.ts/,
  retries: process.env.CI ? 1 : 0,
  // html feeds the playwright-report/ artifact CI uploads on failure.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { "cf-connecting-ip": clientIp },
    // Intermittent failures need evidence: a trace of the retried attempt and
    // a screenshot of each failure land in test-results/, which CI uploads.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/fake-services.mjs",
      url: `${FAKE_SERVICES_ORIGIN}/__health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // node, not `pnpm start`: pnpm 12 leaves next-server orphaned on teardown
      // and Playwright then never exits.
      command: "pnpm build && node node_modules/next/dist/bin/next start",
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: WEB_SERVER_TIMEOUT_MS,
      // Merged over process.env. The two overrides are unconditional so E2E
      // can never reach real R2 or fimgs.net; the R2 credentials are
      // placeholders because the fake server does not check signatures.
      env: {
        R2_ENDPOINT: FAKE_SERVICES_ORIGIN,
        REFERENCE_PICTURE_BASE_URL: FAKE_SERVICES_ORIGIN,
        R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "e2e-placeholder",
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "e2e-placeholder",
        R2_SECRET_ACCESS_KEY:
          process.env.R2_SECRET_ACCESS_KEY || "e2e-placeholder",
        R2_BUCKET: process.env.R2_BUCKET || "e2e-placeholder",
        R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "https://r2.invalid",
      },
    },
  ],
});
