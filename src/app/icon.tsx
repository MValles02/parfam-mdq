import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Favicon de la marca. Reemplaza el .ico por defecto del scaffold de Next
 * (que ademas pesaba 25 KB y mostraba el logo de Next en la pestania).
 *
 * Se genera con la misma Outfit ExtraBold de las OG images: el logotipo de
 * ParfamMdq es tipografia, no un dibujo, asi que la "P" sale de la fuente y
 * no de un path a mano.
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
        background: "#14120F",
        color: "#F2EEE9",
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
