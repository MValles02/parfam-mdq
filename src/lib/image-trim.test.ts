import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { trimWhiteMargins } from "./image-trim";

const CANVAS_WIDTH = 375;
const CANVAS_HEIGHT = 500;

/**
 * Builds a synthetic reference photo: a white canvas the size of
 * Fragrantica's actual reference photos with a dark rectangle in the middle,
 * standing in for the bottle. Encoded as JPEG, matching what
 * `fetchAndValidateReferencePicture` (see
 * `src/app/admin/(panel)/productos/image-actions.ts`) actually downloads.
 */
async function buildBottlePhoto(): Promise<Buffer> {
  const rectWidth = 100;
  const rectHeight = 200;
  const left = Math.round((CANVAS_WIDTH - rectWidth) / 2);
  const top = Math.round((CANVAS_HEIGHT - rectHeight) / 2);

  const rectangle = await sharp({
    create: {
      width: rectWidth,
      height: rectHeight,
      channels: 3,
      background: { r: 20, g: 20, b: 20 },
    },
  })
    .jpeg()
    .toBuffer();

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: rectangle, left, top }])
    .jpeg()
    .toBuffer();
}

async function buildAllWhitePhoto(): Promise<Buffer> {
  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe("trimWhiteMargins", () => {
  it("crops a bottle photo's white margins and keeps the subject visible", async () => {
    const input = await buildBottlePhoto();
    const result = await trimWhiteMargins(new Uint8Array(input));

    expect(result.trimmed).toBe(true);
    expect(result.contentType).toBe("image/jpeg");
    expect(result.bytes.length).toBeLessThan(input.byteLength);

    const outputMetadata = await sharp(Buffer.from(result.bytes)).metadata();
    const outputWidth = outputMetadata.width ?? 0;
    const outputHeight = outputMetadata.height ?? 0;

    // The output is smaller than the original canvas (margins were trimmed)...
    expect(outputWidth).toBeLessThan(CANVAS_WIDTH);
    expect(outputHeight).toBeLessThan(CANVAS_HEIGHT);
    // ...but still large enough to hold the 100x200 rectangle plus its padding.
    expect(outputWidth).toBeGreaterThanOrEqual(100);
    expect(outputHeight).toBeGreaterThanOrEqual(200);
  });

  it("returns the original bytes for an all-white image", async () => {
    const input = await buildAllWhitePhoto();
    const result = await trimWhiteMargins(new Uint8Array(input));

    expect(result.trimmed).toBe(false);
    expect(result.contentType).toBe("image/jpeg");
    expect(Buffer.from(result.bytes)).toEqual(input);
  });

  it("returns the original bytes without throwing for invalid input", async () => {
    const input = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    const result = await trimWhiteMargins(input);

    expect(result.trimmed).toBe(false);
    expect(result.bytes).toBe(input);
  });
});
