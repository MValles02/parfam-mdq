import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteDefaults } from "@/lib/site";

/**
 * OG por defecto del sitio: el logotipo reconstruido en tipografia (no hay
 * SVG del logo, ver PLAN.md § "Identidad visual"), centrado, con mucho aire
 * como en el hero de `design/Main.dc.html`.
 *
 * El cuerpo de 132 desbordaba el recorte cuadrado que hace WhatsApp sobre el
 * centro de la imagen: "ParfamMdq" se leia "ParfamMdo", sin la P ni la q.
 * Con 100 el logotipo entra en la banda central de ~630px y sigue viendose
 * igual de grande en los clientes que muestran la imagen 1200x630 completa.
 */
export const alt = `${siteDefaults.name} — ${siteDefaults.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// La fuente no depende del request: se lee una sola vez a nivel de modulo.
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
          fontSize: 100,
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
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "0.62em",
          marginTop: 28,
          paddingLeft: "0.62em",
          color: "#000000",
        }}
      >
        PERFUMERIA
      </div>
      <div
        style={{
          display: "flex",
          width: 64,
          height: 1,
          background: "#000000",
          margin: "48px 0",
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontStyle: "italic",
          fontWeight: 400,
          color: "#3A342C",
        }}
      >
        &ldquo;{siteDefaults.tagline}&rdquo;
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Outfit", data: fontData, weight: 800, style: "normal" }],
    },
  );
}
