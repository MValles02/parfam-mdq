// Prints the environment for a CI job as KEY=VALUE lines, which ci.yml
// appends to $GITHUB_ENV after DATABASE_URL (later lines win).
// Usage: node scripts/ci-env.mjs <checks|e2e>
//
// Every value is a fixed throwaway placeholder, never a secret. src/lib/env.ts
// validates AUTH_SECRET and NEXT_PUBLIC_SITE_URL at import time (including
// `next build`), and next.config.ts derives the image host from R2_PUBLIC_URL.

const checks = {
  AUTH_SECRET: "e2e-only-auth-secret-not-for-production-use",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  R2_PUBLIC_URL: "https://r2.invalid",
};

// playwright.config.ts points R2 and reference pictures at a local fake
// server, so the R2 credentials only need to pass validation.
const e2e = {
  ...checks,
  AUTH_TRUST_HOST: "true",
  R2_ACCOUNT_ID: "e2e-placeholder",
  R2_ACCESS_KEY_ID: "e2e-placeholder",
  R2_SECRET_ACCESS_KEY: "e2e-placeholder",
  R2_BUCKET: "e2e-placeholder",
  ADMIN_SEED_EMAIL: "e2e-admin@example.test",
  ADMIN_SEED_PASSWORD: "e2e-throwaway-password",
};

const jobs = { checks, e2e };
const vars = jobs[process.argv[2]];
if (!vars) {
  console.error("Usage: node scripts/ci-env.mjs <checks|e2e>");
  process.exit(2);
}
for (const [key, value] of Object.entries(vars)) console.log(`${key}=${value}`);
