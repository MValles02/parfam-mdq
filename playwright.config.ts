import "dotenv/config";
import { randomInt } from "node:crypto";
import { defineConfig } from "@playwright/test";

// Checkout and login are rate-limited in memory per client IP, read from the
// cf-connecting-ip header. Without it every request shares one "unknown"
// bucket, so a random IP per run keeps specs from throttling each other.
const clientIp = Array.from({ length: 4 }, () => randomInt(1, 255)).join(".");

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.ts/,
  retries: process.env.CI ? 1 : 0,
  // html feeds the playwright-report/ artifact CI uploads on failure.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: { "cf-connecting-ip": clientIp },
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
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
