import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: {} }));

import { createProductStorageKey, isProductStorageKey } from "./r2";

describe("product image storage keys", () => {
  it("accepts current product keys and rejects old or unsafe paths", () => {
    expect(isProductStorageKey("products/2026/09/image.jpg")).toBe(true);
    expect(isProductStorageKey("productos/2026/09/image.jpg")).toBe(false);
    expect(isProductStorageKey("products/../private/image.jpg")).toBe(false);
  });
});

describe("createProductStorageKey", () => {
  it("builds a key that satisfies isProductStorageKey and keeps the given extension", () => {
    const key = createProductStorageKey("jpg");
    expect(isProductStorageKey(key)).toBe(true);
    expect(key.endsWith(".jpg")).toBe(true);
  });

  it("generates distinct keys on each call", () => {
    expect(createProductStorageKey("png")).not.toBe(
      createProductStorageKey("png"),
    );
  });
});
