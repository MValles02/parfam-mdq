import { describe, expect, it, vi } from "vitest";

// `references.ts` imports the generated Prisma client (for `Prisma.sql`) and
// the `@/lib/db` singleton, which reads `env` at module load time. Stubbing
// both keeps this a pure unit test of `toPercentages` without a configured
// DATABASE_URL or a generated client available to the test runner.
vi.mock("@/generated/prisma/client", () => ({ Prisma: {} }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/catalog", () => ({
  formatProperName: (name: string) => name,
  escapeLikePattern: (term: string) => `%${term}%`,
}));

import { toPercentages } from "./references";

describe("toPercentages", () => {
  it("returns all nulls when every vote count is null", () => {
    expect(toPercentages([null, null, null, null])).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("returns all nulls when the group total is zero", () => {
    expect(toPercentages([0, 0, null, 0])).toEqual([null, null, null, null]);
  });

  it("rounds to integers that sum to exactly 100", () => {
    // 1/3 each rounds to 33.33..., which would total 99 without the
    // largest-remainder correction.
    const result = toPercentages([1, 1, 1]);
    expect(result.reduce((sum: number, v) => sum + (v ?? 0), 0)).toBe(100);
    expect(result.every((v) => Number.isInteger(v))).toBe(true);
  });

  it("treats a null entry within a voted group as zero", () => {
    expect(toPercentages([10, null, 30, 60])).toEqual([10, 0, 30, 60]);
  });

  it("splits an even two-way group down the middle", () => {
    expect(toPercentages([5, 5])).toEqual([50, 50]);
  });
});
