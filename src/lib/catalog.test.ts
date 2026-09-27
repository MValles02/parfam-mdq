import { describe, expect, it } from "vitest";
import { Prisma } from "../generated/prisma/client";
import { getStartingPrice } from "./catalog";

function variant(price: string, isActive: boolean) {
  return { priceArs: new Prisma.Decimal(price), isActive };
}

describe("getStartingPrice", () => {
  it("picks the lowest price among active variants", () => {
    const price = getStartingPrice([
      variant("50000", true),
      variant("30000", true),
      variant("40000", true),
    ]);
    expect(price).toBe("30000");
  });

  it("ignores inactive variants even when they are cheaper", () => {
    const price = getStartingPrice([
      variant("10000", false),
      variant("30000", true),
    ]);
    expect(price).toBe("30000");
  });

  it("returns null when there are no active variants", () => {
    expect(getStartingPrice([variant("10000", false)])).toBeNull();
    expect(getStartingPrice([])).toBeNull();
  });
});
