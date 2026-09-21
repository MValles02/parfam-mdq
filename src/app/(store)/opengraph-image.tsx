import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteDefaults } from "@/lib/site";

/**
 * Preview image for every shared store link.
 *
 * It intentionally contains only the logo. WhatsApp is the sales channel, and
 * it does not show the 1200x630 image in chat: it embeds a compressed ~200 px
 * thumbnail cropped to the central square. The server cannot increase that
 * resolution. Fine information such as brand, concentration, and price became
 * illegible, so the image displays one large, sharp element instead.
 *
 * Both dimensions account for that crop:
 *   - The logo fits in the central 630 px band (112 px type measures ~590 px).
 *     A larger size would cut off the P and q.
 *   - Nothing is smaller than 36 px, which remains readable at ~11 px after a
 *     threefold reduction.
 *
 * Other segments re-export it from their one-line `opengraph-image.tsx` files:
 * Next's file convention does not inherit into nested routes; it only applies
 * to the segment containing the file.
 */
export const alt = siteDefaults.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The font does not depend on the request, so read it once at module scope.
const outfitExtraBold = readFile(
  join(process.cwd(), "src/assets/fonts/Outfit-ExtraBold.ttf"),
);

export default async function Image() {
  const fontData = await outfitExtraBold;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F2EEE9",
        color: "#000000",
        fontFamily: "Outfit",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 112,
          fontWeight: 800,
          letterSpacing: "-0.045em",
          lineHeight: 0.9,
        }}
      >
        {siteDefaults.name}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "0.45em",
          marginTop: 30,
          paddingLeft: "0.45em",
        }}
      >
        PERFUMERÍA
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Outfit", data: fontData, weight: 800, style: "normal" }],
    },
  );
}
