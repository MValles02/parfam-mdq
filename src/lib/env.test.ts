import { afterEach, describe, expect, it, vi } from "vitest";

const R2_NAMES = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
];

function stubBaseEnv(nodeEnv: string, nextPhase = "") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("NEXT_PHASE", nextPhase);
  vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/db");
  vi.stubEnv("AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  for (const name of R2_NAMES) vi.stubEnv(name, "");
}

afterEach(() => vi.unstubAllEnvs());

describe("R2 env vars", () => {
  it("are required at production runtime", async () => {
    stubBaseEnv("production");
    await expect(import("./env")).rejects.toThrow();
  });

  it("stay optional during next build", async () => {
    stubBaseEnv("production", "phase-production-build");
    await expect(import("./env")).resolves.toBeDefined();
  });

  it("stay optional in test", async () => {
    stubBaseEnv("test");
    await expect(import("./env")).resolves.toBeDefined();
  });
});
