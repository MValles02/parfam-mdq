import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brandColors } from "@/lib/site";

/**
 * Brand favicon. It replaces the default Next scaffold .ico, which was 25 KB
 * and displayed the Next logo in the browser tab.
 *
 * It uses the same Outfit ExtraBold font as the OG images. The ParfamMdq logo
 * is typography, so the "P" comes from the font instead of a hand-written path.
 */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const outfitExtraBold = readFile(
  join(process.cwd(), "src/assets/fonts/Outfit-ExtraBold.ttf"),
);

export default async function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: brandColors.ink,
        color: brandColors.cream,
        fontFamily: "Outfit",
        fontSize: 48,
        letterSpacing: "-0.04em",
        paddingBottom: 4,
      }}
    >
      P
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Outfit",
          data: await outfitExtraBold,
          weight: 800,
          style: "normal",
        },
      ],
    },
  );
}
