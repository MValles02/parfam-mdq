import { describe, expect, it, vi } from "vitest";

// Dummy but well-formed values: enough for `getCredentials()` to pass and for
// `getSignedUrl` to presign locally, no network call involved.
vi.mock("@/lib/env", () => ({
  env: {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "test-access-key-id",
    R2_SECRET_ACCESS_KEY: "test-secret-access-key",
    R2_BUCKET: "test-bucket",
    R2_PUBLIC_URL: "https://cdn.example.com",
  },
}));

import {
  createProductStorageKey,
  getUploadUrl,
  isProductStorageKey,
} from "./r2";

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

describe("getUploadUrl", () => {
  it("binds content-length and content-type into the SigV4 signature", async () => {
    const url = await getUploadUrl({
      key: "products/2026/09/test.jpg",
      contentType: "image/jpeg",
      sizeBytes: 12345,
    });

    // A URL that doesn't sign these headers would let the browser PUT any
    // body size or type once it has the link, which is the bug this closes.
    const signedHeaders = new URL(url).searchParams.get("X-Amz-SignedHeaders");
    expect(signedHeaders).toContain("content-length");
    expect(signedHeaders).toContain("content-type");
  });
});
