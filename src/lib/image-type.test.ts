import { describe, expect, it } from "vitest";
import { detectImageContentType } from "./image-type";

/** Pads a magic-number prefix with filler bytes so length checks pass without
 * asserting on unrelated payload content. */
function withFiller(prefix: number[], totalLength: number): Uint8Array {
  const bytes = new Uint8Array(totalLength);
  bytes.set(prefix);
  return bytes;
}

describe("detectImageContentType", () => {
  it("recognizes a JPEG SOI marker", () => {
    expect(
      detectImageContentType(withFiller([0xff, 0xd8, 0xff, 0xe0], 16)),
    ).toBe("image/jpeg");
  });

  it("recognizes the PNG signature", () => {
    expect(
      detectImageContentType(
        withFiller([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 16),
      ),
    ).toBe("image/png");
  });

  it("recognizes a WebP RIFF container", () => {
    const bytes = withFiller(
      [
        0x52,
        0x49,
        0x46,
        0x46, // "RIFF"
        0x00,
        0x00,
        0x00,
        0x00, // chunk size, irrelevant to detection
        0x57,
        0x45,
        0x42,
        0x50, // "WEBP"
      ],
      16,
    );
    expect(detectImageContentType(bytes)).toBe("image/webp");
  });

  it("recognizes an AVIF ftyp box with the avif brand", () => {
    const bytes = withFiller(
      [
        0x00,
        0x00,
        0x00,
        0x1c, // box size, irrelevant to detection
        0x66,
        0x74,
        0x79,
        0x70, // "ftyp"
        0x61,
        0x76,
        0x69,
        0x66, // "avif"
      ],
      16,
    );
    expect(detectImageContentType(bytes)).toBe("image/avif");
  });

  it("recognizes an AVIF ftyp box with the avis (sequence) brand", () => {
    const bytes = withFiller(
      [
        0x00,
        0x00,
        0x00,
        0x1c,
        0x66,
        0x74,
        0x79,
        0x70, // "ftyp"
        0x61,
        0x76,
        0x69,
        0x73, // "avis"
      ],
      16,
    );
    expect(detectImageContentType(bytes)).toBe("image/avif");
  });

  it("recognizes an AVIF ftyp box via a mif1 major brand with avif among the compatible brands", () => {
    const bytes = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x18, // box size = 24, covers the whole box below
      0x66,
      0x74,
      0x79,
      0x70, // "ftyp"
      0x6d,
      0x69,
      0x66,
      0x31, // major brand "mif1"
      0x00,
      0x00,
      0x00,
      0x00, // minor version
      0x6d,
      0x69,
      0x66,
      0x31, // compatible brand "mif1"
      0x61,
      0x76,
      0x69,
      0x66, // compatible brand "avif"
    ]);
    expect(detectImageContentType(bytes)).toBe("image/avif");
  });

  it("recognizes an AVIF ftyp box via a msf1 major brand with avis among the compatible brands", () => {
    const bytes = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x18, // box size = 24
      0x66,
      0x74,
      0x79,
      0x70, // "ftyp"
      0x6d,
      0x73,
      0x66,
      0x31, // major brand "msf1"
      0x00,
      0x00,
      0x00,
      0x00, // minor version
      0x68,
      0x65,
      0x69,
      0x63, // compatible brand "heic" (decoy)
      0x61,
      0x76,
      0x69,
      0x73, // compatible brand "avis"
    ]);
    expect(detectImageContentType(bytes)).toBe("image/avif");
  });

  it("ignores an avif compatible brand that falls outside the box's declared size", () => {
    const bytes = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x14, // box size = 20: the box ends right after the "heic" entry
      0x66,
      0x74,
      0x79,
      0x70, // "ftyp"
      0x6d,
      0x69,
      0x66,
      0x31, // major brand "mif1"
      0x00,
      0x00,
      0x00,
      0x00, // minor version
      0x68,
      0x65,
      0x69,
      0x63, // compatible brand "heic", inside the box (offset 16..19)
      0x61,
      0x76,
      0x69,
      0x66, // "avif" bytes past the declared box size; must not count
    ]);
    expect(detectImageContentType(bytes)).toBeNull();
  });

  it("ignores an avif compatible brand that a declared box size claims but the buffer never provides", () => {
    const bytes = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x28, // box size = 40, larger than this 20-byte buffer
      0x66,
      0x74,
      0x79,
      0x70, // "ftyp"
      0x6d,
      0x69,
      0x66,
      0x31, // major brand "mif1"
      0x00,
      0x00,
      0x00,
      0x00, // minor version
      0x68,
      0x65,
      0x69,
      0x63, // compatible brand "heic", no "avif"/"avis" present anywhere
    ]);
    expect(detectImageContentType(bytes)).toBeNull();
  });

  it("rejects garbage bytes that match no known format", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(detectImageContentType(bytes)).toBeNull();
  });

  it("rejects input too short to hold any recognizable header", () => {
    expect(detectImageContentType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectImageContentType(new Uint8Array([]))).toBeNull();
  });
});
